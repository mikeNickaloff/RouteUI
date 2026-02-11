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
2. Use **Add Node** to create a host, then open **Configuration**.
3. In **Config**, set the node’s name/type/trust.
4. In **Interfaces**, add interfaces and IP/CIDR values.
5. In **Firewall**, set defaults and add inbound/outbound/routed rules.
6. Use **Connections** to define physical/intent links between hosts.
7. Use **Test** to trace packet flow between interfaces.
8. Use **Deployment** to copy generated Firewall/Routing/WireGuard commands.
9. Export/import JSON to share or version your model.

## Persistence

- The diagram autosaves in `localStorage`.
- Importing JSON overwrites in-memory state and `localStorage`.
