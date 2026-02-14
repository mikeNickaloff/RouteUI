import { generateNodeSetup } from "./modules/generator.js?v=20260213n";
import {
  cloneState,
  createInitialState,
  createInterface,
  createLink,
  createNode,
  findNode,
  listEndpoints,
  touchState,
} from "./modules/model.js?v=20260213n";
import {
  childVisibleEndpoints,
  createChildWorkload,
  createFirewallRule,
  createHostInterface,
  ensureInterfaceConfig,
  ensureNodeConfig,
  ensureStateConfig,
  findChild,
  findIfaceOnNode,
  findParentChildRelation,
  findRule,
  getOpenPortsForDestination,
  getTransitiveReachableEndpoints,
  hostSupportsChildren,
  interfaceDisplayAddress,
} from "./modules/host-config.js?v=20260213n";
import { parseInterfaceImport, parseIptablesImport } from "./modules/importers.js?v=20260213n";
import { setupModal } from "./modules/modal.js?v=20260213n";
import { buildConnectionLabel, renderTopology } from "./modules/render.js?v=20260213n";
import { exportToFile, importFromFile, loadInitialState, saveToLocalStorage } from "./modules/storage.js?v=20260213n";
import { simulateFlow, simulateFlowGraph } from "./modules/simulation.js?v=20260213n";
import { validateTopology } from "./modules/validation.js?v=20260213n";
import { buildCidr, parseCidr } from "./modules/utils.js?v=20260213n";

