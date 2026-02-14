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
  const arrowMarker = svgEl("marker");
  arrowMarker.setAttribute("id", "arrow");
  arrowMarker.setAttribute("viewBox", "0 0 10 10");
  arrowMarker.setAttribute("refX", "9");
  arrowMarker.setAttribute("refY", "5");
  arrowMarker.setAttribute("markerWidth", "7");
  arrowMarker.setAttribute("markerHeight", "7");
  arrowMarker.setAttribute("orient", "auto-start-reverse");

  const arrowPath = svgEl("path");
  arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  arrowPath.setAttribute("fill", "context-stroke");
  arrowMarker.appendChild(arrowPath);
  defs.appendChild(arrowMarker);

  const circleMarker = svgEl("marker");
  circleMarker.setAttribute("id", "marker-circle");
  circleMarker.setAttribute("viewBox", "0 0 12 12");
  circleMarker.setAttribute("refX", "10");
  circleMarker.setAttribute("refY", "6");
  circleMarker.setAttribute("markerWidth", "8");
  circleMarker.setAttribute("markerHeight", "8");
  circleMarker.setAttribute("orient", "auto-start-reverse");
  const circleNode = svgEl("circle");
  circleNode.setAttribute("cx", "6");
  circleNode.setAttribute("cy", "6");
  circleNode.setAttribute("r", "4");
  circleNode.setAttribute("fill", "none");
  circleNode.setAttribute("stroke", "context-stroke");
  circleNode.setAttribute("stroke-width", "1.7");
  circleMarker.appendChild(circleNode);
  defs.appendChild(circleMarker);

  const arrowCircleMarker = svgEl("marker");
  arrowCircleMarker.setAttribute("id", "marker-arrow-circle");
  arrowCircleMarker.setAttribute("viewBox", "0 0 14 14");
  arrowCircleMarker.setAttribute("refX", "12");
  arrowCircleMarker.setAttribute("refY", "7");
  arrowCircleMarker.setAttribute("markerWidth", "10");
  arrowCircleMarker.setAttribute("markerHeight", "10");
  arrowCircleMarker.setAttribute("orient", "auto-start-reverse");
  const comboCircle = svgEl("circle");
  comboCircle.setAttribute("cx", "6");
  comboCircle.setAttribute("cy", "7");
  comboCircle.setAttribute("r", "4.5");
  comboCircle.setAttribute("fill", "none");
  comboCircle.setAttribute("stroke", "context-stroke");
  comboCircle.setAttribute("stroke-width", "1.5");
  const comboArrow = svgEl("path");
  comboArrow.setAttribute("d", "M 6 4.8 L 12.2 7 L 6 9.2 z");
  comboArrow.setAttribute("fill", "context-stroke");
  arrowCircleMarker.appendChild(comboCircle);
  arrowCircleMarker.appendChild(comboArrow);
  defs.appendChild(arrowCircleMarker);
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
  multiSelectIds = [],
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
    const dedupedEdges = new Map();
    const roleByNodeId = new Map();
    const isMultiSelectMode = Array.isArray(multiSelectIds) && multiSelectIds.length > 1;
    const selectedMarkerNodeIds = new Set(
      isMultiSelectMode
        ? multiSelectIds
        : selectedNodeId
        ? [selectedNodeId]
        : [],
    );
    const transitNonSelectedNodeIds = new Set();

    state.nodes.forEach((node) => {
      const defaults = node.defaults || {};
      roleByNodeId.set(node.id, {
        destination: defaults.inbound !== "deny",
        transit: defaults.routed !== "deny",
      });
    });

    if (isMultiSelectMode) {
      routeOverlays.forEach((route) => {
        const path = route.path || [];
        for (let i = 1; i < path.length - 1; i += 1) {
          const nodeId = path[i];
          if (!selectedMarkerNodeIds.has(nodeId)) {
            transitNonSelectedNodeIds.add(nodeId);
          }
        }
      });
    }

    routeOverlays.forEach((route) => {
      const path = route.path || [];
      for (let i = 0; i < path.length - 1; i += 1) {
        const fromId = path[i];
        const toId = path[i + 1];
        const sourceNodeId = route.srcNodeId || "";
        const sourceInterfaceId = route.srcInterfaceId || "";
        const dstNodeId = route.dstNodeId || "";
        const dstInterfaceId = route.dstInterfaceId || "";
        const direction = route.direction || "";
        const flowKey = route.flowKey || `${sourceNodeId}|${sourceInterfaceId}|${dstNodeId}|${dstInterfaceId}`;
        const segmentInterfaceKey = Array.isArray(route.segmentKeys)
          ? (route.segmentKeys[i] || `${sourceNodeId}|${sourceInterfaceId}|${toId}`)
          : `${sourceNodeId}|${sourceInterfaceId}|${toId}`;
        const bucketKey = `${fromId}|${toId}`;
        const dedupeKey = segmentInterfaceKey;
        const isBlockedSegment = route.blocked && route.blockedSegmentIndex === i;

        if (!dedupedEdges.has(dedupeKey)) {
          const edge = {
            route,
            fromId,
            toId,
            segmentIndex: i,
            flowKey,
            direction,
            color: route.color,
            isBlockedSegment,
            blockedNodeId: isBlockedSegment ? (route.blockedNodeId || "") : "",
            blockedAtPathIndex: isBlockedSegment ? route.blockedAtPathIndex : null,
            blockedAtNodeName: isBlockedSegment ? (route.blockedAtNodeName || "") : "",
          };
          dedupedEdges.set(dedupeKey, edge);
          if (!edgeBuckets.has(bucketKey)) {
            edgeBuckets.set(bucketKey, []);
          }
          edgeBuckets.get(bucketKey).push(edge);
        } else if (isBlockedSegment) {
          const edge = dedupedEdges.get(dedupeKey);
          edge.isBlockedSegment = true;
          edge.blockedNodeId = edge.blockedNodeId || route.blockedNodeId || "";
          edge.blockedAtPathIndex = Number.isInteger(edge.blockedAtPathIndex)
            ? edge.blockedAtPathIndex
            : route.blockedAtPathIndex;
          edge.blockedAtNodeName = edge.blockedAtNodeName || route.blockedAtNodeName || "";
        }
      }
    });

    const directionPairCounts = new Map();
    for (const key of edgeBuckets.keys()) {
      const [fromId, toId] = key.split("|");
      const pairKey = fromId < toId ? `${fromId}|${toId}` : `${toId}|${fromId}`;
      if (!directionPairCounts.has(pairKey)) {
        directionPairCounts.set(pairKey, new Set());
      }
      directionPairCounts.get(pairKey).add(key);
    }

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
      const pairKey = fromId < toId ? `${fromId}|${toId}` : `${toId}|${fromId}`;
      const pairDirections = directionPairCounts.get(pairKey);
      const hasOppositeDirection = pairDirections && pairDirections.size > 1;
      const directionalBaseOffset = hasOppositeDirection ? (fromId < toId ? -7 : 7) : 0;

      bucket.forEach((edge, index) => {
        const offset = directionalBaseOffset + ((index - (bucket.length - 1) / 2) * 10);
        const ox = nx * offset;
        const oy = ny * offset;
        const x1 = fromEdge.x + ox;
        const y1 = fromEdge.y + oy;
        const x2 = toEdge.x + ox;
        const y2 = toEdge.y + oy;

        const line = svgEl("line");
        line.classList.add("route-line");
        const isBlockedSegment = Boolean(edge.isBlockedSegment);
        if (edge.direction === "inbound") {
          line.classList.add("route-direction-inbound");
        } else if (edge.direction === "outbound") {
          line.classList.add("route-direction-outbound");
        }
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", edge.color);
        if (!isBlockedSegment) {
          if (isMultiSelectMode && transitNonSelectedNodeIds.has(edge.fromId)) {
            line.setAttribute("marker-start", "url(#arrow)");
          }

          let markerEndId = "";
          if (selectedMarkerNodeIds.has(edge.toId)) {
            const role = roleByNodeId.get(edge.toId) || { destination: false, transit: false };
            markerEndId = role.destination && role.transit
              ? "marker-arrow-circle"
              : role.destination
              ? "marker-circle"
              : role.transit
              ? "arrow"
              : "";
          } else if (isMultiSelectMode && transitNonSelectedNodeIds.has(edge.toId)) {
            markerEndId = "arrow";
          }
          if (markerEndId) {
            line.setAttribute("marker-end", `url(#${markerEndId})`);
          }
        }
        if (isBlockedSegment && edge.blockedAtNodeName) {
          const lineTitle = svgEl("title");
          lineTitle.textContent = `Blocked at ${edge.blockedAtNodeName}`;
          line.appendChild(lineTitle);
        }
        routeGroup.appendChild(line);

        if (isBlockedSegment) {
          const markerAtStart = edge.blockedNodeId
            ? edge.blockedNodeId === edge.fromId
            : edge.blockedAtPathIndex === edge.segmentIndex;
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
          cross.setAttribute("stroke", edge.color);
          cross2.setAttribute("stroke", edge.color);
          routeGroup.appendChild(cross);
          routeGroup.appendChild(cross2);
        }
      });
    }

    svg.appendChild(routeGroup);
  }

  const multiSelectSet = new Set(multiSelectIds || []);

  for (const node of [...state.nodes].sort((a, b) => a.name.localeCompare(b.name))) {
    const group = svgEl("g");
    group.classList.add("render-item", "node-item");
    group.setAttribute("transform", `translate(${node.x} ${node.y})`);

    const rect = svgEl("rect");
    rect.classList.add("node-rect");
    if (node.id === selectedNodeId) {
      rect.classList.add("selected");
    }
    if (multiSelectSet.has(node.id)) {
      rect.classList.add("multi-selected");
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
