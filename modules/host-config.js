import { buildCidr, normalizeCidr, parseCidr, prefixToDottedMask } from "./utils.js";
import { findInterface, findNode } from "./model.js";

function nextId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function fallbackHostDefaults() {
  return {
    inbound: "deny",
    outbound: "allow",
    routed: "deny",
  };
}

function ensureFirewallRuleConfig(rule) {
  rule.type = rule.type || "inbound";
  rule.action = rule.action || "allow";
  rule.protocol = rule.protocol || "tcp";
  rule.interfaceId = rule.interfaceId || "";
  rule.inInterfaceId = rule.inInterfaceId || "";
  rule.outInterfaceId = rule.outInterfaceId || "";
  rule.fromAddress = (rule.fromAddress || "").trim();
  rule.toAddress = (rule.toAddress || "").trim();
  rule.fromPort = (rule.fromPort || "").trim();
  rule.toPort = (rule.toPort || rule.port || "").trim();
  rule.port = rule.toPort;
  rule.peerNodeId = rule.peerNodeId || "";
  rule.peerInterfaceId = rule.peerInterfaceId || "";
  rule.description = rule.description || "";
  return rule;
}

export function ensureInterfaceConfig(iface) {
  const parsed = parseCidr(iface.cidr || "");
  const cidrLike = normalizeCidr(iface.cidr || "");
  const ipFromCidr = parsed.ip || (cidrLike.includes("/") ? cidrLike.split("/")[0] : cidrLike);

  iface.addressMode = iface.addressMode || "static";
  iface.ip = (iface.ip || ipFromCidr || "").trim();
  iface.netmask = (iface.netmask || (parsed.mask ? prefixToDottedMask(parsed.mask) : "")).trim();
  iface.broadcast = (iface.broadcast || "").trim();
  iface.gateway = (iface.gateway || "").trim();
  iface.state = iface.state || "up";
  iface.virtualMode = iface.virtualMode || "vlan";
  iface.bridgedInterfaces = iface.bridgedInterfaces || "";
  iface.firewallRules = Array.isArray(iface.firewallRules) ? iface.firewallRules : [];
  iface.firewallRules.forEach((rule) => ensureFirewallRuleConfig(rule));

  if (iface.addressMode === "dhcp") {
    iface.cidr = "";
  } else {
    iface.cidr = buildCidr(iface.ip, iface.netmask);
  }

  return iface;
}

export function ensureNodeConfig(node) {
  node.firewallRules = Array.isArray(node.firewallRules) ? node.firewallRules : [];
  node.defaults = {
    ...fallbackHostDefaults(),
    ...(node.defaults || {}),
  };
  node.children = (Array.isArray(node.children) ? node.children : []).map((child) => ({
    id: child.id || nextId("child"),
    nodeId: child.nodeId || "",
    name: child.name || "",
    kind: child.kind || "container",
    bindInterfaceId: child.bindInterfaceId || "",
  }));
  node.interfaces = Array.isArray(node.interfaces) ? node.interfaces : [];
  node.interfaces.forEach((iface) => ensureInterfaceConfig(iface));

  // Backward-compat migration: move legacy per-interface rules to machine-wide rules once.
  if (!node.firewallRules.length) {
    const migratedRules = [];
    for (const iface of node.interfaces) {
      for (const legacyRule of iface.firewallRules || []) {
        const migrated = ensureFirewallRuleConfig({ ...legacyRule });
        if ((migrated.type === "inbound" || migrated.type === "outbound") && !migrated.interfaceId) {
          migrated.interfaceId = iface.id;
        }
        if ((migrated.type === "forward" || migrated.type === "routed") && !migrated.inInterfaceId) {
          migrated.inInterfaceId = iface.id;
        }
        migratedRules.push(migrated);
      }
      iface.firewallRules = [];
    }
    node.firewallRules = migratedRules;
  }

  node.firewallRules.forEach((rule) => ensureFirewallRuleConfig(rule));
  return node;
}

