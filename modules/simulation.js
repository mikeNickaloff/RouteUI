import { endpointLabel, findInterface, findNode } from "./model.js";

function normalizeAddress(value) {
  return String(value || "").trim();
}

function parseIpv4(value) {
  const parts = String(value || "").trim().split(".");
  if (parts.length !== 4) {
    return null;
  }
  const octets = parts.map((part) => Number(part));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function cidrContains(ip, cidr) {
  const [networkAddress, prefixText] = String(cidr || "").split("/");
  const ipInt = parseIpv4(ip);
  const networkInt = parseIpv4(networkAddress);
  const prefix = Number(prefixText);
  if (ipInt === null || networkInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  if (prefix === 0) {
    return true;
  }
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function addressMatches(ruleAddress, packetAddress) {
  const ruleValue = normalizeAddress(ruleAddress).toLowerCase();
  const packetValue = normalizeAddress(packetAddress);
  if (!ruleValue || ruleValue === "any") {
    return true;
  }
  if (!packetValue) {
    return false;
  }
  if (ruleValue.includes("/")) {
    return cidrContains(packetValue, ruleValue);
  }
  return packetValue === ruleValue || packetValue === normalizeAddress(ruleAddress);
}

function portMatches(rulePort, packetPort) {
  const ruleValue = String(rulePort || "").trim();
  const packetValue = String(packetPort || "").trim();
  if (!ruleValue) {
    return true;
  }
  if (!packetValue) {
    return false;
  }

  if (ruleValue.includes(":")) {
    const [start, end] = ruleValue.split(":").map((value) => Number(value.trim()));
    const portNum = Number(packetValue);
    if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(portNum)) {
      return portNum >= start && portNum <= end;
    }
  }

  if (ruleValue.includes(",")) {
    return ruleValue.split(",").map((value) => value.trim()).includes(packetValue);
  }

  return ruleValue === packetValue;
}

function linkMatchesTraffic(link, protocol, port) {
  if (link.protocol !== "any" && link.protocol !== protocol) {
    return false;
  }
  if (!port || !link.ports) {
    return true;
  }
  return portMatches(link.ports, port);
}

function bfsPath(state, srcNodeId, dstNodeId, protocol, port) {
  const queue = [[srcNodeId]];
  const seen = new Set([srcNodeId]);

  while (queue.length) {
    const path = queue.shift();
    const nodeId = path[path.length - 1];
    if (nodeId === dstNodeId) {
      return path;
    }

    for (const link of state.links) {
      if (link.srcNodeId !== nodeId) {
        continue;
      }
      if (!linkMatchesTraffic(link, protocol, port)) {
        continue;
      }
      if (seen.has(link.dstNodeId)) {
        continue;
      }
      seen.add(link.dstNodeId);
      queue.push([...path, link.dstNodeId]);
    }
  }

  return null;
}

function resolvePathLinks(state, path, srcInterfaceId, dstInterfaceId, protocol, port) {
  const links = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const fromId = path[i];
    const toId = path[i + 1];
    const matches = state.links
      .filter((link) => link.srcNodeId === fromId && link.dstNodeId === toId && linkMatchesTraffic(link, protocol, port))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!matches.length) {
      return null;
    }

    let chosen = matches[0];
    if (i === 0) {
      chosen = matches.find((link) => link.srcInterfaceId === srcInterfaceId) || chosen;
    }
    if (i === path.length - 2) {
      chosen = matches.find((link) => link.dstInterfaceId === dstInterfaceId) || chosen;
    }
    links.push(chosen);
  }
  return links;
}

function actionAllows(action) {
  return action === "allow" || action === "limit";
}

function actionToVerdict(action) {
  return action === "reject" ? "REJECTED" : "TIMEOUT";
}

