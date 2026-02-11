const APP_VERSION = 1;

function nextId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialState() {
  return {
    version: APP_VERSION,
    nodes: [],
    links: [],
    metadata: {
      updatedAt: new Date().toISOString(),
    },
  };
}

export function createNode({ name, type, trust, x, y }) {
  return {
    id: nextId("node"),
    name,
    type,
    trust,
    x,
    y,
    interfaces: [],
  };
}

export function createInterface(data) {
  return {
    id: nextId("iface"),
    name: data.name,
    kind: data.kind,
    cidr: data.cidr || "",
    direction: data.direction || "bidirectional",
    forwarding: Boolean(data.forwarding),
    natAllowed: Boolean(data.natAllowed),
    allowedIps: data.allowedIps || "",
    listenPort: data.listenPort || "",
  };
}

export function createLink(data) {
  return {
    id: nextId("link"),
    srcNodeId: data.srcNodeId,
    srcInterfaceId: data.srcInterfaceId,
    dstNodeId: data.dstNodeId,
    dstInterfaceId: data.dstInterfaceId,
    linkType: data.linkType,
    protocol: data.protocol,
    ports: data.ports || "",
    sourcePort: data.sourcePort || "",
    natMode: data.natMode || "none",
    conntrack: Boolean(data.conntrack),
    policyTable: data.policyTable || "",
    description: data.description || "",
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function touchState(state) {
  state.metadata = state.metadata || {};
  state.metadata.updatedAt = new Date().toISOString();
  return state;
}

export function findNode(state, nodeId) {
  return state.nodes.find((node) => node.id === nodeId);
}

export function findInterface(state, nodeId, interfaceId) {
  const node = findNode(state, nodeId);
  if (!node) {
    return null;
  }
  return node.interfaces.find((iface) => iface.id === interfaceId) || null;
}

export function endpointLabel(state, nodeId, interfaceId) {
  const node = findNode(state, nodeId);
  const iface = findInterface(state, nodeId, interfaceId);
  if (!node || !iface) {
    return "Unknown endpoint";
  }
  return `${node.name} :: ${iface.name}`;
}

export function listEndpoints(state) {
  const endpoints = [];
  for (const node of state.nodes) {
    for (const iface of node.interfaces) {
      endpoints.push({
        nodeId: node.id,
        interfaceId: iface.id,
        label: `${node.name} :: ${iface.name}`,
      });
    }
  }
  return endpoints.sort((a, b) => a.label.localeCompare(b.label));
}