export function ensureStateConfig(state) {
  state.nodes = Array.isArray(state.nodes) ? state.nodes : [];
  state.links = Array.isArray(state.links) ? state.links : [];
  state.nodes.forEach((node) => ensureNodeConfig(node));
  return state;
}

export function createHostInterface() {
  const iface = {
    id: nextId("iface"),
    name: "",
    kind: "physical",
    addressMode: "static",
    ip: "",
    netmask: "255.255.255.0",
    broadcast: "",
    gateway: "",
    state: "up",
    virtualMode: "vlan",
    bridgedInterfaces: "",
    cidr: "",
    direction: "bidirectional",
    forwarding: false,
    natAllowed: false,
    allowedIps: "",
    listenPort: "",
    firewallRules: [],
  };
  return ensureInterfaceConfig(iface);
}

export function createFirewallRule() {
  return ensureFirewallRuleConfig({
    id: nextId("rule"),
    type: "inbound",
    action: "allow",
    protocol: "tcp",
    interfaceId: "",
    inInterfaceId: "",
    outInterfaceId: "",
    fromAddress: "",
    toAddress: "",
    fromPort: "",
    toPort: "",
    port: "",
    peerNodeId: "",
    peerInterfaceId: "",
    description: "",
  });
}

export function createChildWorkload() {
  return {
    id: nextId("child"),
    nodeId: "",
    name: "",
    kind: "container",
    bindInterfaceId: "",
  };
}

export function createChildInterface() {
  const iface = {
    id: nextId("iface"),
    name: "",
    kind: "virtual",
    addressMode: "static",
    ip: "",
    netmask: "255.255.255.0",
    broadcast: "",
    gateway: "",
    state: "up",
    virtualMode: "nat",
    bridgedInterfaces: "",
    cidr: "",
    direction: "bidirectional",
    forwarding: false,
    natAllowed: false,
    allowedIps: "",
    listenPort: "",
    firewallRules: [],
  };
  return ensureInterfaceConfig(iface);
}

export function interfaceDisplayAddress(iface) {
  if (iface.addressMode === "dhcp") {
    return "dhcp";
  }
  return iface.cidr || iface.ip || "unassigned";
}

function findParentChildRelationInternal(state, nodeId) {
  for (const parent of state.nodes || []) {
    for (const child of parent.children || []) {
      if (child.nodeId === nodeId) {
        return { parent, child };
      }
    }
  }
  return null;
}

function resolveSourceContext(state, srcNodeId, srcInterfaceId) {
  const relation = findParentChildRelationInternal(state, srcNodeId);
  if (!relation || !relation.child.bindInterfaceId) {
    return { nodeId: srcNodeId, interfaceId: srcInterfaceId };
  }
  return {
    nodeId: relation.parent.id,
    interfaceId: relation.child.bindInterfaceId,
  };
}

export function getTransitiveReachableEndpoints(state, srcNodeId, srcInterfaceId) {
  const source = resolveSourceContext(state, srcNodeId, srcInterfaceId);
  const sourceIface = findInterface(state, source.nodeId, source.interfaceId);
  if (!sourceIface) {
    return [];
  }

  const keyFor = (nodeId, interfaceId) => `${nodeId}|${interfaceId}`;
  const parseKey = (value) => {
    const [nodeId, interfaceId] = value.split("|");
    return { nodeId, interfaceId };
  };

  const startKey = keyFor(source.nodeId, source.interfaceId);
  const queue = [startKey];
  const visited = new Set([startKey]);

  while (queue.length) {
    const key = queue.shift();
    const { nodeId, interfaceId } = parseKey(key);
    const node = findNode(state, nodeId);
    const iface = findInterface(state, nodeId, interfaceId);
    if (!node || !iface) {
      continue;
    }

    // Allow inter-interface forwarding hops only when the node config indicates forwarding.
    const canSwitchInterfaces = Boolean(iface.forwarding) || node.interfaces.some((candidate) => candidate.forwarding);
    if (canSwitchInterfaces) {
      for (const sibling of node.interfaces) {
        const siblingKey = keyFor(node.id, sibling.id);
        if (!visited.has(siblingKey)) {
          visited.add(siblingKey);
          queue.push(siblingKey);
        }
      }
    }

    for (const link of state.links) {
      if (link.srcNodeId !== nodeId || link.srcInterfaceId !== interfaceId) {
        continue;
      }
      const nextKey = keyFor(link.dstNodeId, link.dstInterfaceId);
      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push(nextKey);
      }
    }
  }

  const endpoints = [];
  for (const key of visited) {
    if (key === startKey) {
      continue;
    }
    const { nodeId, interfaceId } = parseKey(key);
    const node = findNode(state, nodeId);
    const iface = findInterface(state, nodeId, interfaceId);
    if (!node || !iface) {
      continue;
    }
    endpoints.push({
      nodeId: node.id,
      interfaceId: iface.id,
      label: `${node.name} :: ${iface.name}`,
      ip: iface.ip || parseCidr(iface.cidr || "").ip || "",
    });
  }

  return endpoints.sort((a, b) => a.label.localeCompare(b.label));
}