function evaluateNodeRules(node, type, context) {
  const relevantTypes = type === "routed" ? new Set(["forward", "routed"]) : new Set([type]);
  const defaultAction = type === "routed"
    ? (node.defaults?.routed || "deny")
    : (node.defaults?.[type] || (type === "outbound" ? "allow" : "deny"));

  const matchesType = (rule) => relevantTypes.has(rule.type || "");
  const matchesProtocol = (rule) => !rule.protocol || rule.protocol === "any" || rule.protocol === context.protocol;
  const matchesInterface = (rule) => {
    if (type === "inbound" || type === "outbound") {
      return !rule.interfaceId || rule.interfaceId === context.interfaceId;
    }
    const inOk = !rule.inInterfaceId || rule.inInterfaceId === context.inInterfaceId;
    const outOk = !rule.outInterfaceId || rule.outInterfaceId === context.outInterfaceId;
    return inOk && outOk;
  };
  const matchesAddresses = (rule) => {
    const fromOk = addressMatches(rule.fromAddress, context.fromAddress);
    const toOk = addressMatches(rule.toAddress, context.toAddress);
    return fromOk && toOk;
  };
  const matchesPorts = (rule) => {
    if (context.protocol !== "tcp" && context.protocol !== "udp") {
      return true;
    }
    const fromOk = !context.fromPort ? true : portMatches(rule.fromPort, context.fromPort);
    const toOk = portMatches(rule.toPort || rule.port, context.toPort);
    return fromOk && toOk;
  };

  const activeRules = (node.firewallRules || []).length
    ? (node.firewallRules || [])
    : (node.interfaces || []).flatMap((iface) => (iface.firewallRules || []));

  for (const rule of activeRules) {
    if (!matchesType(rule)) {
      continue;
    }
    if (!matchesProtocol(rule)) {
      continue;
    }
    if (!matchesInterface(rule)) {
      continue;
    }
    if (!matchesAddresses(rule)) {
      continue;
    }
    if (!matchesPorts(rule)) {
      continue;
    }
    const action = rule.action || "deny";
    return {
      allowed: actionAllows(action),
      verdict: actionToVerdict(action),
      nodeName: node.name,
      phase: type,
      explicit: true,
      rule,
    };
  }

  return {
    allowed: actionAllows(defaultAction),
    verdict: actionToVerdict(defaultAction),
    nodeName: node.name,
    phase: type,
    explicit: false,
    action: defaultAction,
  };
}

function formatBlockedResult(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, path, detail, blockDecision) {
  const pathLabels = path.map((nodeId) => findNode(state, nodeId)?.name || nodeId);
  const src = endpointLabel(state, srcNodeId, srcInterfaceId);
  const dst = endpointLabel(state, dstNodeId, dstInterfaceId);
  const ruleReason = blockDecision.explicit
    ? `Matched ${blockDecision.rule.type} ${blockDecision.rule.action} rule.`
    : `Default ${blockDecision.phase} policy is ${blockDecision.action}.`;

  return [
    `Simulation result: ${blockDecision.verdict} by firewall policy.`,
    `Source ingress: ${src}`,
    `Destination egress: ${dst}`,
    `Path: ${pathLabels.join(" -> ")}`,
    `Blocked at: ${blockDecision.nodeName} (${blockDecision.phase})`,
    `Reason: ${ruleReason}`,
    ...detail,
  ].join("\n");
}

