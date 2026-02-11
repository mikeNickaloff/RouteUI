import { asLines, buildCidr, cidrToNetwork, normalizeCidr, normalizePorts, parseCidr, sanitizeChainName, uniqueSorted } from "./utils.js";
import { findInterface, findNode } from "./model.js";
import { ensureNodeConfig } from "./host-config.js";

function sortedLinks(state) {
  return [...state.links].sort((a, b) => a.id.localeCompare(b.id));
}

function dedupePreserveOrder(commands) {
  const seen = new Set();
  const result = [];
  for (const command of commands) {
    if (seen.has(command)) {
      continue;
    }
    seen.add(command);
    result.push(command);
  }
  return result;
}

function endpointCidr(state, nodeId, interfaceId) {
  const iface = findInterface(state, nodeId, interfaceId);
  return normalizeCidr(iface?.cidr || "");
}

function buildFirewall(state, node) {
  ensureNodeConfig(node);
  const defaults = node.defaults || { inbound: "deny", outbound: "allow", routed: "deny" };
  const commands = [
    `# Firewall setup for ${node.name}`,
    "ufw --force reset",
    `ufw default ${defaults.inbound} incoming`,
    `ufw default ${defaults.outbound} outgoing`,
    `ufw default ${defaults.routed} routed`,
    "ufw allow in on lo",
  ];

  const buildAddressClause = (keyword, address, port) => {
    const normalizedAddress = (address || "").trim() || "any";
    const portClause = port ? ` port ${port}` : "";
    return ` ${keyword} ${normalizedAddress}${portClause}`;
  };

  const legacyRules = [];
  for (const iface of [...node.interfaces].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const rule of iface.firewallRules || []) {
      legacyRules.push({ ...rule, _legacyInterfaceId: iface.id });
    }
  }
  const activeRules = (node.firewallRules || []).length ? (node.firewallRules || []) : legacyRules;

  for (const rule of [...activeRules].sort((a, b) => a.id.localeCompare(b.id))) {
    const protoClause = rule.protocol && rule.protocol !== "any" ? ` proto ${rule.protocol}` : "";
    const supportsPorts = rule.protocol === "tcp" || rule.protocol === "udp";
    const fromClause = buildAddressClause("from", rule.fromAddress, supportsPorts ? rule.fromPort : "");
    const toClause = buildAddressClause("to", rule.toAddress, supportsPorts ? (rule.toPort || rule.port) : "");
    const commentClause = rule.description ? ` comment "${rule.description.replace(/"/g, "'")}"` : "";

    if (rule.type === "inbound" || rule.type === "outbound") {
      const direction = rule.type === "inbound" ? "in" : "out";
      const selectedInterface = findInterface(state, node.id, rule.interfaceId || rule._legacyInterfaceId || "");
      const onClause = selectedInterface?.name ? ` on ${selectedInterface.name}` : "";
      const command = `ufw ${rule.action} ${direction}${onClause}${protoClause}${fromClause}${toClause}${commentClause}`
        .replace(/\s+/g, " ")
        .trim();
      commands.push(command);
    } else if (rule.type === "forward" || rule.type === "routed") {
      const inInterface = findInterface(state, node.id, rule.inInterfaceId || rule._legacyInterfaceId || "");
      const outInterface = findInterface(state, node.id, rule.outInterfaceId || "");
      const inClause = inInterface?.name ? ` in on ${inInterface.name}` : "";
      const outClause = outInterface?.name ? ` out on ${outInterface.name}` : "";
      const command = `ufw route ${rule.action}${inClause}${outClause}${protoClause}${fromClause}${toClause}${commentClause}`
        .replace(/\s+/g, " ")
        .trim();
      commands.push(command);
    }
    commands.push(`# Rule ${sanitizeChainName(rule.id)} type=${rule.type}`);
  }

  return asLines(commands);
}

