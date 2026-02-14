# RouteUI Static Web App

RouteUI is a static, client-side network CAD tool for modeling Linux-style networking (routing, firewall, WireGuard) with visual intent and deterministic command generation.

## Clone + run locally

```bash
git clone https://github.com/mikeNickaloff/RouteUI.git
cd RouteUI
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

## Features and capabilities

- Visual node/edge network topology editing with drag-to-position
- Host configuration modal with tabs for config, interfaces, firewall rules, connections, containers, testing, and deployment output
- Per-interface networking (static/DHCP, IP/CIDR, gateway, bridge/WG/loopback/tunnel types)
- Machine-wide firewall rules (UFW-style) with inbound/outbound/routed directions
- Import firewall rules from `iptables -S` / `iptables -L` and optional `ip route`
- Import interfaces from pasted `ip -o link`, `ip -o -4 addr`, and `ip route` outputs
- Network simulation/testing (TCP/UDP/ICMP) with open-port discovery and trace output
- WireGuard setup generation and routing output
- Visual route overlays with directional arrows and blocked markers
- Examples gallery plus JSON import/export
- LocalStorage persistence for quick iteration

## Getting started tips

1. Click **Examples** and load a sample topology to explore the features.
2. Use **Add Node** to create a host, then open **Configuration** via the **Pencil Button** on the upper right of any node.
3. In **Config Menu**, set the node’s name/type/trust.
4. In **Interfaces**, add interfaces and IP/CIDR values.
5. In **Firewall**, set defaults for inbound/outbound/routed rules and add additional rules.
6. Use **Connections** to define physical links between hosts (this is your Ethernet cable).
7. Use **Test** to trace packet flow between interfaces. Only shows destinations that can be reached.
8. Use **Deployment** to copy generated Firewall/Routing/WireGuard commands.
9. Export/import JSON to share or save your diagram.
10. Use **Multi Select** button on the top right of the diagram to trace packets between two or more devices visually.
11. Use **Import** In the **Add Node** dialog to quickly import a system into **RouteUI**
12. Use **Import** under various other sections in the **Config Menu**

## Persistence

- The diagram autosaves in `localStorage`.
- Importing JSON overwrites in-memory state and `localStorage`.

-----

## About Project (statistics) v1.1
- Written by Mike Nickaloff using ChatGPT Codex to create project piece by piece

### 📊 Project Metrics Summary

#### 🗓 Timeline
- **First spec entry:** **2026-02-04 01:29:44**
- **Latest spec entry:** **2026-02-13 18:47:51**
- **Active span:** **9.72 days**

---

#### 📝 Specification Activity
- **Total spec entries:** **13**
- **Recent planning activity (last 24h):** **14 entries**
- **Spec focus areas:**
  - project — **97 entries**
  - diagram — **26**
  - skills — **9**
  - node_import — **6**

---

#### 📋 Requirements & Governance
- **Requirements (total):** **92**
  - Approved — **74**
  - Superseded — **18**
- **Decisions + Constraints (total):** **29**
  - Decisions — **19**
  - Constraints — **10**

---

#### ❓ Question Handling
- **Total questions:** **15**
  - Closed — **11**
  - Approved — **4**
  - Open — **0**

- **Completion gate health:**  
  - Open questions — **0**  
  - Open req/decision/constraint rows — **0**

---

#### 🚀 Delivery & Change Management
- **Total changes shipped:** **54**
- **Completion rate:** **54 / 54 (100%)**
- **Throughput (active span):**
  - **5.56 changes/day**
  - **14.2 spec entries/day**

---

#### 📚 Definition Catalog
- **Total definitions:** **396**
- **Files covered:** **25**
- **Average definitions per file:** **15.84**

---

#### 🔗 Change Impact & Coverage
- **Total change–definition links:** **414**
- **Average defs per change:** **7.67**
- **Unique definitions edited:** **264**
  - Coverage of all defs — **66.67%**
- **Tracked changes (with change_defs entries):** **40 / 54 (74.07%)**
- **Files edited by tracked changes:** **19**

---

#### 🔥 Hotspots & Concentration
- **Top 3 files account for:** **65.46%** of all touches

**Top edited files:**
- `app.js` — **161**
- `index.html` — **82**
- `modules/host-config.js` — **28**

**Most frequently edited definition:**
- `renderTopology(...)` in `modules/render.js` — **17 touches**

---

#### 📡 Process Signals
- **refs table rows:** **0**  
  _(Reference-link graph not yet populated)_
- **todo table rows:** **0**