export function simulateFlowGraph(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, protocol, port, sourcePort) {
  const srcNode = findNode(state, srcNodeId);
  const dstNode = findNode(state, dstNodeId);
  const srcIface = findInterface(state, srcNodeId, srcInterfaceId);
  const dstIface = findInterface(state, dstNodeId, dstInterfaceId);

  if (!srcNode || !dstNode || !srcIface || !dstIface) {
    return { status: "invalid", message: "Simulation aborted: source or destination endpoint does not exist." };
  }

  const path = bfsPath(state, srcNodeId, dstNodeId, protocol, port);
  if (!path) {
    return {
      status: "no_path",
      path: null,
      hopLinks: null,
      protocol,
      port,
      message: [
        "Simulation result: no valid directed path for this flow.",
        `Source: ${endpointLabel(state, srcNodeId, srcInterfaceId)}`,
        `Destination: ${endpointLabel(state, dstNodeId, dstInterfaceId)}`,
        "Consider adding a routed/wireguard edge or adjusting protocol/port constraints.",
      ].join("\n"),
    };
  }

  const hopLinks = resolvePathLinks(state, path, srcInterfaceId, dstInterfaceId, protocol, port);
  if (!hopLinks) {
    return {
      status: "no_path",
      path,
      hopLinks: null,
      protocol,
      port,
      message: [
        "Simulation result: no valid directed path for this flow.",
        `Source: ${endpointLabel(state, srcNodeId, srcInterfaceId)}`,
        `Destination: ${endpointLabel(state, dstNodeId, dstInterfaceId)}`,
        "Link interface mapping did not resolve for this route.",
      ].join("\n"),
    };
  }

  const fromAddress = normalizeAddress(srcIface.ip || (srcIface.cidr || "").split("/")[0]);
  const toAddress = normalizeAddress(dstIface.ip || (dstIface.cidr || "").split("/")[0]);
  const fromPort = String(sourcePort || "").trim();
  const toPort = String(port || "").trim();
  const detail = [];

  for (let i = 0; i < hopLinks.length; i += 1) {
    const fromId = path[i];
    const toId = path[i + 1];
    const link = hopLinks[i];
    const natNote = link.natMode !== "none" ? ` NAT=${link.natMode.toUpperCase()}` : " NAT=none";
    const conntrackNote = link.conntrack ? " conntrack=on" : " conntrack=off";
    detail.push(`${i + 1}. ${findNode(state, fromId)?.name} -> ${findNode(state, toId)?.name} via ${link.linkType}${natNote}${conntrackNote}`);
  }

  const outboundDecision = evaluateNodeRules(srcNode, "outbound", {
    protocol,
    fromAddress,
    toAddress,
    fromPort,
    toPort,
    interfaceId: srcInterfaceId,
  });
  if (!outboundDecision.allowed) {
    return {
      status: "blocked",
      path,
      hopLinks,
      protocol,
      port,
      blockDecision: outboundDecision,
      blockedAtIndex: 0,
      message: formatBlockedResult(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, path, detail, outboundDecision),
    };
  }

  for (let i = 1; i < hopLinks.length; i += 1) {
    const transitNode = findNode(state, path[i]);
    if (!transitNode) {
      continue;
    }
    const previousLink = hopLinks[i - 1];
    const currentLink = hopLinks[i];
    const routedDecision = evaluateNodeRules(transitNode, "routed", {
      protocol,
      fromAddress,
      toAddress,
      fromPort,
      toPort,
      inInterfaceId: previousLink.dstInterfaceId,
      outInterfaceId: currentLink.srcInterfaceId,
    });
    if (!routedDecision.allowed) {
      return {
        status: "blocked",
        path,
        hopLinks,
        protocol,
        port,
        blockDecision: routedDecision,
        blockedAtIndex: i,
        message: formatBlockedResult(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, path, detail, routedDecision),
      };
    }
  }

  const inboundDecision = evaluateNodeRules(dstNode, "inbound", {
    protocol,
    fromAddress,
    toAddress,
    fromPort,
    toPort,
    interfaceId: dstInterfaceId,
  });
  if (!inboundDecision.allowed) {
    return {
      status: "blocked",
      path,
      hopLinks,
      protocol,
      port,
      blockDecision: inboundDecision,
      blockedAtIndex: path.length - 1,
      message: formatBlockedResult(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, path, detail, inboundDecision),
    };
  }

  const pathLabels = path.map((nodeId) => findNode(state, nodeId)?.name || nodeId);

  return {
    status: "allowed",
    path,
    hopLinks,
    protocol,
    port,
    message: [
      "Simulation result: flow accepted by intent graph.",
      `Source ingress: ${srcIface.name} on ${srcNode.name}`,
      `Destination egress: ${dstIface.name} on ${dstNode.name}`,
      `Path: ${pathLabels.join(" -> ")}`,
      ...detail,
    ].join("\n"),
  };
}

export function simulateFlow(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, protocol, port, sourcePort) {
  const result = simulateFlowGraph(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, protocol, port, sourcePort);
  return result?.message || "Simulation aborted: source or destination endpoint does not exist.";
}