export function getOpenPortsForDestination(state, dstNodeId, dstInterfaceId, protocol) {
  const iface = findInterface(state, dstNodeId, dstInterfaceId);
  const node = findNode(state, dstNodeId);
  const ports = new Set();

  if (!iface || !node) {
    return [];
  }

  const firewallRules = (node.firewallRules || []).length
    ? (node.firewallRules || [])
    : (iface.firewallRules || []);

  for (const rule of firewallRules) {
    const protocolMatch = rule.protocol === "any" || rule.protocol === protocol;
    const typeMatch = ["inbound", "routed", "forward"].includes(rule.type);
    const interfaceMatch = !rule.interfaceId ||
      rule.interfaceId === dstInterfaceId ||
      rule.inInterfaceId === dstInterfaceId ||
      rule.outInterfaceId === dstInterfaceId;
    const destinationPort = rule.toPort || rule.port;
    if (rule.action === "allow" && protocolMatch && typeMatch && interfaceMatch && destinationPort) {
      ports.add(destinationPort);
    }
  }

  for (const link of state.links) {
    if (link.dstNodeId === dstNodeId && link.dstInterfaceId === dstInterfaceId && link.protocol === protocol && link.ports) {
      ports.add(link.ports);
    }
  }

  return Array.from(ports).sort((a, b) => a.localeCompare(b));
}

export function hasAnyRoutedPath(state, srcNodeId, srcInterfaceId) {
  return getTransitiveReachableEndpoints(state, srcNodeId, srcInterfaceId).length > 0;
}

export function resolvePeerIp(state, nodeId, interfaceId) {
  const iface = findInterface(state, nodeId, interfaceId);
  if (!iface) {
    return "";
  }
  return iface.ip || parseCidr(iface.cidr || "").ip || "";
}

export function findChild(node, childId) {
  return (node.children || []).find((child) => child.id === childId) || null;
}

export function findRule(container, ruleId) {
  return (container?.firewallRules || []).find((rule) => rule.id === ruleId) || null;
}

export function findIfaceOnNode(node, ifaceId) {
  return (node.interfaces || []).find((iface) => iface.id === ifaceId) || null;
}

export function hostSupportsChildren(node) {
  return node.type !== "Internet";
}

export function findParentChildRelation(state, nodeId) {
  return findParentChildRelationInternal(state, nodeId);
}

export function childVisibleEndpoints(state, node, child) {
  if (!child || !child.bindInterfaceId) {
    return [];
  }
  return getTransitiveReachableEndpoints(state, node.id, child.bindInterfaceId);
}

export function peerEndpointLabel(state, nodeId, interfaceId) {
  const node = findNode(state, nodeId);
  const iface = findInterface(state, nodeId, interfaceId);
  if (!node || !iface) {
    return "Any";
  }
  return `${node.name} :: ${iface.name}`;
}
