import { endpointLabel, findInterface, findNode } from "./model.js";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 88;
const NODE_FILL = "#f7f2e8";
const NODE_STROKE = "#8f887d";
const NODE_TEXT = "#000000";
const ROUTE_END_PADDING = 8;
const EDIT_BTN_SIZE = 22;

function endpointPoint(node) {
  return {
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  };
}

function pointOnRectEdge(center, target, padding = 0) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  if (!dx && !dy) {
    return { x: center.x, y: center.y };
  }
  const halfW = NODE_WIDTH / 2 + padding;
  const halfH = NODE_HEIGHT / 2 + padding;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function svgEl(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}

export function ensureCanvasDefs(svg) {
  if (svg.querySelector("defs")) {
    return;
  }
  const defs = svgEl("defs");
  const marker = svgEl("marker");
  marker.setAttribute("id", "arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "7");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("orient", "auto-start-reverse");

  const path = svgEl("path");
  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  path.setAttribute("fill", "#3e3b37");
  marker.appendChild(path);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

export function renderTopology(
  svg,
  state,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onOpenNode,
  routeOverlays = [],
  showLinks = true,
) {
  ensureCanvasDefs(svg);
  svg.querySelectorAll("g.render-item").forEach((item) => item.remove());

  if (showLinks) {
    for (const link of [...state.links].sort((a, b) => a.id.localeCompare(b.id))) {
      const srcNode = findNode(state, link.srcNodeId);
      const dstNode = findNode(state, link.dstNodeId);
      if (!srcNode || !dstNode) {
        continue;
      }
      const src = endpointPoint(srcNode);
      const dst = endpointPoint(dstNode);

      const group = svgEl("g");
      group.classList.add("render-item");

      const line = svgEl("line");
      line.classList.add("link-line");
      line.setAttribute("x1", String(src.x));
      line.setAttribute("y1", String(src.y));
      line.setAttribute("x2", String(dst.x));
      line.setAttribute("y2", String(dst.y));

      const label = svgEl("text");
      label.classList.add("link-label");
      label.setAttribute("x", String((src.x + dst.x) / 2));
      label.setAttribute("y", String((src.y + dst.y) / 2 - 6));

      const srcIface = findInterface(state, link.srcNodeId, link.srcInterfaceId);
      const dstIface = findInterface(state, link.dstNodeId, link.dstInterfaceId);
      const sourceLabel = srcIface ? srcIface.name : "?";
      const destLabel = dstIface ? dstIface.name : "?";
      label.textContent = `${link.protocol.toUpperCase()} ${link.ports || "any"} (${sourceLabel} -> ${destLabel})`;

      group.appendChild(line);
      group.appendChild(label);
      svg.appendChild(group);
    }
  }

  if (routeOverlays.length) {
    const routeGroup = svgEl("g");
    routeGroup.classList.add("render-item", "route-layer");
    const edgeBuckets = new Map();
    const edges = [];

    routeOverlays.forEach((route) => {
      const path = route.path || [];
      for (let i = 0; i < path.length - 1; i += 1) {
        const fromId = path[i];
        const toId = path[i + 1];
        const key = `${fromId}|${toId}`;
        const edge = { route, fromId, toId, segmentIndex: i };
        edges.push(edge);
        if (!edgeBuckets.has(key)) {
          edgeBuckets.set(key, []);
        }
        edgeBuckets.get(key).push(edge);
      }
    });

    for (const [key, bucket] of edgeBuckets.entries()) {
      const [fromId, toId] = key.split("|");
      const fromNode = findNode(state, fromId);
      const toNode = findNode(state, toId);
      if (!fromNode || !toNode) {
        continue;
      }
      const from = endpointPoint(fromNode);
      const to = endpointPoint(toNode);
      const fromEdge = pointOnRectEdge(from, to, ROUTE_END_PADDING);
      const toEdge = pointOnRectEdge(to, from, ROUTE_END_PADDING);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;

      bucket.forEach((edge, index) => {
        const offset = (index - (bucket.length - 1) / 2) * 6;
        const ox = nx * offset;
        const oy = ny * offset;
        const x1 = fromEdge.x + ox;
        const y1 = fromEdge.y + oy;
        const x2 = toEdge.x + ox;
        const y2 = toEdge.y + oy;

        const line = svgEl("line");
        line.classList.add("route-line");
        if (edge.route.blocked) {
          line.classList.add("route-blocked");
        }
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", edge.route.color);
        if (!edge.route.blocked) {
          line.setAttribute("marker-end", "url(#arrow)");
        }
        routeGroup.appendChild(line);

        if (edge.route.blockedMarker && edge.route.blockedMarker.segmentIndex === edge.segmentIndex) {
          const markerAtStart = edge.route.blockedMarker.position === "start";
          const mx = markerAtStart ? x1 : x2;
          const my = markerAtStart ? y1 : y2;
          const barHalf = 6;
          const cross = svgEl("line");
          const cross2 = svgEl("line");
          const rx = nx * barHalf;
          const ry = ny * barHalf;
          const tx = (to.x - from.x) / length * barHalf;
          const ty = (to.y - from.y) / length * barHalf;
          cross.classList.add("route-blocked-marker");
          cross2.classList.add("route-blocked-marker");
          cross.setAttribute("x1", String(mx - rx - tx));
          cross.setAttribute("y1", String(my - ry - ty));
          cross.setAttribute("x2", String(mx + rx + tx));
          cross.setAttribute("y2", String(my + ry + ty));
          cross2.setAttribute("x1", String(mx - rx + tx));
          cross2.setAttribute("y1", String(my - ry + ty));
          cross2.setAttribute("x2", String(mx + rx - tx));
          cross2.setAttribute("y2", String(my + ry - ty));
          cross.setAttribute("stroke", edge.route.color);
          cross2.setAttribute("stroke", edge.route.color);
          routeGroup.appendChild(cross);
          routeGroup.appendChild(cross2);
        }
      });
    }

    svg.appendChild(routeGroup);
  }

  for (const node of [...state.nodes].sort((a, b) => a.name.localeCompare(b.name))) {
    const group = svgEl("g");
    group.classList.add("render-item", "node-item");
    group.setAttribute("transform", `translate(${node.x} ${node.y})`);

    const rect = svgEl("rect");
    rect.classList.add("node-rect");
    if (node.id === selectedNodeId) {
      rect.classList.add("selected");
    }
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(NODE_WIDTH));
    rect.setAttribute("height", String(NODE_HEIGHT));

    const title = svgEl("text");
    title.classList.add("node-label");
    title.setAttribute("x", "10");
    title.setAttribute("y", "24");
    title.textContent = node.name;

    const meta = svgEl("text");
    meta.classList.add("node-meta");
    meta.setAttribute("x", "10");
    meta.setAttribute("y", "44");
    meta.textContent = `${node.type} | trust=${node.trust}`;

    const ifaceMeta = svgEl("text");
    ifaceMeta.classList.add("node-meta");
    ifaceMeta.setAttribute("x", "10");
    ifaceMeta.setAttribute("y", "62");
    ifaceMeta.textContent = `${node.interfaces.length} interface(s)`;

    const editGroup = svgEl("g");
    editGroup.classList.add("node-edit");
    const editX = NODE_WIDTH - EDIT_BTN_SIZE - 6;
    const editY = 6;

    const editBg = svgEl("rect");
    editBg.classList.add("node-edit-bg");
    editBg.setAttribute("x", String(editX));
    editBg.setAttribute("y", String(editY));
    editBg.setAttribute("width", String(EDIT_BTN_SIZE));
    editBg.setAttribute("height", String(EDIT_BTN_SIZE));
    editBg.setAttribute("rx", "5");

    const editIcon = svgEl("path");
    editIcon.classList.add("node-edit-icon");
    editIcon.setAttribute("d", "M16.2 3.8a1.5 1.5 0 0 1 2.1 0l1.8 1.8a1.5 1.5 0 0 1 0 2.1L8.5 19.3l-4 1a1 1 0 0 1-1.2-1.2l1-4L16.2 3.8zm-9.7 12.1-.5 2 2-.5 9.8-9.8-1.5-1.5-9.8 9.8z");
    editIcon.setAttribute("transform", `translate(${editX + 3} ${editY + 3}) scale(0.62)`);

    const editTitle = svgEl("title");
    editTitle.textContent = "Edit node";
    editGroup.appendChild(editTitle);
    editGroup.appendChild(editBg);
    editGroup.appendChild(editIcon);

    group.appendChild(rect);
    group.appendChild(title);
    group.appendChild(meta);
    group.appendChild(ifaceMeta);
    group.appendChild(editGroup);

    rect.addEventListener("click", () => onSelectNode(node.id));
    rect.addEventListener("dblclick", () => {
      if (typeof onOpenNode === "function") {
        onOpenNode(node.id);
      }
    });
    editGroup.addEventListener("pointerdown", (event) => event.stopPropagation());
    editGroup.addEventListener("click", (event) => {
      event.stopPropagation();
      if (typeof onOpenNode === "function") {
        onOpenNode(node.id);
      }
    });
    attachDragHandlers(svg, group, rect, node, onMoveNode);

    const titleTip = svgEl("title");
    titleTip.textContent = `${node.name} (${node.type}) | trust=${node.trust}`;
    group.appendChild(titleTip);

    svg.appendChild(group);
  }
}

function attachDragHandlers(svg, group, rect, node, onMoveNode) {
  let active = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;
  let dragX = node.x;
  let dragY = node.y;

  rect.addEventListener("pointerdown", (event) => {
    active = true;
    moved = false;
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    offsetX = point.x - node.x;
    offsetY = point.y - node.y;
    dragX = node.x;
    dragY = node.y;
    rect.setPointerCapture(event.pointerId);
  });

  rect.addEventListener("pointermove", (event) => {
    if (!active) {
      return;
    }
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    const nextX = Math.max(10, Math.min(1010, point.x - offsetX));
    const nextY = Math.max(10, Math.min(610, point.y - offsetY));
    moved = moved || Math.abs(nextX - dragX) > 1 || Math.abs(nextY - dragY) > 1;
    dragX = nextX;
    dragY = nextY;
    group.setAttribute("transform", `translate(${dragX} ${dragY})`);
  });

  rect.addEventListener("pointerup", () => {
    if (active && moved) {
      onMoveNode(node.id, dragX, dragY);
    }
    active = false;
    moved = false;
  });

  rect.addEventListener("pointercancel", () => {
    active = false;
    moved = false;
  });
}

function toSvgPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(svg.getScreenCTM().inverse());
  return { x: transformed.x, y: transformed.y };
}

export function buildConnectionLabel(state, link) {
  return `${endpointLabel(state, link.srcNodeId, link.srcInterfaceId)} -> ${endpointLabel(state, link.dstNodeId, link.dstInterfaceId)} [${link.protocol.toUpperCase()} ${link.ports || "any"}]`;
}