const dom = {
  canvasPanel: document.querySelector(".canvas-panel"),
  openNodeCreateBtn: document.getElementById("open-node-create-btn"),
  configureSelectedBtn: document.getElementById("configure-selected-btn"),
  openConnectionsBtn: document.getElementById("open-connections-btn"),
  openExamplesBtn: document.getElementById("open-examples-btn"),
  openHelpBtn: document.getElementById("open-help-btn"),
  multiSelectBtn: document.getElementById("multi-select-btn"),
  multiSelectStatus: document.getElementById("multi-select-status"),
  diagramLegendPairs: document.getElementById("diagram-legend-pairs"),
  addNodeForm: document.getElementById("add-node-form"),
  addInterfaceForm: document.getElementById("add-interface-form"),
  addLinkForm: document.getElementById("add-link-form"),
  selectedNode: document.getElementById("selected-node"),
  configureHostBtn: document.getElementById("configure-selected-btn") || document.getElementById("configure-host-btn"),
  deleteLinkBtn: document.getElementById("delete-link-btn"),
  connectionSelect: document.getElementById("connection-select"),
  validateBtn: document.getElementById("validate-btn"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
  canvas: document.getElementById("topology-canvas"),
  validationOutput: document.getElementById("validation-output"),
  simulationOutput: document.getElementById("simulation-output"),
  modelOutput: document.getElementById("model-output"),
  simSrc: document.getElementById("sim-src"),
  simDst: document.getElementById("sim-dst"),
  simProto: document.getElementById("sim-proto"),
  simPort: document.getElementById("sim-port"),
  simulateBtn: document.getElementById("simulate-btn"),

  modalTitle: document.getElementById("modal-title"),
  firewallPre: document.getElementById("firewall-pre"),
  routingPre: document.getElementById("routing-pre"),
  wireguardPre: document.getElementById("wireguard-pre"),

  nodeConfigNameInput: document.getElementById("node-config-name"),
  nodeConfigTypeSelect: document.getElementById("node-config-type"),
  nodeConfigTrustSelect: document.getElementById("node-config-trust"),
  deleteNodeConfirmBtn: document.getElementById("delete-node-confirm-btn"),

  ifaceAllowedIpsRow: document.getElementById("iface-allowedips-row"),
  ifaceListenPortRow: document.getElementById("iface-listenport-row"),
  linkTypeRow: document.getElementById("link-type-row"),
  linkProtocolRow: document.getElementById("link-protocol-row"),
  linkPortsRow: document.getElementById("link-ports-row"),
  linkSrcPortRow: document.getElementById("link-src-port-row"),
  linkNatRow: document.getElementById("link-nat-row"),
  linkPolicyRow: document.getElementById("link-policy-row"),
  linkConntrackRow: document.getElementById("link-conntrack-row"),

  hostDefaultInbound: document.getElementById("host-default-inbound"),
  hostDefaultOutbound: document.getElementById("host-default-outbound"),
  hostDefaultRouted: document.getElementById("host-default-routed"),
  saveHostDefaultsBtn: document.getElementById("save-host-defaults-btn"),
  hostInterfaceSummary: document.getElementById("host-interface-summary"),
  hostRuleSummary: document.getElementById("host-rule-summary"),

  hostInterfaceForm: document.getElementById("host-interface-form"),
  hostInterfaceSelect: document.getElementById("host-interface-select"),
  newInterfaceBtn: document.getElementById("new-interface-btn"),
  editInterfaceBtn: document.getElementById("edit-interface-btn"),
  deleteInterfaceBtn: document.getElementById("delete-interface-btn"),
  importInterfacesBtn: document.getElementById("import-interfaces-btn"),
  ifaceNameInput: document.getElementById("iface-name-input"),
  ifaceKindInput: document.getElementById("iface-kind-input"),
  ifaceAddressModeInput: document.getElementById("iface-address-mode-input"),
  ifaceIpInput: document.getElementById("iface-ip-input"),
  ifaceNetmaskInput: document.getElementById("iface-netmask-input"),
  ifaceCidrInput: document.getElementById("iface-cidr-input"),
  ifaceBroadcastInput: document.getElementById("iface-broadcast-input"),
  ifaceGatewayInput: document.getElementById("iface-gateway-input"),
  ifaceStateInput: document.getElementById("iface-state-input"),
  ifaceVirtualModeInput: document.getElementById("iface-virtual-mode-input"),
  ifaceBridgedInput: document.getElementById("iface-bridged-input"),
  ifaceAllowedIpsInput: document.getElementById("iface-allowedips-input"),
  ifaceListenPortInput: document.getElementById("iface-listenport-input"),
  ifaceIpRow: document.getElementById("iface-ip-row"),
  ifaceNetmaskRow: document.getElementById("iface-netmask-row"),
  ifaceCidrRow: document.getElementById("iface-cidr-row"),
  ifaceBroadcastRow: document.getElementById("iface-broadcast-row"),
  ifaceGatewayRow: document.getElementById("iface-gateway-row"),
  ifaceVirtualModeRow: document.getElementById("iface-virtual-mode-row"),
  ifaceBridgedRow: document.getElementById("iface-bridged-row"),
  ifaceAllowedIpsRowModal: document.getElementById("iface-allowedips-row-modal"),
  ifaceListenPortRowModal: document.getElementById("iface-listenport-row-modal"),

  hostRuleForm: document.getElementById("host-rule-form"),
  hostRuleSelect: document.getElementById("host-rule-select"),
  addRuleBtn: document.getElementById("add-rule-btn"),
  editRuleBtn: document.getElementById("edit-rule-btn"),
  updateRuleBtn: document.getElementById("update-rule-btn"),
  deleteRuleBtn: document.getElementById("delete-rule-btn"),
  importIptablesBtn: document.getElementById("import-iptables-btn"),
  ruleTypeInput: document.getElementById("rule-type-input"),
  ruleActionInput: document.getElementById("rule-action-input"),
  ruleProtocolInput: document.getElementById("rule-protocol-input"),
  ruleInterfaceSelect: document.getElementById("rule-interface-select"),
  ruleInInterfaceSelect: document.getElementById("rule-in-interface-select"),
  ruleOutInterfaceSelect: document.getElementById("rule-out-interface-select"),
  ruleFromEndpointSelect: document.getElementById("rule-from-endpoint-select"),
  ruleToEndpointSelect: document.getElementById("rule-to-endpoint-select"),
  ruleFromAddressInput: document.getElementById("rule-from-address-input"),
  ruleToAddressInput: document.getElementById("rule-to-address-input"),
  ruleFromPortInput: document.getElementById("rule-from-port-input"),
  ruleToPortInput: document.getElementById("rule-to-port-input"),
  ruleDescriptionInput: document.getElementById("rule-description-input"),
  ruleSingleInterfaceRow: document.getElementById("rule-single-interface-row"),
  ruleInInterfaceRow: document.getElementById("rule-in-interface-row"),
  ruleOutInterfaceRow: document.getElementById("rule-out-interface-row"),
  ruleFromPortRow: document.getElementById("rule-from-port-row"),
  ruleToPortRow: document.getElementById("rule-to-port-row"),

  interfaceTestForm: document.getElementById("interface-test-form"),
  testSourceSelect: document.getElementById("test-source-select"),
  testSourcePortInput: document.getElementById("test-source-port-input"),
  testDestinationSelect: document.getElementById("test-destination-select"),
  testProtocolSelect: document.getElementById("test-protocol-select"),
  testPortSelect: document.getElementById("test-port-select"),
  testCustomPortInput: document.getElementById("test-custom-port-input"),
  testPortRow: document.getElementById("test-port-row"),
  testCustomPortRow: document.getElementById("test-custom-port-row"),
  interfaceTestStatus: document.getElementById("interface-test-status"),
  interfaceTestOutput: document.getElementById("interface-test-output"),

  childForm: document.getElementById("child-form"),
  childSelect: document.getElementById("child-select"),
  addChildBtn: document.getElementById("add-child-btn"),
  configureChildBtn: document.getElementById("configure-child-btn"),
  deleteChildBtn: document.getElementById("delete-child-btn"),
  childNameInput: document.getElementById("child-name-input"),
  childKindInput: document.getElementById("child-kind-input"),
  childBindInterfaceSelect: document.getElementById("child-bind-interface-select"),
  saveChildBtn: document.getElementById("save-child-btn"),
  childVisibilityNote: document.getElementById("child-visibility-note"),

  hostTabButtons: Array.from(document.querySelectorAll(".host-tab-btn")),
  hostTabPanels: Array.from(document.querySelectorAll(".host-tab-panel")),

  connectionsInterfaceSelect: document.getElementById("connections-interface-select"),
  connectionsSelect: document.getElementById("connections-select"),
  connectionNewBtn: document.getElementById("connection-new-btn"),
  connectionEditBtn: document.getElementById("connection-edit-btn"),
  connectionDeleteBtn: document.getElementById("connection-delete-btn"),

  interfaceConfigModal: document.getElementById("interface-config-modal"),
  interfaceModalTitle: document.getElementById("interface-modal-title"),
  closeInterfaceModalBtn: document.getElementById("close-interface-modal-btn"),
  cancelInterfaceModalBtn: document.getElementById("cancel-interface-modal-btn"),
  ruleConfigModal: document.getElementById("rule-config-modal"),
  ruleModalTitle: document.getElementById("rule-modal-title"),
  closeRuleModalBtn: document.getElementById("close-rule-modal-btn"),
  cancelRuleModalBtn: document.getElementById("cancel-rule-modal-btn"),
  interfaceImportModal: document.getElementById("interface-import-modal"),
  interfaceImportForm: document.getElementById("interface-import-form"),
  interfaceImportInput: document.getElementById("interface-import-input"),
  interfaceImportStatus: document.getElementById("interface-import-status"),
  closeInterfaceImportModalBtn: document.getElementById("close-interface-import-modal-btn"),
  cancelInterfaceImportBtn: document.getElementById("cancel-interface-import-btn"),
  firewallImportModal: document.getElementById("firewall-import-modal"),
  firewallImportForm: document.getElementById("firewall-import-form"),
  firewallImportInput: document.getElementById("firewall-import-input"),
  firewallImportStatus: document.getElementById("firewall-import-status"),
  closeFirewallImportModalBtn: document.getElementById("close-firewall-import-modal-btn"),
  cancelFirewallImportBtn: document.getElementById("cancel-firewall-import-btn"),

  nodeCreateModal: document.getElementById("node-create-modal"),
  nodeCreateForm: document.getElementById("node-create-form"),
  nodeCreateName: document.getElementById("node-create-name"),
  nodeCreateType: document.getElementById("node-create-type"),
  nodeCreateTrust: document.getElementById("node-create-trust"),
  openNodeImportBtn: document.getElementById("open-node-import-btn"),
  closeNodeCreateModalBtn: document.getElementById("close-node-create-modal-btn"),
  cancelNodeCreateBtn: document.getElementById("cancel-node-create-btn"),
  nodeImportModal: document.getElementById("node-import-modal"),
  nodeImportForm: document.getElementById("node-import-form"),
  closeNodeImportModalBtn: document.getElementById("close-node-import-modal-btn"),
  cancelNodeImportBtn: document.getElementById("cancel-node-import-btn"),
  nodeImportSubmitTopBtn: document.getElementById("node-import-submit-top-btn"),
  nodeImportCommandInput: document.getElementById("node-import-command"),
  copyNodeImportCommandBtn: document.getElementById("copy-node-import-command-btn"),
  pasteNodeImportOutputBtn: document.getElementById("paste-node-import-output-btn"),
  nodeImportOutput: document.getElementById("node-import-output"),
  nodeImportStatus: document.getElementById("node-import-status"),

  examplesModal: document.getElementById("examples-modal"),
  examplesForm: document.getElementById("examples-form"),
  examplesSelect: document.getElementById("examples-select"),
  examplesImportBtn: document.getElementById("examples-import-btn"),
  examplesCancelBtn: document.getElementById("examples-cancel-btn"),
  closeExamplesModalBtn: document.getElementById("close-examples-modal-btn"),

  helpModal: document.getElementById("help-modal"),
  helpContent: document.getElementById("help-content"),
  closeHelpModalBtn: document.getElementById("close-help-modal-btn"),
  helpCloseBtn: document.getElementById("help-close-btn"),

  connectionsModal: document.getElementById("connections-modal"),
  closeConnectionsModalBtn: document.getElementById("close-connections-modal-btn"),
  cancelConnectionsModalBtn: document.getElementById("cancel-connections-modal-btn"),
};

let state = createInitialState();
ensureStateConfig(state);
let selectedNodeId = "";
let multiSelectMode = false;
let multiSelectedIds = [];
let hostConfigState = {
  hostId: "",
  interfaceId: "",
  ruleId: "",
  childId: "",
  connectionInterfaceId: "",
  connectionId: "",
};
let hostModalDirty = false;
let interfaceEditorState = {
  mode: "edit",
  interfaceId: "",
};
let ruleEditorState = {
  mode: "edit",
  ruleId: "",
};
let linkEditorState = {
  mode: "new",
  linkId: "",
};

const modal = setupModal({
  modal: document.getElementById("host-config-modal"),
  closeButton: document.getElementById("close-modal-btn"),
  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  copyButtons: Array.from(document.querySelectorAll(".copy-btn")),
  onBeforeClose: handleHostModalBeforeClose,
});

const interfaceModal = setupModal({
  modal: dom.interfaceConfigModal,
  closeButton: dom.closeInterfaceModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const ruleModal = setupModal({
  modal: dom.ruleConfigModal,
  closeButton: dom.closeRuleModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const nodeCreateModal = setupModal({
  modal: dom.nodeCreateModal,
  closeButton: dom.closeNodeCreateModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const nodeImportModal = setupModal({
  modal: dom.nodeImportModal,
  closeButton: dom.closeNodeImportModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const examplesModal = setupModal({
  modal: dom.examplesModal,
  closeButton: dom.closeExamplesModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const helpModal = setupModal({
  modal: dom.helpModal,
  closeButton: dom.closeHelpModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const connectionsModal = setupModal({
  modal: dom.connectionsModal,
  closeButton: dom.closeConnectionsModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const interfaceImportModal = setupModal({
  modal: dom.interfaceImportModal,
  closeButton: dom.closeInterfaceImportModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const firewallImportModal = setupModal({
  modal: dom.firewallImportModal,
  closeButton: dom.closeFirewallImportModalBtn,
  tabButtons: [],
  tabPanels: [],
  copyButtons: [],
});

const NODE_WIDTH = 180;

const EXAMPLES = [
  { id: "blank", label: "Blank", path: "examples/default.json" },
  { id: "default", label: "Simple Home Network", path: "examples/default.json" },
  { id: "network", label: "Complex Home Network", path: "examples/network.json" },
  {
    id: "enterprise-edge-access-switches",
    label: "Simple Enterprise Edge Stack - 2 Branches",
    path: "examples/enterprise-edge-access-switches.json",
  },
];

const ROUTE_COLORS = [
  "#2f6f5f",
  "#b03a2e",
  "#2a4d8f",
  "#8f6b2a",
  "#5c3b8f",
  "#1f7a6b",
  "#8f2a4f",
  "#2a8f5f",
];

const NODE_IMPORT_COMMAND = [
  "sudo echo '__ROUTETOOL_HOSTNAME_BEGIN__'",
  "hostname",
  "echo '__ROUTETOOL_HOSTNAME_END__'",
  "echo '__ROUTETOOL_LINK_BEGIN__'",
  "sudo ip -o link",
  "echo '__ROUTETOOL_LINK_END__'",
  "echo '__ROUTETOOL_ADDR_BEGIN__'",
  "sudo ip -o -4 addr",
  "echo '__ROUTETOOL_ADDR_END__'",
  "echo '__ROUTETOOL_ROUTE_BEGIN__'",
  "sudo ip route",
  "echo '__ROUTETOOL_ROUTE_END__'",
  "echo '__ROUTETOOL_IPTABLES_BEGIN__'",
  "sudo iptables -S",
  "echo '__ROUTETOOL_IPTABLES_END__'",
].join(" && ");

const HELP_HTML = `
  <h3>0. What this tool is for</h3>
  <p>RouteTool models Linux-style networking (routing, NAT, firewall, WireGuard) in a visual graph. It’s built for systems that support the <code>ip</code> command (Linux, OpenWRT, Android) and common firewall stacks (UFW/iptables/WireGuard).</p>

  <h3>1. What a node is</h3>
  <p>A node represents a host, router, VM, container, or abstract Internet. Each node owns interfaces and policies.</p>

  <h3>2. How to add a node</h3>
  <p>Click <strong>Add Node</strong>, fill out name/type/trust, then click <strong>Create</strong>. You can move nodes by dragging them.</p>

  <h3>3. How to add an interface</h3>
  <p>Open the node’s <strong>Configuration</strong> and add an interface with IP/CIDR and type (physical, bridge, wireguard, etc.).</p>

  <h3>4. Import interfaces from an existing host</h3>
  <p>Use <strong>Import Interfaces</strong> and paste output from:</p>
  <pre>ip -o link\nip -o -4 addr\nip route</pre>

  <h3>5. How to add firewall rules</h3>
  <p>Open <strong>Host Firewall / Routed Rules</strong>, add a rule, choose direction (inbound/outbound/routed), protocol, and addresses/ports.</p>

  <h3>6. How to add routes using firewall rules</h3>
  <p>Use <strong>routed</strong> (or <strong>forward</strong>) rules to allow inter-interface traffic. Defaults control what passes without explicit rules.</p>

  <h3>7. Import firewall rules</h3>
  <p>Use <strong>Import iptables</strong> and paste:</p>
  <pre>iptables -S && ip route</pre>

  <h3>8. How the network testing tool works</h3>
  <p>The Interface Test simulates a flow across the intent graph using your rules and defaults. It reports allowed/blocked paths and why.</p>

  <h3>9. How to add a container</h3>
  <p>Open a host’s <strong>Configuration</strong> and use the <strong>Child VMs / Containers</strong> section to add a container or VM and bind it to a host interface.</p>

  <h3>10. Quick container walkthrough</h3>
  <p>Create a host with a bridge interface (e.g., <code>br0</code>), add a container bound to that bridge, then add routed rules to allow LAN → container traffic. Finally, add inbound rules on the container for the service port you want exposed.</p>
`;

function setRowVisible(rowElement, visible) {
  if (!rowElement) {
    return;
  }
  rowElement.classList.toggle("form-row-hidden", !visible);
}

function setActiveHostTab(tabName) {
  dom.hostTabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  dom.hostTabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

function renderExampleOptions() {
  if (!dom.examplesSelect) {
    return;
  }
  dom.examplesSelect.innerHTML = "";
  for (const example of EXAMPLES) {
    const option = document.createElement("option");
    option.value = example.path;
    option.textContent = example.label;
    dom.examplesSelect.appendChild(option);
  }
}

function display_help(html_code) {
  if (!dom.helpContent) {
    return;
  }
  dom.helpContent.innerHTML = html_code;
  helpModal.open();
}

async function importExample(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      alert(`Failed to load example (${response.status}).`);
      return;
    }
    const parsed = await response.json();
    if (!parsed || typeof parsed !== "object") {
      alert("Example file is not a valid topology JSON object.");
      return;
    }
    setState(parsed);
  } catch (error) {
    console.error("Failed to import example:", error);
    alert("Failed to import example.");
  }
}

function resolveRouteCandidate(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, protocol, port) {
  const result = simulateFlowGraph(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId, protocol, port, "");
  if (!result || result.status === "invalid") {
    return null;
  }
  return result;
}

function resolveRouteForEndpoint(state, srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId) {
  const candidates = [];
  const tcpPorts = getOpenPortsForDestination(state, dstNodeId, dstInterfaceId, "tcp");
  const udpPorts = getOpenPortsForDestination(state, dstNodeId, dstInterfaceId, "udp");

  for (const port of tcpPorts) {
    candidates.push({ protocol: "tcp", port });
  }
  for (const port of udpPorts) {
    candidates.push({ protocol: "udp", port });
  }
  candidates.push({ protocol: "icmp", port: "" });

  const fallbackProtocols = ["any", "tcp", "udp", "icmp"];
  for (const protocol of fallbackProtocols) {
    if (!candidates.some((candidate) => candidate.protocol === protocol && !candidate.port)) {
      candidates.push({ protocol, port: "" });
    }
  }

  let blockedFallback = null;
  let noPathFallback = null;
  for (const candidate of candidates) {
    const result = resolveRouteCandidate(
      state,
      srcNodeId,
      srcInterfaceId,
      dstNodeId,
      dstInterfaceId,
      candidate.protocol,
      candidate.port,
    );
    if (!result) {
      continue;
    }
    if (result.status === "allowed") {
      return result;
    }
    if (result.status === "blocked" && !blockedFallback) {
      blockedFallback = result;
      continue;
    }
    if (result.status === "no_path" && !noPathFallback) {
      noPathFallback = result;
    }
  }
  return blockedFallback || noPathFallback;
}

const FLOW_ROUTE_COLORS = [
  "#1f3a5f",
  "#0f4c5c",
  "#264653",
  "#1d3557",
  "#3d405b",
  "#5a2a27",
  "#6b3f2a",
  "#2a6f4f",
  "#7b2c3b",
  "#2c3e50",
  "#3b5d2a",
  "#4b2e83",
];

function colorForConnectionPair(srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId) {
  const key = `${srcNodeId}|${srcInterfaceId}|${dstNodeId}|${dstInterfaceId}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % FLOW_ROUTE_COLORS.length;
  return FLOW_ROUTE_COLORS[index];
}

function connectionDedupKey(srcNodeId, srcInterfaceId, dstNodeId) {
  return `${srcNodeId}|${srcInterfaceId}|${dstNodeId}`;
}

function flowPortMatches(portRule, flowPort) {
  const rule = String(portRule || "").trim();
  const portText = String(flowPort || "").trim();
  if (!rule || !portText) {
    return true;
  }
  if (rule.includes(":")) {
    const [start, end] = rule.split(":").map((part) => Number(part.trim()));
    const value = Number(portText);
    if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(value)) {
      return value >= start && value <= end;
    }
  }
  if (rule.includes(",")) {
    return rule.split(",").map((part) => part.trim()).includes(portText);
  }
  return rule === portText;
}

function linkSupportsFlow(link, protocol, port) {
  const linkProtocol = String(link.protocol || "any");
  if (linkProtocol !== "any" && linkProtocol !== protocol) {
    return false;
  }
  return flowPortMatches(link.ports, port);
}

function findConstrainedNoPathRoute(state, srcNodeId, dstNodeId, protocol, port) {
  const adjacency = new Map();
  const reverseAdjacency = new Map();
  for (const link of state.links) {
    if (!linkSupportsFlow(link, protocol, port)) {
      continue;
    }
    if (!adjacency.has(link.srcNodeId)) {
      adjacency.set(link.srcNodeId, []);
    }
    adjacency.get(link.srcNodeId).push(link);
    if (!reverseAdjacency.has(link.dstNodeId)) {
      reverseAdjacency.set(link.dstNodeId, []);
    }
    reverseAdjacency.get(link.dstNodeId).push(link);
  }

  const queue = [srcNodeId];
  const previous = new Map([[srcNodeId, null]]);
  const depthByNode = new Map([[srcNodeId, 0]]);
  while (queue.length) {
    const nodeId = queue.shift();
    const depth = depthByNode.get(nodeId) || 0;
    for (const link of adjacency.get(nodeId) || []) {
      const nextId = link.dstNodeId;
      if (previous.has(nextId)) {
        continue;
      }
      previous.set(nextId, nodeId);
      depthByNode.set(nextId, depth + 1);
      queue.push(nextId);
    }
  }

  const reverseDistance = new Map([[dstNodeId, 0]]);
  const reverseQueue = [dstNodeId];
  while (reverseQueue.length) {
    const nodeId = reverseQueue.shift();
    const distance = reverseDistance.get(nodeId) || 0;
    for (const link of reverseAdjacency.get(nodeId) || []) {
      const prevId = link.srcNodeId;
      if (reverseDistance.has(prevId)) {
        continue;
      }
      reverseDistance.set(prevId, distance + 1);
      reverseQueue.push(prevId);
    }
  }

  let targetNodeId = srcNodeId;
  let bestHasDistance = false;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDepth = 0;
  for (const [nodeId, parent] of previous.entries()) {
    if (parent === null) {
      continue;
    }
    const depth = depthByNode.get(nodeId) || 0;
    const hasDistance = reverseDistance.has(nodeId);
    const distance = hasDistance ? (reverseDistance.get(nodeId) || 0) : Number.POSITIVE_INFINITY;
    if (hasDistance && !bestHasDistance) {
      targetNodeId = nodeId;
      bestHasDistance = true;
      bestDistance = distance;
      bestDepth = depth;
      continue;
    }
    if (hasDistance && bestHasDistance) {
      if (distance < bestDistance || (distance === bestDistance && depth > bestDepth)) {
        targetNodeId = nodeId;
        bestDistance = distance;
        bestDepth = depth;
      }
      continue;
    }
    if (!bestHasDistance && depth > bestDepth) {
      targetNodeId = nodeId;
      bestDepth = depth;
    }
  }

  const path = [];
  let cursor = targetNodeId;
  while (cursor !== null && previous.has(cursor)) {
    path.push(cursor);
    cursor = previous.get(cursor);
  }
  path.reverse();

  if (path.length < 2) {
    return null;
  }
  return {
    path,
    segmentKeys: path.slice(0, -1).map((fromId, idx) => {
      const toId = path[idx + 1];
      const link = (adjacency.get(fromId) || []).find((candidate) => candidate.dstNodeId === toId);
      return link
        ? connectionDedupKey(link.srcNodeId, link.srcInterfaceId, link.dstNodeId)
        : `${fromId}|${toId}`;
    }),
  };
}

function blockedPathIndexForResult(result) {
  if (result?.status !== "blocked" || !Array.isArray(result.path) || !result.path.length) {
    return null;
  }
  const rawIndex = Number.isInteger(result.blockedAtIndex)
    ? result.blockedAtIndex
    : (result.path.length - 1);
  return Math.max(0, Math.min(result.path.length - 1, rawIndex));
}

function blockedSegmentIndexForResult(result) {
  if (result?.status !== "blocked" || !Array.isArray(result.path) || result.path.length < 2) {
    return null;
  }
  const pathIndex = blockedPathIndexForResult(result);
  return Math.max(0, Math.min(result.path.length - 2, pathIndex - 1));
}

function buildConnectionOverlay(id, link, direction) {
  const srcNodeId = link.srcNodeId;
  const srcInterfaceId = link.srcInterfaceId;
  const dstNodeId = link.dstNodeId;
  const dstInterfaceId = link.dstInterfaceId;
  const color = colorForConnectionPair(srcNodeId, srcInterfaceId, dstNodeId, dstInterfaceId);
  return {
    id,
    srcNodeId,
    srcInterfaceId,
    dstNodeId,
    dstInterfaceId,
    flowKey: `${srcNodeId}|${srcInterfaceId}|${dstNodeId}|${dstInterfaceId}`,
    segmentKeys: [connectionDedupKey(srcNodeId, srcInterfaceId, dstNodeId)],
    path: [srcNodeId, dstNodeId],
    blocked: false,
    blockedAtPathIndex: null,
    blockedNodeId: "",
    blockedSegmentIndex: null,
    blockedAtNodeName: "",
    direction,
    color,
  };
}

function buildConnectionOverlaysForNode(state, nodeId) {
  const node = findNode(state, nodeId);
  if (!node) {
    return [];
  }
  const overlays = [];
  const seen = new Set();
  let overlayIndex = 0;
  const links = [...state.links]
    .filter((link) => link.srcNodeId === nodeId || link.dstNodeId === nodeId)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const link of links) {
    const dedupe = connectionDedupKey(link.srcNodeId, link.srcInterfaceId, link.dstNodeId);
    if (seen.has(dedupe)) {
      continue;
    }
    seen.add(dedupe);
    const direction = link.srcNodeId === nodeId ? "outbound" : "inbound";
    overlays.push(buildConnectionOverlay(`conn-node-${link.id}-${overlayIndex}`, link, direction));
    overlayIndex += 1;
  }

  return overlays;
}

function buildConnectionOverlaysForIds(state, nodeIds) {
  const overlays = [];
  const selectedNodes = nodeIds.map((id) => findNode(state, id)).filter(Boolean);
  const seenRoute = new Set();
  let overlayIndex = 0;

  for (const srcNode of selectedNodes) {
    for (const dstNode of selectedNodes) {
      if (!srcNode || !dstNode || srcNode.id === dstNode.id) {
        continue;
      }
      for (const srcIface of srcNode.interfaces || []) {
        for (const dstIface of dstNode.interfaces || []) {
          const result = resolveRouteForEndpoint(state, srcNode.id, srcIface.id, dstNode.id, dstIface.id);
          if (!result) {
            continue;
          }
          const routeKey = `${srcNode.id}|${srcIface.id}|${dstNode.id}|${dstIface.id}`;
          if (seenRoute.has(routeKey)) {
            continue;
          }
          seenRoute.add(routeKey);
          const color = colorForConnectionPair(srcNode.id, srcIface.id, dstNode.id, dstIface.id);

          if (result.status === "no_path") {
            const constrainedRoute = findConstrainedNoPathRoute(
              state,
              srcNode.id,
              dstNode.id,
              result.protocol || "any",
              result.port || "",
            );
            if (!constrainedRoute || !Array.isArray(constrainedRoute.path) || constrainedRoute.path.length < 2) {
              continue;
            }
            const blockedNodeId = constrainedRoute.path[constrainedRoute.path.length - 1] || srcNode.id;
            overlays.push({
              id: `route-ms-${srcNode.id}-${srcIface.id}-${dstNode.id}-${dstIface.id}-${overlayIndex}`,
              srcNodeId: srcNode.id,
              srcInterfaceId: srcIface.id,
              dstNodeId: dstNode.id,
              dstInterfaceId: dstIface.id,
              flowKey: routeKey,
              segmentKeys: constrainedRoute.segmentKeys,
              path: constrainedRoute.path,
              blocked: true,
              blockedAtPathIndex: constrainedRoute.path.length - 1,
              blockedNodeId,
              blockedSegmentIndex: constrainedRoute.path.length - 2,
              blockedAtNodeName: findNode(state, blockedNodeId)?.name || blockedNodeId,
              direction: "paired",
              color,
            });
            overlayIndex += 1;
            continue;
          }

          if (!Array.isArray(result.path) || result.path.length < 2) {
            continue;
          }

          const blockedAtPathIndex = blockedPathIndexForResult(result);
          const blockedSegmentIndex = blockedSegmentIndexForResult(result);
          const blockedNodeIdRaw = blockedAtPathIndex === null ? "" : (result.path[blockedAtPathIndex] || "");
          const blockedAtNodeNameRaw = blockedNodeIdRaw ? (findNode(state, blockedNodeIdRaw)?.name || blockedNodeIdRaw) : "";
          const blockedPhase = result.blockDecision?.phase || "";
          const showBlockedMarker = result.status === "blocked" && blockedPhase !== "inbound";
          const segmentKeys = Array.isArray(result.hopLinks) && result.hopLinks.length
            ? result.hopLinks.map((hopLink) => connectionDedupKey(hopLink.srcNodeId, hopLink.srcInterfaceId, hopLink.dstNodeId))
            : result.path.slice(0, -1).map((fromId, idx) => `${fromId}|${result.path[idx + 1]}`);

          overlays.push({
            id: `route-ms-${srcNode.id}-${srcIface.id}-${dstNode.id}-${dstIface.id}-${overlayIndex}`,
            srcNodeId: srcNode.id,
            srcInterfaceId: srcIface.id,
            dstNodeId: dstNode.id,
            dstInterfaceId: dstIface.id,
            flowKey: routeKey,
            segmentKeys,
            path: result.path,
            blocked: showBlockedMarker,
            blockedAtPathIndex: showBlockedMarker ? blockedAtPathIndex : null,
            blockedNodeId: showBlockedMarker ? blockedNodeIdRaw : "",
            blockedSegmentIndex: showBlockedMarker ? blockedSegmentIndex : null,
            blockedAtNodeName: showBlockedMarker ? blockedAtNodeNameRaw : "",
            direction: "paired",
            color,
          });
          overlayIndex += 1;
        }
      }
    }
  }

  return overlays;
}

function endpointLegendLabel(nodeId, interfaceId) {
  const node = findNode(state, nodeId);
  const iface = node ? findIfaceOnNode(node, interfaceId) : null;
  const nodeName = node?.name || nodeId;
  const ifaceName = iface?.name || interfaceId || "?";
  return `${nodeName}:${ifaceName}`;
}

function renderDiagramLegend(connectionOverlays) {
  if (!dom.diagramLegendPairs) {
    return;
  }
  dom.diagramLegendPairs.innerHTML = "";
  if (!connectionOverlays.length) {
    const empty = document.createElement("span");
    empty.className = "legend-pair-empty";
    empty.textContent = "No connections in the current view.";
    dom.diagramLegendPairs.appendChild(empty);
    return;
  }

  const pairs = new Map();
  for (const overlay of connectionOverlays) {
    const key = connectionDedupKey(overlay.srcNodeId, overlay.srcInterfaceId, overlay.dstNodeId);
    if (!pairs.has(key)) {
      pairs.set(key, overlay);
    }
  }
  const sorted = [...pairs.values()].sort((a, b) => {
    const left = endpointLegendLabel(a.srcNodeId, a.srcInterfaceId);
    const right = endpointLegendLabel(b.srcNodeId, b.srcInterfaceId);
    return left.localeCompare(right);
  });
  for (const overlay of sorted) {
    const item = document.createElement("div");
    item.className = "legend-pair-item";

    const swatch = document.createElement("span");
    swatch.className = "legend-pair-swatch";
    swatch.style.backgroundColor = overlay.color;

    const source = document.createElement("span");
    source.className = "legend-pair-source";
    source.textContent = endpointLegendLabel(overlay.srcNodeId, overlay.srcInterfaceId);

    const arrow = document.createElement("span");
    arrow.className = "legend-pair-arrow";
    arrow.textContent = "->";

    const destination = document.createElement("span");
    destination.className = "legend-pair-dest";
    destination.textContent = endpointLegendLabel(overlay.dstNodeId, overlay.dstInterfaceId);

    item.appendChild(swatch);
    item.appendChild(source);
    item.appendChild(arrow);
    item.appendChild(destination);
    dom.diagramLegendPairs.appendChild(item);
  }
}

function persistAndRender() {
  ensureStateConfig(state);
  touchState(state);
  saveToLocalStorage(state);
  hostModalDirty = false;
  renderAll();
}

function setState(next) {
  state = cloneState(next);
  ensureStateConfig(state);
  if (!state.nodes.find((node) => node.id === selectedNodeId)) {
    selectedNodeId = state.nodes[0]?.id || "";
  }
  persistAndRender();
}

function parseEndpointSelection(value) {
  const [nodeId, interfaceId] = value.split("|");
  return { nodeId, interfaceId };
}

function nodeTypeForChildKind(kind) {
  return kind === "vm" ? "Virtual Machine" : "Container";
}

function childKindForNodeType(type) {
  return type === "Virtual Machine" ? "vm" : "container";
}

function openHostConfigurationForNode(nodeId) {
  if (!nodeId) {
    alert("Select a host node first.");
    return;
  }
  const host = findNode(state, nodeId);
  if (!host) {
    alert("Selected host not found.");
    return;
  }

  ensureNodeConfig(host);
  selectedNodeId = host.id;
  hostConfigState.hostId = host.id;
  hostConfigState.interfaceId = host.interfaces[0]?.id || "";
  hostConfigState.ruleId = host.firewallRules?.[0]?.id || "";
  hostConfigState.childId = host.children[0]?.id || "";
  hostConfigState.connectionInterfaceId = "";
  hostConfigState.connectionId = "";

  renderHostConfigurationModal();
  hostModalDirty = false;
  setActiveHostTab("config");
  modal.open();
}

function ensureChildNode(host, child) {
  if (child.nodeId) {
    const existing = findNode(state, child.nodeId);
    if (existing) {
      ensureNodeConfig(existing);
      return existing;
    }
  }

  const childNode = createNode({
    name: child.name || `${child.kind}-${host.children.length}`,
    type: nodeTypeForChildKind(child.kind),
    trust: host.trust || "private",
    x: (host.x || 0) + 38,
    y: (host.y || 0) + 110,
  });
  ensureNodeConfig(childNode);
  child.nodeId = childNode.id;
  state.nodes.push(childNode);
  return childNode;
}

function collectDescendantNodeIds(nodeId, sink) {
  const node = findNode(state, nodeId);
  if (!node) {
    return;
  }
  for (const child of node.children || []) {
    if (!child.nodeId || sink.has(child.nodeId)) {
      continue;
    }
    sink.add(child.nodeId);
    collectDescendantNodeIds(child.nodeId, sink);
  }
}

function deleteNodeById(nodeId) {
  if (!nodeId) {
    return;
  }
  const toRemove = new Set([nodeId]);
  collectDescendantNodeIds(nodeId, toRemove);

  state.nodes = state.nodes.filter((node) => !toRemove.has(node.id));
  state.links = state.links.filter((link) => !toRemove.has(link.srcNodeId) && !toRemove.has(link.dstNodeId));
  state.nodes.forEach((node) => {
    node.children = (node.children || []).filter((child) => !toRemove.has(child.nodeId));
  });

  selectedNodeId = state.nodes[0]?.id || "";
  if (toRemove.has(hostConfigState.hostId)) {
    hostConfigState = { hostId: "", interfaceId: "", ruleId: "", childId: "" };
  }
  persistAndRender();
}

function onNodeDoubleClick(nodeId) {
  selectedNodeId = nodeId;
  renderAll();
  openHostConfigurationForNode(nodeId);
}

function renderAll() {
  renderNodeSelect();
  renderEndpointSelects();
  renderConnectionSelect();
  const activeIds = multiSelectMode ? multiSelectedIds : (selectedNodeId ? [selectedNodeId] : []);
  let routeOverlays = [];
  if (activeIds.length === 1) {
    routeOverlays = buildConnectionOverlaysForNode(state, activeIds[0]);
  } else if (activeIds.length > 1) {
    routeOverlays = buildConnectionOverlaysForIds(state, activeIds);
  }
  renderDiagramLegend(routeOverlays);
  renderTopology(
    dom.canvas,
    state,
    selectedNodeId,
    onSelectNode,
    onMoveNode,
    onNodeDoubleClick,
    routeOverlays,
    false,
    multiSelectMode ? multiSelectedIds : [],
  );
  renderModelJson();
}

function renderNodeSelect() {
  const sortedNodes = [...state.nodes].sort((a, b) => a.name.localeCompare(b.name));
  dom.selectedNode.innerHTML = "";
  for (const node of sortedNodes) {
    const option = document.createElement("option");
    option.value = node.id;
    option.textContent = `${node.name} (${node.type})`;
    dom.selectedNode.appendChild(option);
  }
  dom.selectedNode.value = selectedNodeId;
}

function renderEndpointSelects() {
  const endpoints = listEndpoints(state);
  const populateSelect = (select, includeAllNodes) => {
    if (!select) {
      return;
    }
    const previousValue = select.value;
    select.innerHTML = "";
    for (const endpoint of endpoints) {
      const option = document.createElement("option");
      option.value = `${endpoint.nodeId}|${endpoint.interfaceId}`;
      option.textContent = endpoint.label;
      select.appendChild(option);
    }
    if (includeAllNodes) {
      const seen = new Set();
      for (const endpoint of endpoints) {
        if (seen.has(endpoint.nodeId)) {
          continue;
        }
        seen.add(endpoint.nodeId);
        const option = document.createElement("option");
        option.value = `${endpoint.nodeId}|*`;
        option.textContent = `${endpoint.label.split(" :: ")[0]} :: ALL`;
        select.appendChild(option);
      }
    }
    select.value = previousValue && [...select.options].some((opt) => opt.value === previousValue)
      ? previousValue
      : select.options[0]?.value || "";
  };

  populateSelect(dom.addLinkForm.elements.srcInterface, false);
  populateSelect(dom.addLinkForm.elements.dstInterface, true);
  populateSelect(dom.simSrc, false);
  populateSelect(dom.simDst, false);
}

function renderConnectionSelect() {
  dom.connectionSelect.innerHTML = "";
  for (const link of [...state.links].sort((a, b) => a.id.localeCompare(b.id))) {
    const option = document.createElement("option");
    option.value = link.id;
    option.textContent = buildConnectionLabel(state, link);
    dom.connectionSelect.appendChild(option);
  }
}

function renderConnectionsTab(host) {
  if (!dom.connectionsInterfaceSelect || !dom.connectionsSelect) {
    return;
  }

  dom.connectionsInterfaceSelect.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No interface selected";
  dom.connectionsInterfaceSelect.appendChild(noneOption);
  for (const iface of host.interfaces) {
    const option = document.createElement("option");
    option.value = iface.id;
    option.textContent = iface.name || iface.id;
    dom.connectionsInterfaceSelect.appendChild(option);
  }
  dom.connectionsInterfaceSelect.value = hostConfigState.connectionInterfaceId || "";

  const activeInterfaceId = dom.connectionsInterfaceSelect.value;
  dom.connectionsSelect.innerHTML = "";
  if (!activeInterfaceId) {
    dom.connectionsSelect.disabled = true;
    dom.connectionNewBtn.disabled = true;
    dom.connectionEditBtn.disabled = true;
    dom.connectionDeleteBtn.disabled = true;
    return;
  }

  const allowedProtocols = new Set(["tcp", "udp", "icmp"]);
  const related = state.links.filter((link) => {
    const isAttached = (link.srcNodeId === host.id && link.srcInterfaceId === activeInterfaceId) ||
      (link.dstNodeId === host.id && link.dstInterfaceId === activeInterfaceId);
    const protocol = String(link.protocol || link.linkType || "").toLowerCase();
    return isAttached && allowedProtocols.has(protocol);
  });
  for (const link of related) {
    const option = document.createElement("option");
    option.value = link.id;
    option.textContent = buildConnectionLabel(state, link);
    dom.connectionsSelect.appendChild(option);
  }

  if (related.length && !related.find((link) => link.id === hostConfigState.connectionId)) {
    hostConfigState.connectionId = related[0].id;
  }
  dom.connectionsSelect.value = hostConfigState.connectionId || "";
  dom.connectionsSelect.disabled = false;
  dom.connectionNewBtn.disabled = false;
  dom.connectionEditBtn.disabled = !dom.connectionsSelect.value;
  dom.connectionDeleteBtn.disabled = !dom.connectionsSelect.value;
}

function openLinkEditorForNew(srcNodeId, srcInterfaceId) {
  linkEditorState.mode = "new";
  linkEditorState.linkId = "";
  dom.addLinkForm.reset();
  renderEndpointSelects();
  dom.addLinkForm.elements.srcInterface.value = `${srcNodeId}|${srcInterfaceId}`;
  dom.addLinkForm.elements.protocol.value = "tcp";
  dom.addLinkForm.elements.linkType.value = "tcp";
  dom.addLinkForm.elements.ports.value = "";
  dom.addLinkForm.elements.description.value = "";
  syncLinkFormUi();
  connectionsModal.open();
}

function openLinkEditorForEdit(link) {
  linkEditorState.mode = "edit";
  linkEditorState.linkId = link.id;
  dom.addLinkForm.reset();
  renderEndpointSelects();
  dom.addLinkForm.elements.srcInterface.value = `${link.srcNodeId}|${link.srcInterfaceId}`;
  dom.addLinkForm.elements.dstInterface.value = `${link.dstNodeId}|${link.dstInterfaceId}`;
  const safeProtocol = ["tcp", "udp", "icmp"].includes(link.protocol) ? link.protocol : "tcp";
  dom.addLinkForm.elements.protocol.value = safeProtocol;
  dom.addLinkForm.elements.linkType.value = link.linkType || safeProtocol;
  dom.addLinkForm.elements.ports.value = link.ports || "";
  dom.addLinkForm.elements.srcPort.value = link.sourcePort || "";
  dom.addLinkForm.elements.description.value = link.description || "";
  syncLinkFormUi();
  connectionsModal.open();
}

function renderModelJson() {
  dom.modelOutput.textContent = JSON.stringify(state, null, 2);
}

function onSelectNode(nodeId) {
  if (multiSelectMode) {
    toggleMultiSelected(nodeId);
    return;
  }
  selectedNodeId = nodeId;
  multiSelectedIds = [nodeId];
  if ([...dom.selectedNode.options].some((option) => option.value === nodeId)) {
    dom.selectedNode.value = nodeId;
  }
  renderAll();
}

function onMoveNode(nodeId, x, y) {
  const node = findNode(state, nodeId);
  if (!node) {
    return;
  }
  node.x = x;
  node.y = y;
  saveToLocalStorage(state);
  renderAll();
}

function toggleMultiSelected(nodeId) {
  const idx = multiSelectedIds.indexOf(nodeId);
  if (idx >= 0) {
    multiSelectedIds.splice(idx, 1);
  } else {
    multiSelectedIds.push(nodeId);
  }
  if (!multiSelectedIds.length) {
    selectedNodeId = "";
  } else {
    selectedNodeId = multiSelectedIds[0];
  }
  if ([...dom.selectedNode.options].some((option) => option.value === selectedNodeId)) {
    dom.selectedNode.value = selectedNodeId;
  }
  updateMultiSelectStatus();
  renderAll();
}

function setMultiSelectMode(enabled) {
  multiSelectMode = enabled;
  if (!enabled) {
    multiSelectedIds = selectedNodeId ? [selectedNodeId] : [];
  } else if (!multiSelectedIds.length && selectedNodeId) {
    multiSelectedIds = [selectedNodeId];
  }
  dom.multiSelectBtn?.classList.toggle("active", enabled);
  updateMultiSelectStatus();
  renderAll();
}

function updateMultiSelectStatus() {
  if (!dom.multiSelectStatus) {
    return;
  }
  const label = multiSelectMode
    ? multiSelectedIds.length
      ? `${multiSelectedIds.length} node(s) selected`
      : "Select nodes"
    : "Single-node view";
  dom.multiSelectStatus.textContent = label;
}

function runValidation() {
  const warnings = validateTopology(state);
  dom.validationOutput.innerHTML = "";
  warnings.forEach((warning) => {
    const item = document.createElement("li");
    item.textContent = warning;
    dom.validationOutput.appendChild(item);
  });
}

function runSimulation() {
  const srcValue = dom.simSrc.value;
  const dstValue = dom.simDst.value;
  if (!srcValue || !dstValue) {
    dom.simulationOutput.textContent = "Simulation requires source and destination endpoints.";
    return;
  }

  const src = parseEndpointSelection(srcValue);
  const dst = parseEndpointSelection(dstValue);
  dom.simulationOutput.textContent = simulateFlow(
    state,
    src.nodeId,
    src.interfaceId,
    dst.nodeId,
    dst.interfaceId,
    dom.simProto.value,
    dom.simPort.value,
    "",
  );
}

function syncInterfaceFormUi() {
  const kind = dom.addInterfaceForm.elements.kind.value;
  const isWireGuard = kind === "wireguard";
  setRowVisible(dom.ifaceAllowedIpsRow, isWireGuard);
  setRowVisible(dom.ifaceListenPortRow, isWireGuard);
  if (!isWireGuard) {
    dom.addInterfaceForm.elements.allowedIps.value = "";
    dom.addInterfaceForm.elements.listenPort.value = "";
  }
}

function syncLinkFormUi() {
  const linkType = dom.addLinkForm.elements.linkType.value;
  const protocolField = dom.addLinkForm.elements.protocol;
  const natField = dom.addLinkForm.elements.natMode;
  const policyField = dom.addLinkForm.elements.policyTable;
  const portsField = dom.addLinkForm.elements.ports;

  if (linkType === "wireguard") {
    protocolField.value = "udp";
  } else if (linkType === "routed" || linkType === "nat-boundary") {
    protocolField.value = "any";
  } else if (linkType === "icmp") {
    protocolField.value = "icmp";
  } else if (linkType === "tcp" || linkType === "firewall-boundary") {
    protocolField.value = "tcp";
  } else if (linkType === "udp") {
    protocolField.value = "udp";
  }

  const protocol = protocolField.value;
  const showPorts = protocol === "tcp" || protocol === "udp";

  setRowVisible(dom.linkTypeRow, false);
  setRowVisible(dom.linkProtocolRow, true);
  setRowVisible(dom.linkPortsRow, showPorts);
  setRowVisible(dom.linkSrcPortRow, showPorts);
  setRowVisible(dom.linkPolicyRow, false);
  setRowVisible(dom.linkNatRow, false);
  setRowVisible(dom.linkConntrackRow, false);

  protocolField.disabled = false;
  dom.addLinkForm.elements.linkType.value = protocol;
  if (!showPorts) {
    portsField.value = "";
    dom.addLinkForm.elements.srcPort.value = "";
  }
  policyField.value = "";
  natField.value = "none";
  dom.addLinkForm.elements.conntrack.checked = true;
}

function normalizeLinkInput(formData) {
  const linkType = String(formData.get("linkType"));
  let protocol = String(formData.get("protocol"));
  let ports = String(formData.get("ports")).trim();
  let sourcePort = String(formData.get("srcPort") || "").trim();
  let natMode = String(formData.get("natMode"));
  let policyTable = String(formData.get("policyTable")).trim();
  let conntrack = formData.get("conntrack") === "on";

  if (linkType === "wireguard") {
    protocol = "udp";
    natMode = "none";
    conntrack = true;
  } else if (linkType === "routed" || linkType === "nat-boundary") {
    protocol = "any";
    ports = "";
  } else if (linkType === "icmp") {
    protocol = "icmp";
    ports = "";
  } else if (linkType === "tcp") {
    protocol = "tcp";
  } else if (linkType === "udp") {
    protocol = "udp";
  }

  if (linkType === "firewall-boundary") {
    natMode = "none";
    policyTable = "";
  }

  if (protocol !== "tcp" && protocol !== "udp") {
    ports = "";
    sourcePort = "";
  }

  return { protocol, ports, sourcePort, natMode, policyTable, conntrack };
}

function getActiveHost() {
  return findNode(state, hostConfigState.hostId);
}

function getActiveInterface() {
  const host = getActiveHost();
  if (!host) {
    return null;
  }
  return findIfaceOnNode(host, hostConfigState.interfaceId);
}

function markHostConfigDirty() {
  const hostModal = document.getElementById("host-config-modal");
  if (!hostModal || !hostModal.classList.contains("open")) {
    return;
  }
  hostModalDirty = true;
}

function saveHostModalDrafts() {
  const host = getActiveHost();
  if (!host) {
    hostModalDirty = false;
    return true;
  }

  if (dom.nodeConfigNameInput) {
    const name = dom.nodeConfigNameInput.value.trim();
    if (name) {
      host.name = name;
    }
  }
  if (dom.nodeConfigTypeSelect?.value) {
    host.type = dom.nodeConfigTypeSelect.value;
  }
  if (dom.nodeConfigTrustSelect?.value) {
    host.trust = dom.nodeConfigTrustSelect.value;
  }

  host.defaults.inbound = dom.hostDefaultInbound.value;
  host.defaults.outbound = dom.hostDefaultOutbound.value;
  host.defaults.routed = dom.hostDefaultRouted.value;

  const child = findChild(host, hostConfigState.childId);
  if (child) {
    child.name = dom.childNameInput.value.trim() || child.name;
    child.kind = dom.childKindInput.value;
    child.bindInterfaceId = dom.childBindInterfaceSelect.value;
    const childNode = ensureChildNode(host, child);
    childNode.name = child.name;
    childNode.type = nodeTypeForChildKind(child.kind);
  }

  persistAndRender();
  renderHostConfigurationModal();
  hostModalDirty = false;
  return true;
}

function handleHostModalBeforeClose(reason) {
  const closeChildren = () => {
    interfaceModal.close();
    ruleModal.close();
    interfaceImportModal.close();
    firewallImportModal.close();
  };

  if (!hostModalDirty) {
    closeChildren();
    return true;
  }
  if (reason !== "backdrop" && reason !== "button") {
    closeChildren();
    return true;
  }
  const shouldSave = window.confirm(
    "Save changes before closing configuration?\\n\\nPress OK to save and close, or Cancel to keep editing.",
  );
  if (!shouldSave) {
    return false;
  }
  const saved = saveHostModalDrafts();
  if (saved) {
    closeChildren();
  }
  return saved;
}

function openHostConfiguration() {
  const nodeId = selectedNodeId || dom.selectedNode.value;
  openHostConfigurationForNode(nodeId);
}

function syncHostInterfaceFormUi() {
  const kind = dom.ifaceKindInput.value;
  const mode = dom.ifaceAddressModeInput.value;
  const isStatic = mode === "static";
  const isWireguard = kind === "wireguard";
  const isBridge = kind === "bridge";
  const isVirtual = kind === "virtual";

  setRowVisible(dom.ifaceIpRow, isStatic);
  setRowVisible(dom.ifaceNetmaskRow, isStatic);
  setRowVisible(dom.ifaceCidrRow, isStatic);
  setRowVisible(dom.ifaceBroadcastRow, isStatic);
  setRowVisible(dom.ifaceGatewayRow, isStatic);
  setRowVisible(dom.ifaceVirtualModeRow, isVirtual);
  setRowVisible(dom.ifaceBridgedRow, isBridge);
  setRowVisible(dom.ifaceAllowedIpsRowModal, isWireguard);
  setRowVisible(dom.ifaceListenPortRowModal, isWireguard);
}

function closeInterfaceConfigModal() {
  interfaceModal.requestClose("button");
}

function closeRuleConfigModal() {
  ruleModal.requestClose("button");
}

function openInterfaceConfigModal(mode) {
  const host = getActiveHost();
  if (!host) {
    return;
  }
  interfaceEditorState.mode = mode;
  interfaceEditorState.interfaceId = hostConfigState.interfaceId;

  if (mode === "new") {
    const draft = createHostInterface();
    dom.interfaceModalTitle.textContent = "New Interface";
    renderHostInterfaceForm(host, draft);
  } else {
    const iface = getActiveInterface();
    if (!iface) {
      alert("Select an interface first.");
      return;
    }
    interfaceEditorState.interfaceId = iface.id;
    dom.interfaceModalTitle.textContent = `Edit Interface: ${iface.name || iface.id}`;
    renderHostInterfaceForm(host, iface);
  }
  interfaceModal.open();
}

function openRuleConfigModal(mode) {
  const host = getActiveHost();
  const iface = getActiveInterface() || host?.interfaces?.[0] || null;
  if (!host) {
    alert("Select a host first.");
    return;
  }

  ruleEditorState.mode = mode;
  ruleEditorState.ruleId = hostConfigState.ruleId;
  dom.ruleModalTitle.textContent = mode === "new"
    ? "New Host Firewall Rule"
    : `Edit Host Firewall Rule${iface?.name ? ` (${iface.name})` : ""}`;

  if (mode === "edit" && !findRule(host, ruleEditorState.ruleId)) {
    alert("Select a rule first.");
    return;
  }

  if (mode === "new") {
    hostConfigState.ruleId = "";
  }
  renderRuleForm(host, iface);
  if (mode === "edit") {
    hostConfigState.ruleId = ruleEditorState.ruleId;
  }
  ruleModal.open();
}

function renderHostInterfaces(host) {
  dom.hostInterfaceSelect.innerHTML = "";
  for (const iface of host.interfaces) {
    const option = document.createElement("option");
    option.value = iface.id;
    option.textContent = `${iface.name || iface.id} (${iface.kind}, ${interfaceDisplayAddress(iface)})`;
    dom.hostInterfaceSelect.appendChild(option);
  }
  if (!host.interfaces.length) {
    hostConfigState.interfaceId = "";
    return;
  }
  if (!findIfaceOnNode(host, hostConfigState.interfaceId)) {
    hostConfigState.interfaceId = host.interfaces[0].id;
  }
  dom.hostInterfaceSelect.value = hostConfigState.interfaceId;
}

function renderHostInterfaceForm(host, iface) {
  if (!iface) {
    dom.hostInterfaceForm.reset();
    return;
  }

  dom.ifaceNameInput.value = iface.name || "";
  dom.ifaceKindInput.value = iface.kind || "physical";
  dom.ifaceAddressModeInput.value = iface.addressMode || "static";
  dom.ifaceIpInput.value = iface.ip || "";
  dom.ifaceNetmaskInput.value = iface.netmask || "";
  dom.ifaceCidrInput.value = iface.cidr || "";
  dom.ifaceBroadcastInput.value = iface.broadcast || "";
  dom.ifaceGatewayInput.value = iface.gateway || "";
  dom.ifaceStateInput.value = iface.state || "up";
  dom.ifaceVirtualModeInput.value = iface.virtualMode || "vlan";
  dom.ifaceBridgedInput.value = iface.bridgedInterfaces || "";
  dom.ifaceAllowedIpsInput.value = iface.allowedIps || "";
  dom.ifaceListenPortInput.value = iface.listenPort || "";
  syncHostInterfaceFormUi();
}

function getRulePeerOptions(host, iface) {
  const peers = getTransitiveReachableEndpoints(state, host.id, iface.id);
  return peers;
}

function interfaceAddressValue(iface) {
  return (iface?.cidr || iface?.ip || "").trim();
}

function setSelectOptions(select, options, preferredValue = "") {
  const previousValue = preferredValue || select.value;
  select.innerHTML = "";
  for (const optionValue of options) {
    const option = document.createElement("option");
    option.value = optionValue.value;
    option.textContent = optionValue.label;
    select.appendChild(option);
  }
  const canUsePrevious = [...select.options].some((option) => option.value === previousValue);
  select.value = canUsePrevious ? previousValue : (select.options[0]?.value || "");
}

function syncRuleFormUi() {
  const ruleType = dom.ruleTypeInput.value;
  const protocol = dom.ruleProtocolInput.value;
  const isRouteMode = ruleType === "forward" || ruleType === "routed";
  const showPorts = protocol === "tcp" || protocol === "udp";

  setRowVisible(dom.ruleSingleInterfaceRow, !isRouteMode);
  setRowVisible(dom.ruleInInterfaceRow, isRouteMode);
  setRowVisible(dom.ruleOutInterfaceRow, isRouteMode);
  setRowVisible(dom.ruleFromPortRow, showPorts);
  setRowVisible(dom.ruleToPortRow, showPorts);

  if (!showPorts) {
    dom.ruleFromPortInput.value = "";
    dom.ruleToPortInput.value = "";
  }
}

function renderRuleSelect(host) {
  dom.hostRuleSelect.innerHTML = "";
  const rules = host?.firewallRules || [];
  for (const rule of rules) {
    const option = document.createElement("option");
    option.value = rule.id;
    const fromPart = rule.fromAddress || "any";
    const toPart = rule.toAddress || "any";
    const portPart = rule.toPort || rule.port || "";
    option.textContent = `${rule.type} ${rule.action} ${rule.protocol} ${fromPart} -> ${toPart}${portPart ? `:${portPart}` : ""}`;
    dom.hostRuleSelect.appendChild(option);
  }
  if (!rules.length) {
    hostConfigState.ruleId = "";
    return;
  }
  if (!findRule(host, hostConfigState.ruleId)) {
    hostConfigState.ruleId = rules[0].id;
  }
  dom.hostRuleSelect.value = hostConfigState.ruleId;
}

function renderRuleForm(host, iface) {
  const selectedIface = iface || host?.interfaces?.[0] || null;
  const hostInterfaces = (host?.interfaces || []).map((item) => ({
    value: item.id,
    label: item.name || item.id,
  }));
  const ifaceOptions = [{ value: "", label: "Any interface" }, ...hostInterfaces];
  setSelectOptions(dom.ruleInterfaceSelect, ifaceOptions);
  setSelectOptions(dom.ruleInInterfaceSelect, ifaceOptions);
  setSelectOptions(dom.ruleOutInterfaceSelect, ifaceOptions);

  const peers = selectedIface ? getRulePeerOptions(host, selectedIface) : [];
  const peerAddressOptions = peers.map((peer) => ({
    value: peer.ip || "",
    label: `${peer.label}${peer.ip ? ` (${peer.ip})` : ""}`,
  }));
  const hostAddressOptions = (host?.interfaces || [])
    .map((item) => interfaceAddressValue(item))
    .filter(Boolean)
    .map((value) => ({ value, label: value }));

  setSelectOptions(
    dom.ruleFromEndpointSelect,
    [{ value: "", label: "Any" }, ...peerAddressOptions],
  );
  setSelectOptions(
    dom.ruleToEndpointSelect,
    [{ value: "", label: "Any" }, ...hostAddressOptions, ...peerAddressOptions],
  );

  if (!host) {
    dom.hostRuleForm.reset();
    syncRuleFormUi();
    return;
  }

  const rule = findRule(host, hostConfigState.ruleId);
  if (!rule) {
    dom.ruleTypeInput.value = "inbound";
    dom.ruleActionInput.value = "allow";
    dom.ruleProtocolInput.value = "tcp";
    dom.ruleInterfaceSelect.value = selectedIface?.id || "";
    dom.ruleInInterfaceSelect.value = selectedIface?.id || "";
    dom.ruleOutInterfaceSelect.value = "";
    dom.ruleFromEndpointSelect.value = "";
    dom.ruleToEndpointSelect.value = "";
    dom.ruleFromAddressInput.value = "";
    dom.ruleToAddressInput.value = "";
    dom.ruleFromPortInput.value = "";
    dom.ruleToPortInput.value = "";
    dom.ruleDescriptionInput.value = "";
    syncRuleFormUi();
    return;
  }

  dom.ruleTypeInput.value = rule.type || "inbound";
  dom.ruleActionInput.value = rule.action || "allow";
  dom.ruleProtocolInput.value = rule.protocol || "tcp";
  dom.ruleInterfaceSelect.value = rule.interfaceId || selectedIface?.id || "";
  dom.ruleInInterfaceSelect.value = rule.inInterfaceId || selectedIface?.id || "";
  dom.ruleOutInterfaceSelect.value = rule.outInterfaceId || "";
  dom.ruleFromAddressInput.value = rule.fromAddress || "";
  dom.ruleToAddressInput.value = rule.toAddress || "";
  dom.ruleFromPortInput.value = rule.fromPort || "";
  dom.ruleToPortInput.value = rule.toPort || rule.port || "";
  dom.ruleDescriptionInput.value = rule.description || "";
  dom.ruleFromEndpointSelect.value = [...dom.ruleFromEndpointSelect.options].some((option) => option.value === dom.ruleFromAddressInput.value)
    ? dom.ruleFromAddressInput.value
    : "";
  dom.ruleToEndpointSelect.value = [...dom.ruleToEndpointSelect.options].some((option) => option.value === dom.ruleToAddressInput.value)
    ? dom.ruleToAddressInput.value
    : "";
  syncRuleFormUi();
}

function syncTestUi(skipInterfaces = false) {
  const host = getActiveHost();
  if (!host) {
    dom.interfaceTestStatus.textContent = "Select an interface to test connectivity.";
    dom.interfaceTestOutput.textContent = "";
    return;
  }

  dom.testSourceSelect.innerHTML = "";
  for (const iface of host.interfaces) {
    const option = document.createElement("option");
    option.value = iface.id;
    option.textContent = iface.name || iface.id;
    dom.testSourceSelect.appendChild(option);
  }
  if (!host.interfaces.length) {
    dom.interfaceTestStatus.textContent = "No interfaces available for this host.";
    dom.interfaceTestOutput.textContent = "";
    return;
  }
  if (!dom.testSourceSelect.value) {
    dom.testSourceSelect.value = host.interfaces[0].id;
  }
  const sourceInterfaceId = dom.testSourceSelect.value;

  const destinations = getTransitiveReachableEndpoints(state, host.id, sourceInterfaceId);
  const previousDestination = dom.testDestinationSelect.value;
  const shouldRebuild = !skipInterfaces ||
    !dom.testDestinationSelect.options.length ||
    dom.testDestinationSelect.dataset.sourceId !== sourceInterfaceId;
  if (shouldRebuild) {
    dom.testDestinationSelect.innerHTML = "";
    dom.testDestinationSelect.dataset.sourceId = sourceInterfaceId;
    for (const endpoint of destinations) {
      const encodedInterfaceId = encodeURIComponent(endpoint.interfaceId);
      const existingInterfacesDom = dom.testDestinationSelect.querySelectorAll(
        `[data-interface="${encodedInterfaceId}"]`,
      );
      if (existingInterfacesDom.length === 0) {
        const option = document.createElement("option");
        option.value = `${endpoint.nodeId}|${endpoint.interfaceId}`;
        option.textContent = endpoint.label;
        option.setAttribute("data-interface", encodedInterfaceId);
        dom.testDestinationSelect.appendChild(option);
      }
    }
  }

  if (!destinations.length) {
    dom.interfaceTestStatus.textContent = "This interface cannot connect to any other interface.";
    dom.interfaceTestOutput.textContent = "No routed/tunneled path discovered from this interface.";
    return;
  }

  const hasPrevious = [...dom.testDestinationSelect.options].some((option) => option.value === previousDestination);
  const destination = hasPrevious
    ? previousDestination
    : `${destinations[0].nodeId}|${destinations[0].interfaceId}`;
  dom.testDestinationSelect.value = destination;
  const { nodeId: dstNodeId, interfaceId: dstInterfaceId } = parseEndpointSelection(destination);
  const protocol = dom.testProtocolSelect.value;

  const showPort = protocol === "tcp" || protocol === "udp";
  setRowVisible(dom.testPortRow, showPort);
  setRowVisible(dom.testCustomPortRow, showPort && dom.testPortSelect.value === "custom");

  dom.testPortSelect.innerHTML = "";
  if (showPort) {
    const openPorts = getOpenPortsForDestination(state, dstNodeId, dstInterfaceId, protocol);
    for (const port of openPorts) {
      const option = document.createElement("option");
      option.value = port;
      option.textContent = port;
      dom.testPortSelect.appendChild(option);
    }

    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    dom.testPortSelect.appendChild(customOption);

    const routeExists = destinations.some((endpoint) => endpoint.nodeId === dstNodeId && endpoint.interfaceId === dstInterfaceId);
    if (!openPorts.length && !routeExists) {
      dom.interfaceTestStatus.textContent = "This interface cannot connect to any other interface.";
      dom.interfaceTestOutput.textContent = "No open ports found and no routing path exists to destination.";
    } else {
      dom.interfaceTestStatus.textContent = `Detected ${openPorts.length} allowed/open ${protocol.toUpperCase()} port(s).`;
      dom.interfaceTestOutput.textContent = "Ready to run interface test.";
    }
  } else {
    dom.interfaceTestStatus.textContent = "ICMP test ready.";
    dom.interfaceTestOutput.textContent = "Ready to run interface test.";
  }

  setRowVisible(dom.testCustomPortRow, showPort && dom.testPortSelect.value === "custom");
}

function runInterfaceTest(event) {
  event.preventDefault();
  const host = getActiveHost();
  if (!host) {
    return;
  }

  const sourceInterfaceId = dom.testSourceSelect.value;
  if (!sourceInterfaceId) {
    dom.interfaceTestOutput.textContent = "Select a source interface to trace.";
    return;
  }

  const destinationValue = dom.testDestinationSelect.value;
  if (!destinationValue) {
    dom.interfaceTestOutput.textContent = "No reachable destination interface available.";
    return;
  }

  const { nodeId: dstNodeId, interfaceId: dstInterfaceId } = parseEndpointSelection(destinationValue);
  const protocol = dom.testProtocolSelect.value;
  let port = "";
  const sourcePort = dom.testSourcePortInput.value.trim();

  if (protocol === "tcp" || protocol === "udp") {
    port = dom.testPortSelect.value === "custom" ? dom.testCustomPortInput.value.trim() : dom.testPortSelect.value;
    if (!port) {
      dom.interfaceTestOutput.textContent = "Select or enter a destination port for TCP/UDP tests.";
      return;
    }
  }

  dom.interfaceTestOutput.textContent = simulateFlow(
    state,
    host.id,
    sourceInterfaceId,
    dstNodeId,
    dstInterfaceId,
    protocol,
    port,
    sourcePort,
  );
}

function renderChildSection(host) {
  dom.childForm.classList.toggle("form-row-hidden", !hostSupportsChildren(host));
  if (!hostSupportsChildren(host)) {
    return;
  }

  dom.childSelect.innerHTML = "";
  for (const child of host.children) {
    const childNode = child.nodeId ? findNode(state, child.nodeId) : null;
    const kind = childNode ? childKindForNodeType(childNode.type) : (child.kind || "container");
    const option = document.createElement("option");
    option.value = child.id;
    option.textContent = `${childNode?.name || child.name || child.id} (${kind})`;
    dom.childSelect.appendChild(option);
  }

  if (host.children.length && !findChild(host, hostConfigState.childId)) {
    hostConfigState.childId = host.children[0].id;
  }
  dom.childSelect.value = hostConfigState.childId;

  dom.childBindInterfaceSelect.innerHTML = "";
  for (const iface of host.interfaces) {
    const option = document.createElement("option");
    option.value = iface.id;
    option.textContent = iface.name || iface.id;
    dom.childBindInterfaceSelect.appendChild(option);
  }

  const child = findChild(host, hostConfigState.childId);
  if (!child) {
    dom.childNameInput.value = "";
    dom.childKindInput.value = "container";
    dom.childVisibilityNote.textContent = "Create a child workload to bind host interfaces and inherit visibility.";
    return;
  }

  const childNode = child.nodeId ? findNode(state, child.nodeId) : null;
  const selectedChildKind = childNode ? childKindForNodeType(childNode.type) : (child.kind || "container");
  dom.childNameInput.value = childNode?.name || child.name || "";
  dom.childKindInput.value = selectedChildKind;
  const bindTarget = child.bindInterfaceId || host.interfaces[0]?.id || "";
  dom.childBindInterfaceSelect.value = [...dom.childBindInterfaceSelect.options].some((option) => option.value === bindTarget)
    ? bindTarget
    : "";

  const visible = childVisibleEndpoints(state, host, child);
  const relation = childNode ? findParentChildRelation(state, childNode.id) : null;
  const relationNote = relation?.child?.bindInterfaceId ? `bound via ${relation.child.bindInterfaceId}` : "no bind interface selected";
  dom.childVisibilityNote.textContent = `${visible.length} endpoint(s) visible to child (${relationNote}).`;
}

function renderHostConfigurationModal() {
  const host = getActiveHost();
  if (!host) {
    return;
  }
  ensureNodeConfig(host);

  dom.modalTitle.textContent = `Host Configuration: ${host.name}`;
  if (dom.nodeConfigNameInput) {
    dom.nodeConfigNameInput.value = host.name || "";
  }
  if (dom.nodeConfigTypeSelect) {
    dom.nodeConfigTypeSelect.value = host.type || "Router / Gateway";
  }
  if (dom.nodeConfigTrustSelect) {
    dom.nodeConfigTrustSelect.value = host.trust || "private";
  }

  dom.hostDefaultInbound.value = host.defaults.inbound;
  dom.hostDefaultOutbound.value = host.defaults.outbound;
  dom.hostDefaultRouted.value = host.defaults.routed;

  renderHostInterfaces(host);
  const iface = getActiveInterface();
  if (iface) {
    dom.hostInterfaceSummary.textContent = [
      `Type=${iface.kind}`,
      `Address=${interfaceDisplayAddress(iface)}`,
      `State=${iface.state || "up"}`,
      iface.addressMode === "dhcp" ? "Mode=DHCP" : "Mode=Static",
    ].join(" | ");
  } else {
    dom.hostInterfaceSummary.textContent = "No interface selected.";
  }

  renderRuleSelect(host);
  const selectedRule = findRule(host, hostConfigState.ruleId);
  if (selectedRule) {
    const fromPart = selectedRule.fromAddress || "any";
    const toPart = selectedRule.toAddress || "any";
    const portPart = selectedRule.toPort || selectedRule.port || "";
    dom.hostRuleSummary.textContent = `${selectedRule.type} ${selectedRule.action} ${selectedRule.protocol} ${fromPart} -> ${toPart}${portPart ? `:${portPart}` : ""}`;
  } else {
    dom.hostRuleSummary.textContent = "No rule selected.";
  }

  renderConnectionsTab(host);
  syncTestUi();
  renderChildSection(host);

  const setup = generateNodeSetup(state, host.id);
  dom.firewallPre.textContent = setup.firewall;
  dom.routingPre.textContent = setup.routing;
  dom.wireguardPre.textContent = setup.wireguard;
}

function updateHostConfigFromForm() {
  const host = getActiveHost();
  if (!host) {
    return;
  }
  const name = dom.nodeConfigNameInput?.value.trim();
  const type = dom.nodeConfigTypeSelect?.value;
  const trust = dom.nodeConfigTrustSelect?.value;
  if (name) {
    host.name = name;
  }
  if (type) {
    host.type = type;
  }
  if (trust) {
    host.trust = trust;
  }
  persistAndRender();
  renderHostConfigurationModal();
}

function updateInterfaceFromForm(iface) {
  iface.name = dom.ifaceNameInput.value.trim();
  iface.kind = dom.ifaceKindInput.value;
  iface.addressMode = dom.ifaceAddressModeInput.value;
  iface.ip = dom.ifaceIpInput.value.trim();
  iface.netmask = dom.ifaceNetmaskInput.value.trim();
  iface.cidr = dom.ifaceCidrInput.value.trim();
  iface.broadcast = dom.ifaceBroadcastInput.value.trim();
  iface.gateway = dom.ifaceGatewayInput.value.trim();
  iface.state = dom.ifaceStateInput.value;
  iface.virtualMode = dom.ifaceVirtualModeInput.value;
  iface.bridgedInterfaces = dom.ifaceBridgedInput.value.trim();
  iface.allowedIps = dom.ifaceAllowedIpsInput.value.trim();
  iface.listenPort = dom.ifaceListenPortInput.value.trim();

  if (iface.addressMode === "static" && !iface.cidr) {
    iface.cidr = buildCidr(iface.ip, iface.netmask);
  }

  ensureInterfaceConfig(iface);
}

function updateRuleObjectFromForm(rule) {
  rule.type = dom.ruleTypeInput.value;
  rule.action = dom.ruleActionInput.value;
  rule.protocol = dom.ruleProtocolInput.value;
  const isRouteMode = rule.type === "forward" || rule.type === "routed";
  rule.interfaceId = isRouteMode ? "" : dom.ruleInterfaceSelect.value;
  rule.inInterfaceId = isRouteMode ? dom.ruleInInterfaceSelect.value : "";
  rule.outInterfaceId = isRouteMode ? dom.ruleOutInterfaceSelect.value : "";
  rule.fromAddress = dom.ruleFromAddressInput.value.trim();
  rule.toAddress = dom.ruleToAddressInput.value.trim();
  rule.fromPort = dom.ruleFromPortInput.value.trim();
  rule.toPort = dom.ruleToPortInput.value.trim();
  rule.port = rule.toPort;
  rule.description = dom.ruleDescriptionInput.value.trim();

  if (rule.protocol === "icmp" || rule.protocol === "any") {
    rule.fromPort = "";
    rule.toPort = "";
    rule.port = "";
  }

  if (!rule.fromAddress || rule.fromAddress.toLowerCase() === "any") {
    rule.fromAddress = "";
  }
  if (!rule.toAddress || rule.toAddress.toLowerCase() === "any") {
    rule.toAddress = "";
  }
}

function syncHostLinksForInterfaces(host) {
  const allowedInterfaceIds = new Set((host.interfaces || []).map((iface) => iface.id));
  state.links = state.links.filter((link) => {
    if (link.srcNodeId === host.id && !allowedInterfaceIds.has(link.srcInterfaceId)) {
      return false;
    }
    if (link.dstNodeId === host.id && !allowedInterfaceIds.has(link.dstInterfaceId)) {
      return false;
    }
    return true;
  });
}

function syncHostRuleInterfaceBindings(host) {
  const allowedInterfaceIds = new Set((host.interfaces || []).map((iface) => iface.id));
  host.firewallRules = (host.firewallRules || []).map((rule) => {
    const nextRule = { ...rule };
    if (nextRule.interfaceId && !allowedInterfaceIds.has(nextRule.interfaceId)) {
      nextRule.interfaceId = "";
    }
    if (nextRule.inInterfaceId && !allowedInterfaceIds.has(nextRule.inInterfaceId)) {
      nextRule.inInterfaceId = "";
    }
    if (nextRule.outInterfaceId && !allowedInterfaceIds.has(nextRule.outInterfaceId)) {
      nextRule.outInterfaceId = "";
    }
    return nextRule;
  });
}

function applyImportedInterfaces(host, importedInterfaces) {
  const existingByName = new Map((host.interfaces || []).map((iface) => [(iface.name || "").trim(), iface]));
  const activeName = getActiveInterface()?.name || "";
  const nextInterfaces = [];

  for (const imported of importedInterfaces) {
    const importedName = (imported.name || "").trim();
    if (!importedName) {
      continue;
    }

    const target = existingByName.get(importedName) || createHostInterface();
    target.name = importedName;
    target.kind = imported.kind || target.kind;
    target.addressMode = imported.addressMode || (imported.ip || imported.cidr ? "static" : "dhcp");
    target.ip = imported.ip || "";
    target.netmask = imported.netmask || "";
    target.cidr = imported.cidr || "";
    target.broadcast = imported.broadcast || "";
    target.gateway = imported.gateway || "";
    target.state = imported.state || "up";
    ensureInterfaceConfig(target);
    nextInterfaces.push(target);
  }

  host.interfaces = nextInterfaces;
  syncHostLinksForInterfaces(host);
  syncHostRuleInterfaceBindings(host);

  const activeIface = host.interfaces.find((iface) => iface.name === activeName) || host.interfaces[0] || null;
  hostConfigState.interfaceId = activeIface?.id || "";
  hostConfigState.ruleId = host.firewallRules?.[0]?.id || "";
}

function applyImportedFirewallRules(host, importedRules) {
  if (!host.interfaces.length) {
    return { importedCount: 0, skippedCount: importedRules.length };
  }

  host.firewallRules = [];

  const interfaceByName = new Map(host.interfaces.map((iface) => [(iface.name || "").trim(), iface]));
  let importedCount = 0;
  let skippedCount = 0;

  for (const imported of importedRules) {
    const isRouteMode = imported.type === "forward" || imported.type === "routed";
    const interfaceName = (imported.interfaceName || "").trim();
    const inInterfaceName = (imported.inInterfaceName || "").trim();
    const outInterfaceName = (imported.outInterfaceName || "").trim();

    let hasUnresolvedInterface = false;
    if (!isRouteMode && interfaceName) {
      hasUnresolvedInterface = !interfaceByName.get(interfaceName);
    } else if (isRouteMode && inInterfaceName) {
      hasUnresolvedInterface = !interfaceByName.get(inInterfaceName);
    }
    if (isRouteMode && outInterfaceName && !interfaceByName.get(outInterfaceName)) {
      hasUnresolvedInterface = true;
    }

    if (hasUnresolvedInterface) {
      skippedCount += 1;
      continue;
    }

    const rule = createFirewallRule();
    rule.type = imported.type;
    rule.action = imported.action;
    rule.protocol = imported.protocol;
    rule.interfaceId = !isRouteMode && interfaceName ? (interfaceByName.get(interfaceName)?.id || "") : "";
    rule.inInterfaceId = isRouteMode && inInterfaceName ? (interfaceByName.get(inInterfaceName)?.id || "") : "";
    rule.outInterfaceId = isRouteMode && outInterfaceName ? (interfaceByName.get(outInterfaceName)?.id || "") : "";
    rule.fromAddress = imported.fromAddress || "";
    rule.toAddress = imported.toAddress || "";
    rule.fromPort = imported.fromPort || "";
    rule.toPort = imported.toPort || "";
    rule.port = rule.toPort;
    rule.description = imported.description || "";

    host.firewallRules.push(rule);
    importedCount += 1;
  }

  hostConfigState.ruleId = host.firewallRules?.[0]?.id || "";
  return { importedCount, skippedCount };
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

function cidrContainsIp(cidr, ip) {
  const parsed = parseCidr(cidr);
  const networkInt = parseIpv4(parsed.ip);
  const ipInt = parseIpv4(ip);
  const prefix = Number(parsed.mask);
  if (networkInt === null || ipInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  if (prefix === 0) {
    return true;
  }
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  return (networkInt & mask) === (ipInt & mask);
}

function interfaceIp(iface) {
  return (iface.ip || parseCidr(iface.cidr || "").ip || "").trim();
}

function interfaceMatchesDestination(iface, destination) {
  const target = String(destination || "").trim();
  const ifaceAddress = interfaceIp(iface);
  if (!target || !ifaceAddress) {
    return false;
  }
  if (target.includes("/")) {
    return cidrContainsIp(target, ifaceAddress);
  }
  return ifaceAddress === target;
}

function inferConnectionsFromImportedRoutes(host, routes) {
  if (!Array.isArray(routes) || !routes.length || !host.interfaces.length) {
    return 0;
  }

  const interfacesByName = new Map(host.interfaces.map((iface) => [(iface.name || "").trim(), iface]));
  const importedLinks = [];

  for (const route of routes) {
    const sourceInterface = interfacesByName.get((route.dev || "").trim());
    const destination = String(route.destination || "").trim();
    if (!sourceInterface || !destination || destination === "0.0.0.0/0") {
      continue;
    }

    for (const node of state.nodes) {
      if (node.id === host.id) {
        continue;
      }
      for (const candidate of node.interfaces || []) {
        if (!interfaceMatchesDestination(candidate, destination)) {
          continue;
        }

        const exists = state.links.some((link) =>
          link.srcNodeId === host.id &&
          link.srcInterfaceId === sourceInterface.id &&
          link.dstNodeId === node.id &&
          link.dstInterfaceId === candidate.id,
        );
        if (exists) {
          continue;
        }

        importedLinks.push(createLink({
          srcNodeId: host.id,
          srcInterfaceId: sourceInterface.id,
          dstNodeId: node.id,
          dstInterfaceId: candidate.id,
          linkType: "routed",
          protocol: "any",
          ports: "",
          natMode: "none",
          conntrack: true,
          policyTable: "",
          description: "Imported from route table",
        }));
      }
    }
  }

  if (importedLinks.length) {
    state.links.push(...importedLinks);
  }
  return importedLinks.length;
}

function addNodeToState({ name, type, trust }) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    return null;
  }
  const node = createNode({
    name: trimmedName,
    type: String(type || "Bare-metal host"),
    trust: String(trust || "private"),
    x: 70 + ((state.nodes.length * 95) % 700),
    y: 75 + ((state.nodes.length * 65) % 400),
  });
  ensureNodeConfig(node);
  state.nodes.push(node);
  selectedNodeId = node.id;
  return node;
}

function parseCapturedHostname(text) {
  const lines = String(text || "").split(/\r?\n/);
  let inHostnameSection = false;

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) {
      continue;
    }
    if (line === "__ROUTETOOL_HOSTNAME_BEGIN__") {
      inHostnameSection = true;
      continue;
    }
    if (line === "__ROUTETOOL_HOSTNAME_END__") {
      break;
    }
    if (!inHostnameSection) {
      continue;
    }
    if (line.startsWith("sudo:")) {
      continue;
    }
    const token = line.split(/\s+/)[0];
    if (/^[a-zA-Z0-9._-]+$/.test(token)) {
      return token;
    }
  }

  return "";
}

function importNodeFromCapturedOutput(captureText) {
  const { interfaces: importedInterfaces, warnings: interfaceWarnings } = parseInterfaceImport(captureText);
  const { defaults, rules, routes, warnings: firewallWarnings } = parseIptablesImport(captureText);

  if (!importedInterfaces.length && !rules.length && !routes.length && !Object.keys(defaults).length) {
    return {
      error: "No importable interface, firewall, or route data was detected in the pasted output.",
    };
  }

  const parsedName = parseCapturedHostname(captureText);
  const fallbackName = dom.nodeCreateName.value.trim() || `imported-node-${state.nodes.length + 1}`;
  const requestedType = dom.nodeCreateType.value || "Bare-metal host";
  const safeType = requestedType === "Container" ? "Bare-metal host" : requestedType;
  const trust = dom.nodeCreateTrust.value || "private";
  const node = addNodeToState({
    name: parsedName || fallbackName,
    type: safeType,
    trust,
  });

  if (!node) {
    return { error: "Unable to create imported node." };
  }

  if (importedInterfaces.length) {
    applyImportedInterfaces(node, importedInterfaces);
  }

  if (defaults.inbound) {
    node.defaults.inbound = defaults.inbound;
  }
  if (defaults.outbound) {
    node.defaults.outbound = defaults.outbound;
  }
  if (defaults.routed) {
    node.defaults.routed = defaults.routed;
  }

  const { importedCount, skippedCount } = applyImportedFirewallRules(node, rules);
  const importedConnections = inferConnectionsFromImportedRoutes(node, routes);

  persistAndRender();

  return {
    node,
    importedInterfaces: importedInterfaces.length,
    importedRules: importedCount,
    skippedRules: skippedCount,
    importedConnections,
    warnings: [...interfaceWarnings, ...firewallWarnings],
    forcedType: requestedType === "Container",
  };
}

function openNodeImportModalDialog() {
  if (dom.nodeImportCommandInput) {
    dom.nodeImportCommandInput.value = NODE_IMPORT_COMMAND;
  }
  if (dom.nodeImportOutput) {
    dom.nodeImportOutput.value = "";
  }
  if (dom.nodeImportStatus) {
    dom.nodeImportStatus.textContent = "Paste captured output and click Import to create and populate a node.";
  }
  nodeImportModal.open();
}

function attachEvents() {
  const dirtyFields = [
    dom.hostDefaultInbound,
    dom.hostDefaultOutbound,
    dom.hostDefaultRouted,
    dom.childNameInput,
    dom.childKindInput,
    dom.childBindInterfaceSelect,
  ].filter(Boolean);
  for (const field of dirtyFields) {
    field.addEventListener("input", markHostConfigDirty);
    field.addEventListener("change", markHostConfigDirty);
  }

  dom.openNodeCreateBtn.addEventListener("click", () => {
    dom.nodeCreateForm.reset();
    nodeCreateModal.open();
  });

  dom.openNodeImportBtn?.addEventListener("click", () => {
    openNodeImportModalDialog();
  });

  dom.cancelNodeCreateBtn.addEventListener("click", () => {
    nodeCreateModal.requestClose("button");
  });

  dom.nodeCreateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const node = addNodeToState({
      name: dom.nodeCreateName.value,
      type: dom.nodeCreateType.value,
      trust: dom.nodeCreateTrust.value,
    });
    if (!node) {
      return;
    }
    persistAndRender();
    nodeCreateModal.requestClose("button");
  });

  dom.cancelNodeImportBtn?.addEventListener("click", () => {
    nodeImportModal.requestClose("button");
  });

  dom.copyNodeImportCommandBtn?.addEventListener("click", async () => {
    const command = dom.nodeImportCommandInput?.value || NODE_IMPORT_COMMAND;
    try {
      await navigator.clipboard.writeText(command);
      dom.nodeImportStatus.textContent = "Command copied.";
    } catch (error) {
      dom.nodeImportStatus.textContent = "Copy failed. Select command text manually and copy.";
    }
  });

  dom.pasteNodeImportOutputBtn?.addEventListener("click", async () => {
    try {
      const clip = await navigator.clipboard.readText();
      dom.nodeImportOutput.value = clip || "";
      dom.nodeImportStatus.textContent = clip
        ? "Pasted clipboard output."
        : "Clipboard is empty.";
    } catch (error) {
      dom.nodeImportStatus.textContent = "Paste failed. Paste manually into the output box.";
    }
  });

  dom.nodeImportSubmitTopBtn?.addEventListener("click", () => {
    dom.nodeImportForm?.requestSubmit();
  });

  dom.nodeImportForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const captureText = String(dom.nodeImportOutput?.value || "");
    if (!captureText.trim()) {
      dom.nodeImportStatus.textContent = "Paste captured output before importing.";
      return;
    }

    const result = importNodeFromCapturedOutput(captureText);
    if (result.error) {
      dom.nodeImportStatus.textContent = result.error;
      return;
    }

    nodeImportModal.requestClose("button");
    nodeCreateModal.requestClose("button");
    dom.nodeImportOutput.value = "";
    const summary = [
      `Imported node: ${result.node.name}`,
      `Interfaces: ${result.importedInterfaces}`,
      `Firewall rules imported: ${result.importedRules}`,
      `Firewall rules skipped: ${result.skippedRules}`,
      `Connections inferred: ${result.importedConnections}`,
    ];
    if (result.forcedType) {
      summary.push("Container type selection is ignored for import (container import is not supported yet).");
    }
    if (result.warnings.length) {
      summary.push(`Warnings: ${result.warnings.join(" | ")}`);
    }
    alert(summary.join("\n"));
  });

  dom.addNodeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(dom.addNodeForm);
    const node = addNodeToState({
      name: formData.get("name"),
      type: formData.get("type"),
      trust: formData.get("trust"),
    });

    if (!node) {
      return;
    }
    dom.addNodeForm.reset();
    persistAndRender();
  });

  dom.addInterfaceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedNodeId) {
      alert("Select a node before adding an interface.");
      return;
    }

    const node = findNode(state, selectedNodeId);
    if (!node) {
      return;
    }

    const formData = new FormData(dom.addInterfaceForm);
    const iface = createInterface({
      name: String(formData.get("name")).trim(),
      kind: String(formData.get("kind")),
      cidr: String(formData.get("cidr")).trim(),
      direction: String(formData.get("direction")),
      forwarding: formData.get("forwarding") === "on",
      natAllowed: formData.get("natAllowed") === "on",
      allowedIps: String(formData.get("allowedIps")).trim(),
      listenPort: String(formData.get("listenPort")).trim(),
    });

    if (!iface.name) {
      return;
    }

    node.interfaces.push(iface);
    ensureInterfaceConfig(iface);
    dom.addInterfaceForm.reset();
    syncInterfaceFormUi();
    persistAndRender();
  });

  dom.addLinkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(dom.addLinkForm);

    if (!formData.get("srcInterface") || !formData.get("dstInterface")) {
      return;
    }

    const src = parseEndpointSelection(String(formData.get("srcInterface")));
    const dst = parseEndpointSelection(String(formData.get("dstInterface")));
    const dstNode = findNode(state, dst.nodeId);
    const linkType = String(formData.get("linkType"));
    const normalized = normalizeLinkInput(formData);
    const description = String(formData.get("description")).trim();

    if (dst.interfaceId !== "*" && src.nodeId === dst.nodeId && src.interfaceId === dst.interfaceId) {
      alert("Source and destination interface must be different.");
      return;
    }

    const destInterfaceIds = dst.interfaceId === "*" && dstNode
      ? dstNode.interfaces.map((iface) => iface.id)
      : [dst.interfaceId];

    const createdLinkIds = [];

    if (linkEditorState.mode === "edit" && linkEditorState.linkId) {
      const existing = state.links.find((link) => link.id === linkEditorState.linkId);
      if (existing) {
        existing.srcNodeId = src.nodeId;
        existing.srcInterfaceId = src.interfaceId;
        existing.dstNodeId = dst.nodeId;
        existing.dstInterfaceId = destInterfaceIds[0];
        existing.linkType = linkType;
        existing.protocol = normalized.protocol;
        existing.ports = normalized.ports;
        existing.sourcePort = normalized.sourcePort;
        existing.natMode = normalized.natMode;
        existing.conntrack = normalized.conntrack;
        existing.policyTable = normalized.policyTable;
        existing.description = description;
        createdLinkIds.push(existing.id);
      }
      linkEditorState.mode = "new";
      linkEditorState.linkId = "";
    } else {
      destInterfaceIds.forEach((destId) => {
        if (!destId) {
          return;
        }
        const link = createLink({
          srcNodeId: src.nodeId,
          srcInterfaceId: src.interfaceId,
          dstNodeId: dst.nodeId,
          dstInterfaceId: destId,
          linkType,
          ...normalized,
          description,
        });
        state.links.push(link);
        createdLinkIds.push(link.id);
      });
    }

    const primaryLinkId = createdLinkIds[0] || "";
    if (primaryLinkId && hostConfigState.hostId === src.nodeId) {
      hostConfigState.connectionInterfaceId = src.interfaceId;
      hostConfigState.connectionId = primaryLinkId;
    }

  dom.addLinkForm.reset();
  syncLinkFormUi();
  persistAndRender();
  const hostModal = document.getElementById("host-config-modal");
  if (hostModal && hostModal.classList.contains("open")) {
      renderHostConfigurationModal();
    }
    connectionsModal.requestClose("button");
  });

  dom.selectedNode.addEventListener("change", () => {
    selectedNodeId = dom.selectedNode.value;
    multiSelectedIds = selectedNodeId ? [selectedNodeId] : [];
    updateMultiSelectStatus();
    renderAll();
  });

  dom.configureHostBtn.addEventListener("click", openHostConfiguration);
  dom.openConnectionsBtn.addEventListener("click", () => connectionsModal.open());
  dom.cancelConnectionsModalBtn.addEventListener("click", () => connectionsModal.requestClose("button"));
  dom.openExamplesBtn.addEventListener("click", () => {
    renderExampleOptions();
    examplesModal.open();
  });
  dom.examplesCancelBtn.addEventListener("click", () => examplesModal.requestClose("button"));
  dom.examplesImportBtn.addEventListener("click", async () => {
    const path = dom.examplesSelect.value;
    if (!path) {
      return;
    }
    await importExample(path);
    examplesModal.requestClose("button");
  });
  dom.openHelpBtn.addEventListener("click", () => display_help(HELP_HTML));
  dom.helpCloseBtn.addEventListener("click", () => helpModal.requestClose("button"));
  window.addEventListener("resize", () => renderAll());
  dom.multiSelectBtn?.addEventListener("click", () => setMultiSelectMode(!multiSelectMode));
  dom.nodeConfigNameInput?.addEventListener("change", updateHostConfigFromForm);
  dom.nodeConfigTypeSelect?.addEventListener("change", updateHostConfigFromForm);
  dom.nodeConfigTrustSelect?.addEventListener("change", updateHostConfigFromForm);
  dom.deleteNodeConfirmBtn?.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host) {
      return;
    }
    const confirmed = window.confirm(
      `Delete node "${host.name}"? This removes all interfaces, rules, connections, and child workloads.`,
    );
    if (!confirmed) {
      return;
    }
    hostModalDirty = false;
    interfaceModal.close();
    ruleModal.close();
    interfaceImportModal.close();
    firewallImportModal.close();
    modal.close();
    deleteNodeById(host.id);
  });

  dom.deleteLinkBtn.addEventListener("click", () => {
    const linkId = dom.connectionSelect.value;
    if (!linkId) {
      return;
    }
    state.links = state.links.filter((link) => link.id !== linkId);
    persistAndRender();
  });

  dom.validateBtn.addEventListener("click", runValidation);
  dom.simulateBtn.addEventListener("click", runSimulation);
  dom.addInterfaceForm.elements.kind.addEventListener("change", syncInterfaceFormUi);
  dom.addLinkForm.elements.linkType.addEventListener("change", syncLinkFormUi);
  dom.addLinkForm.elements.protocol.addEventListener("change", syncLinkFormUi);

  dom.exportBtn.addEventListener("click", () => exportToFile(state));
  dom.importInput.addEventListener("change", async () => {
    const file = dom.importInput.files?.[0];
    if (!file) {
      return;
    }
    try {
      const imported = await importFromFile(file);
      setState(imported);
      dom.importInput.value = "";
      runValidation();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  });

  dom.saveHostDefaultsBtn.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host) {
      return;
    }
    host.defaults.inbound = dom.hostDefaultInbound.value;
    host.defaults.outbound = dom.hostDefaultOutbound.value;
    host.defaults.routed = dom.hostDefaultRouted.value;
    persistAndRender();
    renderHostConfigurationModal();
  });

  dom.hostInterfaceSelect.addEventListener("change", () => {
    hostConfigState.interfaceId = dom.hostInterfaceSelect.value;
    renderHostConfigurationModal();
  });

  dom.newInterfaceBtn.addEventListener("click", () => {
    openInterfaceConfigModal("new");
  });

  dom.importInterfacesBtn.addEventListener("click", () => {
    if (!getActiveHost()) {
      return;
    }
    dom.interfaceImportInput.value = "";
    dom.interfaceImportStatus.textContent = "Paste output from ip -o link and/or ip -o -4 addr, then click Import.";
    interfaceImportModal.open();
  });

  dom.editInterfaceBtn.addEventListener("click", () => {
    openInterfaceConfigModal("edit");
  });

  dom.deleteInterfaceBtn.addEventListener("click", () => {
    const host = getActiveHost();
    const iface = getActiveInterface();
    if (!host || !iface) {
      return;
    }
    host.interfaces = host.interfaces.filter((item) => item.id !== iface.id);
    state.links = state.links.filter((link) => {
      const srcMatch = link.srcNodeId === host.id && link.srcInterfaceId === iface.id;
      const dstMatch = link.dstNodeId === host.id && link.dstInterfaceId === iface.id;
      return !srcMatch && !dstMatch;
    });
    syncHostRuleInterfaceBindings(host);
    hostConfigState.interfaceId = host.interfaces[0]?.id || "";
    hostConfigState.ruleId = host.firewallRules?.[0]?.id || "";
    persistAndRender();
    renderHostConfigurationModal();
  });

  dom.interfaceImportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const host = getActiveHost();
    if (!host) {
      return;
    }

    const { interfaces: importedInterfaces, warnings } = parseInterfaceImport(dom.interfaceImportInput.value);
    if (!importedInterfaces.length) {
      dom.interfaceImportStatus.textContent = warnings[0] || "No interfaces detected in pasted text.";
      return;
    }

    applyImportedInterfaces(host, importedInterfaces);
    persistAndRender();
    renderHostConfigurationModal();
    interfaceImportModal.requestClose("button");

    const summary = [`Imported ${importedInterfaces.length} interface(s).`];
    if (warnings.length) {
      summary.push(`Warnings: ${warnings.join(" | ")}`);
    }
    alert(summary.join("\n"));
  });

  dom.cancelInterfaceImportBtn.addEventListener("click", () => {
    interfaceImportModal.requestClose("button");
  });

  dom.hostInterfaceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const host = getActiveHost();
    if (!host) {
      return;
    }
    let iface = null;
    if (interfaceEditorState.mode === "edit") {
      iface = findIfaceOnNode(host, interfaceEditorState.interfaceId);
    }
    if (!iface) {
      iface = createHostInterface();
      host.interfaces.push(iface);
      hostConfigState.interfaceId = iface.id;
      hostConfigState.ruleId = host.firewallRules?.[0]?.id || "";
    }
    updateInterfaceFromForm(iface);
    persistAndRender();
    closeInterfaceConfigModal();
    renderHostConfigurationModal();
  });

  dom.closeInterfaceModalBtn.addEventListener("click", closeInterfaceConfigModal);
  dom.cancelInterfaceModalBtn.addEventListener("click", closeInterfaceConfigModal);

  dom.ifaceKindInput.addEventListener("change", syncHostInterfaceFormUi);
  dom.ifaceAddressModeInput.addEventListener("change", syncHostInterfaceFormUi);

  dom.hostRuleSelect.addEventListener("change", () => {
    hostConfigState.ruleId = dom.hostRuleSelect.value;
    renderHostConfigurationModal();
  });

  dom.addRuleBtn.addEventListener("click", () => {
    openRuleConfigModal("new");
  });

  dom.importIptablesBtn.addEventListener("click", () => {
    if (!getActiveHost()) {
      return;
    }
    dom.firewallImportInput.value = "";
    dom.firewallImportStatus.textContent = "Paste iptables -S/-L and optional ip route output, then click Import.";
    firewallImportModal.open();
  });

  dom.editRuleBtn.addEventListener("click", () => {
    openRuleConfigModal("edit");
  });

  dom.deleteRuleBtn.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host || !hostConfigState.ruleId) {
      return;
    }
    host.firewallRules = (host.firewallRules || []).filter((rule) => rule.id !== hostConfigState.ruleId);
    hostConfigState.ruleId = host.firewallRules[0]?.id || "";
    persistAndRender();
    renderHostConfigurationModal();
  });

  dom.firewallImportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const host = getActiveHost();
    if (!host) {
      return;
    }
    if (!host.interfaces.length) {
      dom.firewallImportStatus.textContent = "Add or import interfaces before importing firewall rules.";
      return;
    }

    const { defaults, rules, routes, warnings } = parseIptablesImport(dom.firewallImportInput.value);
    if (!rules.length && !Object.keys(defaults).length && !routes.length) {
      dom.firewallImportStatus.textContent = warnings[0] || "No supported iptables rules found.";
      return;
    }

    if (defaults.inbound) {
      host.defaults.inbound = defaults.inbound;
    }
    if (defaults.outbound) {
      host.defaults.outbound = defaults.outbound;
    }
    if (defaults.routed) {
      host.defaults.routed = defaults.routed;
    }

    const { importedCount, skippedCount } = applyImportedFirewallRules(host, rules);
    const importedConnections = inferConnectionsFromImportedRoutes(host, routes);
    persistAndRender();
    renderHostConfigurationModal();
    firewallImportModal.requestClose("button");

    const summary = [`Imported ${importedCount} firewall rule(s).`];
    if (routes.length) {
      summary.push(`Parsed ${routes.length} route table entry/entries.`);
    }
    if (importedConnections) {
      summary.push(`Created ${importedConnections} connection(s) from imported routes.`);
    }
    if (skippedCount) {
      summary.push(`Skipped ${skippedCount} rule(s) due to unresolved interfaces.`);
    }
    if (warnings.length) {
      summary.push(`Warnings: ${warnings.join(" | ")}`);
    }
    alert(summary.join("\n"));
  });

  dom.cancelFirewallImportBtn.addEventListener("click", () => {
    firewallImportModal.requestClose("button");
  });

  dom.hostRuleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const host = getActiveHost();
    if (!host) {
      return;
    }
    const ruleId = ruleEditorState.mode === "edit" ? ruleEditorState.ruleId : "";
    let rule = findRule(host, ruleId);
    if (!rule) {
      rule = createFirewallRule();
      host.firewallRules.push(rule);
      hostConfigState.ruleId = rule.id;
    }
    updateRuleObjectFromForm(rule);
    hostConfigState.ruleId = rule.id;
    persistAndRender();
    closeRuleConfigModal();
    renderHostConfigurationModal();
  });

  dom.closeRuleModalBtn.addEventListener("click", closeRuleConfigModal);
  dom.cancelRuleModalBtn.addEventListener("click", closeRuleConfigModal);

  dom.ruleProtocolInput.addEventListener("change", syncRuleFormUi);
  dom.ruleTypeInput.addEventListener("change", syncRuleFormUi);
  dom.ruleFromEndpointSelect.addEventListener("change", () => {
    dom.ruleFromAddressInput.value = dom.ruleFromEndpointSelect.value;
  });
  dom.ruleToEndpointSelect.addEventListener("change", () => {
    dom.ruleToAddressInput.value = dom.ruleToEndpointSelect.value;
  });

  dom.hostTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveHostTab(button.dataset.tab);
    });
  });

  dom.connectionsInterfaceSelect.addEventListener("change", () => {
    hostConfigState.connectionInterfaceId = dom.connectionsInterfaceSelect.value;
    hostConfigState.connectionId = "";
    const host = getActiveHost();
    if (host) {
      renderConnectionsTab(host);
    }
  });

  dom.connectionsSelect.addEventListener("change", () => {
    hostConfigState.connectionId = dom.connectionsSelect.value;
    const host = getActiveHost();
    if (host) {
      renderConnectionsTab(host);
    }
  });

  dom.connectionNewBtn.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host || !hostConfigState.connectionInterfaceId) {
      return;
    }
    openLinkEditorForNew(host.id, hostConfigState.connectionInterfaceId);
  });

  dom.connectionEditBtn.addEventListener("click", () => {
    if (!hostConfigState.connectionId) {
      return;
    }
    const link = state.links.find((item) => item.id === hostConfigState.connectionId);
    if (!link) {
      return;
    }
    openLinkEditorForEdit(link);
  });

  dom.connectionDeleteBtn.addEventListener("click", () => {
    if (!hostConfigState.connectionId) {
      return;
    }
    state.links = state.links.filter((link) => link.id !== hostConfigState.connectionId);
    hostConfigState.connectionId = "";
    persistAndRender();
  });

  dom.testSourceSelect.addEventListener("change", () => syncTestUi());
  dom.testDestinationSelect.addEventListener("change", () => syncTestUi(true));
  dom.testProtocolSelect.addEventListener("change", syncTestUi);
  dom.testPortSelect.addEventListener("change", () => {
    setRowVisible(dom.testCustomPortRow, dom.testPortSelect.value === "custom");
  });
  dom.interfaceTestForm.addEventListener("submit", runInterfaceTest);

  dom.childSelect.addEventListener("change", () => {
    hostConfigState.childId = dom.childSelect.value;
    renderHostConfigurationModal();
  });

  dom.addChildBtn.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host) {
      return;
    }
    const child = createChildWorkload();
    child.name = `${child.kind}-${host.children.length + 1}`;
    child.bindInterfaceId = host.interfaces[0]?.id || "";
    const childNode = ensureChildNode(host, child);
    childNode.name = child.name;
    childNode.type = nodeTypeForChildKind(child.kind);
    host.children.push(child);
    hostConfigState.childId = child.id;
    persistAndRender();
    renderHostConfigurationModal();
  });

  dom.configureChildBtn.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host) {
      return;
    }
    const child = findChild(host, hostConfigState.childId);
    if (!child) {
      alert("Select a child first.");
      return;
    }
    const childNode = ensureChildNode(host, child);
    if (hostModalDirty) {
      const shouldSave = window.confirm(
        "Save current host configuration changes before opening child configuration?",
      );
      if (!shouldSave) {
        return;
      }
      saveHostModalDrafts();
    }
    openHostConfigurationForNode(childNode.id);
  });

  dom.deleteChildBtn.addEventListener("click", () => {
    const host = getActiveHost();
    if (!host || !hostConfigState.childId) {
      return;
    }
    const child = findChild(host, hostConfigState.childId);
    const childNodeId = child?.nodeId || "";
    if (childNodeId) {
      const toRemove = new Set([childNodeId]);
      collectDescendantNodeIds(childNodeId, toRemove);
      state.nodes = state.nodes.filter((node) => !toRemove.has(node.id));
      state.links = state.links.filter((link) => !toRemove.has(link.srcNodeId) && !toRemove.has(link.dstNodeId));
      state.nodes.forEach((node) => {
        node.children = (node.children || []).filter((item) => !toRemove.has(item.nodeId));
      });
    }
    host.children = host.children.filter((child) => child.id !== hostConfigState.childId);
    hostConfigState.childId = host.children[0]?.id || "";
    persistAndRender();
    renderHostConfigurationModal();
  });

  dom.childForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const host = getActiveHost();
    if (!host) {
      return;
    }
    let child = findChild(host, hostConfigState.childId);
    if (!child) {
      child = createChildWorkload();
      host.children.push(child);
      hostConfigState.childId = child.id;
    }
    child.name = dom.childNameInput.value.trim() || child.name;
    child.kind = dom.childKindInput.value;
    child.bindInterfaceId = dom.childBindInterfaceSelect.value;
    const childNode = ensureChildNode(host, child);
    childNode.name = child.name;
    childNode.type = nodeTypeForChildKind(child.kind);
    persistAndRender();
    renderHostConfigurationModal();
  });
}

async function bootstrap() {
  const loaded = await loadInitialState(createInitialState, "examples/default.json");
  state = cloneState(loaded);
  ensureStateConfig(state);
  selectedNodeId = state.nodes[0]?.id || "";
  multiSelectedIds = selectedNodeId ? [selectedNodeId] : [];
  renderExampleOptions();
  window.display_help = display_help;
  attachEvents();
  syncInterfaceFormUi();
  syncLinkFormUi();
  updateMultiSelectStatus();
  renderAll();
  runValidation();
}

bootstrap();