function buildRouting(state, node) {
  ensureNodeConfig(node);
  const commands = [`# Routing setup for ${node.name}`];

  const shouldEnableForwarding = node.interfaces.some((iface) => iface.forwarding) ||
    state.links.some((link) => link.srcNodeId === node.id || link.dstNodeId === node.id);

  if (shouldEnableForwarding) {
    commands.push("sysctl -w net.ipv4.ip_forward=1");
  }

  for (const iface of [...node.interfaces].sort((a, b) => a.name.localeCompare(b.name))) {
    if (iface.addressMode === "dhcp") {
      commands.push(`# DHCP on ${iface.name}`);
      commands.push(`dhclient ${iface.name}`);
      continue;
    }

    const normalizedAddress = normalizeCidr(iface.cidr || buildCidr(iface.ip, iface.netmask));
    if (normalizedAddress && iface.kind !== "loopback") {
      commands.push(`ip address add ${normalizedAddress} dev ${iface.name}`);
      if (iface.broadcast) {
        commands.push(`ip address change ${normalizedAddress} brd ${iface.broadcast} dev ${iface.name}`);
      }
      commands.push(`ip link set ${iface.name} up`);
      if (iface.gateway) {
        commands.push(`ip route replace default via ${iface.gateway} dev ${iface.name}`);
      }
      if (iface.state === "down") {
        commands.push(`ip link set ${iface.name} down`);
      }
    }
  }

  const outgoingLinks = sortedLinks(state).filter((link) => link.srcNodeId === node.id);
  for (const link of outgoingLinks) {
    const srcIface = findInterface(state, node.id, link.srcInterfaceId);
    const dstCidr = endpointCidr(state, link.dstNodeId, link.dstInterfaceId);
    const canRouteForLink = link.srcNodeId !== link.dstNodeId && link.linkType !== "firewall-boundary";

    if (srcIface && dstCidr && canRouteForLink) {
      commands.push(`ip route replace ${cidrToNetwork(dstCidr)} dev ${srcIface.name}`);
    }

    if (link.policyTable && canRouteForLink) {
      const table = link.policyTable;
      const dstIp = parseCidr(dstCidr).ip || "0.0.0.0";
      commands.push(`ip rule add to ${dstIp}/32 table ${table}`);
      commands.push(`ip route replace default dev ${srcIface?.name || "eth0"} table ${table}`);
    }

    if (link.natMode === "snat") {
      const srcIp = parseCidr(srcIface?.cidr || "").ip || "<SNAT_SOURCE_IP>";
      commands.push(`iptables -t nat -A POSTROUTING -o ${srcIface?.name || "eth0"} -j SNAT --to-source ${srcIp}`);
    }

    if (link.natMode === "masquerade") {
      commands.push(`iptables -t nat -A POSTROUTING -o ${srcIface?.name || "eth0"} -j MASQUERADE`);
    }
  }

  const inboundLinks = sortedLinks(state).filter((link) => link.dstNodeId === node.id && link.natMode === "dnat");
  for (const link of inboundLinks) {
    const dstIface = findInterface(state, node.id, link.dstInterfaceId);
    const dstIp = parseCidr(dstIface?.cidr || "").ip || "<DNAT_DEST_IP>";
    const ports = normalizePorts(link.ports);
    const portClause = ports ? ` --dport ${ports}` : "";
    commands.push(
      (`iptables -t nat -A PREROUTING -i ${dstIface?.name || "eth0"} -p ${link.protocol || "tcp"}${portClause} -j DNAT --to-destination ${dstIp}`).replace(/\s+/g, " "),
    );
  }

  return asLines(dedupePreserveOrder(commands));
}

function buildWireGuard(state, node) {
  ensureNodeConfig(node);
  const commands = [`# WireGuard setup for ${node.name}`];
  const wgIfaces = node.interfaces.filter((iface) => iface.kind === "wireguard").sort((a, b) => a.name.localeCompare(b.name));

  for (const iface of wgIfaces) {
    commands.push(`# Create ${iface.name} from scratch`);
    commands.push(`ip link add dev ${iface.name} type wireguard`);
    const normalizedAddress = normalizeCidr(iface.cidr || buildCidr(iface.ip, iface.netmask));
    if (normalizedAddress) {
      commands.push(`ip address add ${normalizedAddress} dev ${iface.name}`);
    }
    if (iface.listenPort) {
      commands.push(`wg set ${iface.name} listen-port ${iface.listenPort}`);
    }
    commands.push(`wg set ${iface.name} private-key /etc/wireguard/${iface.name}.key`);
    commands.push(`wg show ${iface.name}`);
    commands.push(`ip link set up dev ${iface.name}`);
  }

  const wgLinks = sortedLinks(state).filter((link) => link.linkType === "wireguard" && (link.srcNodeId === node.id || link.dstNodeId === node.id));

  for (const link of wgLinks) {
    const localIsSrc = link.srcNodeId === node.id;
    const localNodeId = localIsSrc ? link.srcNodeId : link.dstNodeId;
    const peerNodeId = localIsSrc ? link.dstNodeId : link.srcNodeId;
    const localIfaceId = localIsSrc ? link.srcInterfaceId : link.dstInterfaceId;
    const peerIfaceId = localIsSrc ? link.dstInterfaceId : link.srcInterfaceId;

    const localIface = findInterface(state, localNodeId, localIfaceId);
    const peerIface = findInterface(state, peerNodeId, peerIfaceId);
    const peerNode = findNode(state, peerNodeId);

    if (!localIface || !peerIface || !peerNode) {
      continue;
    }

    const peerIps = [peerIface.allowedIps, peerIface.cidr].filter(Boolean).join(",");
    commands.push(
      `wg set ${localIface.name} peer <${peerNode.name.toUpperCase().replace(/\W+/g, "_")}_PUBKEY> allowed-ips ${peerIps || "0.0.0.0/0"}`,
    );
  }

  return asLines(uniqueSorted(commands));
}

export function generateNodeSetup(state, nodeId) {
  const node = findNode(state, nodeId);
  if (!node) {
    return {
      firewall: "# Node not found.",
      routing: "# Node not found.",
      wireguard: "# Node not found.",
    };
  }

  return {
    firewall: buildFirewall(state, node),
    routing: buildRouting(state, node),
    wireguard: buildWireGuard(state, node),
  };
}
