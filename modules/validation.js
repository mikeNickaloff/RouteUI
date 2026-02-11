import { endpointLabel, findInterface, findNode } from "./model.js";

function checkRuleOverlap(state, warnings) {
  const seen = new Map();
  for (const link of state.links) {
    const key = [link.srcNodeId, link.dstNodeId, link.protocol, link.ports || "any"].join("|");
    if (seen.has(key)) {
      warnings.push(`Potential rule overlap: ${seen.get(key)} and ${link.id} target the same flow envelope.`);
    } else {
      seen.set(key, link.id);
    }
  }
}

function checkNatOverlap(state, warnings) {
  const natBuckets = new Map();
  for (const link of state.links) {
    if (link.natMode === "none") {
      continue;
    }
    const key = `${link.dstNodeId}|${link.dstInterfaceId}|${link.protocol}|${link.ports || "any"}`;
    const bucket = natBuckets.get(key) || [];
    bucket.push(link.id);
    natBuckets.set(key, bucket);
  }

  for (const [bucketKey, ids] of natBuckets.entries()) {
    if (ids.length > 1) {
      warnings.push(`NAT overlap warning (${bucketKey}): links ${ids.join(", ")} can match the same prerouting/postrouting flow.`);
    }
  }
}

function checkWireGuardOverlap(state, warnings) {
  const wgAllowedIps = new Map();
  for (const node of state.nodes) {
    for (const iface of node.interfaces) {
      if (iface.kind !== "wireguard" || !iface.allowedIps) {
        continue;
      }
      const ranges = iface.allowedIps.split(",").map((item) => item.trim()).filter(Boolean);
      for (const range of ranges) {
        const current = wgAllowedIps.get(range);
        const label = `${node.name}/${iface.name}`;
        if (current && current !== label) {
          warnings.push(`WireGuard AllowedIPs overlap: ${range} appears on ${current} and ${label}.`);
        } else {
          wgAllowedIps.set(range, label);
        }
      }
    }
  }
}

function checkSshLockout(state, warnings) {
  const adminNodes = state.nodes.filter((node) => node.trust === "admin");
  for (const node of adminNodes) {
    const hasSshIngress = state.links.some((link) => {
      const targetsNode = link.dstNodeId === node.id;
      const usesTcp = link.protocol === "tcp";
      const includes22 = (link.ports || "").includes("22");
      return targetsNode && usesTcp && includes22;
    });
    if (!hasSshIngress) {
      warnings.push(`Potential SSH lockout for admin node "${node.name}": no explicit TCP/22 ingress intent found.`);
    }
  }
}

function checkModelIntegrity(state, warnings) {
  for (const node of state.nodes) {
    if (!node.interfaces.length) {
      warnings.push(`Node "${node.name}" has no interfaces.`);
    }
  }

  for (const link of state.links) {
    const srcNode = findNode(state, link.srcNodeId);
    const dstNode = findNode(state, link.dstNodeId);
    const srcIface = findInterface(state, link.srcNodeId, link.srcInterfaceId);
    const dstIface = findInterface(state, link.dstNodeId, link.dstInterfaceId);
    if (!srcNode || !dstNode || !srcIface || !dstIface) {
      warnings.push(`Link ${link.id} references a missing node/interface endpoint.`);
      continue;
    }

    if (link.linkType === "wireguard" && (srcIface.kind !== "wireguard" || dstIface.kind !== "wireguard")) {
      warnings.push(`WireGuard link ${link.id} should connect two wireguard interfaces.`);
    }

    if (link.linkType === "firewall-boundary" && link.natMode !== "none") {
      warnings.push(`Firewall-only boundary ${link.id} should not include NAT mode ${link.natMode}.`);
    }

    if (link.conntrack === false && ["tcp", "udp"].includes(link.protocol)) {
      warnings.push(`Link ${link.id} disables conntrack on ${link.protocol.toUpperCase()} traffic; verify return path pinning risk.`);
    }
  }
}

export function validateTopology(state) {
  const warnings = [];

  checkModelIntegrity(state, warnings);
  checkRuleOverlap(state, warnings);
  checkNatOverlap(state, warnings);
  checkWireGuardOverlap(state, warnings);
  checkSshLockout(state, warnings);

  if (!warnings.length) {
    warnings.push("No critical validation warnings found for the current topology model.");
  }

  return warnings;
}

export function explainLink(state, link) {
  return `${endpointLabel(state, link.srcNodeId, link.srcInterfaceId)} -> ${endpointLabel(state, link.dstNodeId, link.dstInterfaceId)} (${link.protocol.toUpperCase()} ${link.ports || "any"})`;
}
