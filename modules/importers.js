import { parseCidr, prefixToDottedMask } from "./utils.js";

function normalizeInterfaceName(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned || cleaned === "*" || cleaned.toLowerCase() === "any") {
    return "";
  }
  return cleaned.replace(/^!+/, "").replace(/@.*/, "");
}

function normalizeProtocol(value) {
  const protocol = String(value || "").trim().toLowerCase();
  if (!protocol || protocol === "all" || protocol === "any") {
    return "any";
  }
  if (["tcp", "udp", "icmp"].includes(protocol)) {
    return protocol;
  }
  return "any";
}

function normalizeAddress(value) {
  const address = String(value || "").trim();
  const lowered = address.toLowerCase();
  if (!address || lowered === "any" || lowered === "anywhere" || lowered === "0.0.0.0/0" || lowered === "::/0") {
    return "";
  }
  return address;
}

function mapTargetAction(value) {
  const target = String(value || "").trim().toUpperCase();
  if (target === "ACCEPT") {
    return "allow";
  }
  if (target === "DROP") {
    return "deny";
  }
  if (target === "REJECT") {
    return "reject";
  }
  if (target === "LIMIT") {
    return "limit";
  }
  return "";
}

function chainToRuleType(chain) {
  const normalized = String(chain || "").trim().toUpperCase();
  if (normalized === "INPUT") {
    return "inbound";
  }
  if (normalized === "OUTPUT") {
    return "outbound";
  }
  if (normalized === "FORWARD") {
    return "forward";
  }
  return "";
}

function tokenize(line) {
  return (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((token) => token.replace(/^['"]|['"]$/g, ""));
}

function stripIptablesCommandPrefix(line) {
  return String(line || "")
    .trim()
    .replace(/^(?:sudo\s+)?(?:\S*\/)?(?:ip6tables|iptables)(?:-save)?\s+/i, "");
}

function normalizeRouteDestination(value) {
  const destination = String(value || "").trim();
  if (!destination || destination.toLowerCase() === "default") {
    return "0.0.0.0/0";
  }
  if (destination.includes("/")) {
    return destination;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(destination)) {
    return `${destination}/32`;
  }
  return "";
}

function createImportedRule(type) {
  return {
    type,
    action: "allow",
    protocol: "any",
    interfaceName: "",
    inInterfaceName: "",
    outInterfaceName: "",
    fromAddress: "",
    toAddress: "",
    fromPort: "",
    toPort: "",
    description: "Imported from iptables",
  };
}

function parseIptablesSaveLine(line, defaults, rules, warnings) {
  const tokens = tokenize(line);
  if (!tokens.length) {
    return;
  }

  if (tokens[0] === "-P" && tokens.length >= 3) {
    const type = chainToRuleType(tokens[1]);
    const action = mapTargetAction(tokens[2]);
    if (type && action) {
      defaults[type] = action;
    }
    return;
  }

  if (tokens[0] !== "-A" || tokens.length < 3) {
    return;
  }

  const type = chainToRuleType(tokens[1]);
  if (!type) {
    return;
  }

  const rule = createImportedRule(type);
  for (let index = 2; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1] || "";

    if (token === "-p" || token === "--protocol") {
      rule.protocol = normalizeProtocol(next);
      index += 1;
      continue;
    }
    if (token === "-i" || token === "--in-interface") {
      rule.inInterfaceName = normalizeInterfaceName(next);
      index += 1;
      continue;
    }
    if (token === "-o" || token === "--out-interface") {
      rule.outInterfaceName = normalizeInterfaceName(next);
      index += 1;
      continue;
    }
    if (token === "-s" || token === "--source") {
      rule.fromAddress = normalizeAddress(next);
      index += 1;
      continue;
    }
    if (token === "-d" || token === "--destination") {
      rule.toAddress = normalizeAddress(next);
      index += 1;
      continue;
    }
    if (token === "--sport" || token === "--source-port" || token === "--sports") {
      rule.fromPort = String(next || "").trim();
      index += 1;
      continue;
    }
    if (token === "--dport" || token === "--destination-port" || token === "--dports") {
      rule.toPort = String(next || "").trim();
      index += 1;
      continue;
    }
    if (token === "-j" || token === "--jump") {
      const action = mapTargetAction(next);
      if (!action) {
        warnings.push(`Skipped iptables jump target "${next}" in line: ${line}`);
        return;
      }
      rule.action = action;
      index += 1;
      continue;
    }
  }

  if (type === "inbound") {
    rule.interfaceName = rule.inInterfaceName;
  } else if (type === "outbound") {
    rule.interfaceName = rule.outInterfaceName;
  }
  rules.push(rule);
}

function parseIptablesListRule(line, chain, hasInterfaces, rules, warnings) {
  const type = chainToRuleType(chain);
  if (!type) {
    return;
  }

  const tokens = line.trim().split(/\s+/);
  if (!tokens.length || /^(target|pkts)$/i.test(tokens[0])) {
    return;
  }

  let offset = 0;
  if (/^\d+$/.test(tokens[0]) && /^\d+$/.test(tokens[1])) {
    offset = 2;
  }

  const target = tokens[offset];
  const protocol = tokens[offset + 1];
  const action = mapTargetAction(target);
  if (!action) {
    warnings.push(`Skipped iptables target "${target}" in line: ${line}`);
    return;
  }

  const rule = createImportedRule(type);
  rule.action = action;
  rule.protocol = normalizeProtocol(protocol);

  const cursorStart = offset + 3;
  let cursor = cursorStart;
  if (hasInterfaces) {
    rule.inInterfaceName = normalizeInterfaceName(tokens[cursor] || "");
    rule.outInterfaceName = normalizeInterfaceName(tokens[cursor + 1] || "");
    cursor += 2;
  }

  rule.fromAddress = normalizeAddress(tokens[cursor] || "");
  rule.toAddress = normalizeAddress(tokens[cursor + 1] || "");
  cursor += 2;

  const remainder = tokens.slice(cursor).join(" ");
  const sourcePortMatch = remainder.match(/\bspt:(\S+)/i);
  if (sourcePortMatch) {
    rule.fromPort = sourcePortMatch[1].trim();
  }
  const destinationPortMatch = remainder.match(/\bdpts?:([^\s]+)/i);
  if (destinationPortMatch) {
    rule.toPort = destinationPortMatch[1].trim();
  }

  if (type === "inbound") {
    rule.interfaceName = rule.inInterfaceName;
  } else if (type === "outbound") {
    rule.interfaceName = rule.outInterfaceName;
  }
  rules.push(rule);
}

function dedupeRules(rules) {
  const seen = new Set();
  const result = [];
  for (const rule of rules) {
    const key = [
      rule.type,
      rule.action,
      rule.protocol,
      rule.interfaceName,
      rule.inInterfaceName,
      rule.outInterfaceName,
      rule.fromAddress,
      rule.toAddress,
      rule.fromPort,
      rule.toPort,
    ].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(rule);
  }
  return result;
}

function dedupeRoutes(routes) {
  const seen = new Set();
  const result = [];
  for (const route of routes) {
    const key = `${route.destination}|${route.dev}|${route.via || ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(route);
  }
  return result;
}

export function parseIptablesImport(text) {
  const defaults = {};
  const parsedRules = [];
  const parsedRoutes = [];
  const warnings = [];
  const lines = String(text || "").split(/\r?\n/);

  let currentChain = "";
  let hasInterfaces = false;

  const addRoute = (destination, dev, via = "") => {
    const normalizedDestination = normalizeRouteDestination(destination);
    const normalizedDev = normalizeInterfaceName(dev);
    if (!normalizedDestination || !normalizedDev) {
      return;
    }
    parsedRoutes.push({
      destination: normalizedDestination,
      dev: normalizedDev,
      via: String(via || "").trim(),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const lineWithoutIptablesPrefix = stripIptablesCommandPrefix(line);
    if (lineWithoutIptablesPrefix.startsWith("-")) {
      parseIptablesSaveLine(lineWithoutIptablesPrefix, defaults, parsedRules, warnings);
      continue;
    }

    const routeMatch = line.match(/^(?:ip\s+route(?:\s+(?:add|replace|show))?\s+)?(\S+).*?\bdev\s+(\S+)(?:.*\bvia\s+(\S+))?/i);
    if (routeMatch && !/^chain$/i.test(routeMatch[1])) {
      addRoute(routeMatch[1], routeMatch[2], routeMatch[3] || "");
      continue;
    }

    const chainMatch = line.match(/^Chain\s+(\S+)\s+\(([^)]*)\)/i);
    if (chainMatch) {
      currentChain = chainMatch[1];
      hasInterfaces = false;
      const policyMatch = (chainMatch[2] || "").match(/\bpolicy\s+(\S+)/i);
      const type = chainToRuleType(chainMatch[1]);
      const action = mapTargetAction(policyMatch?.[1] || "");
      if (type && action) {
        defaults[type] = action;
      }
      continue;
    }

    if (!currentChain) {
      continue;
    }

    if (/^target\s+/i.test(line) || /^pkts\s+/i.test(line)) {
      hasInterfaces = /\bin\b/i.test(line) && /\bout\b/i.test(line);
      continue;
    }

    parseIptablesListRule(line, currentChain, hasInterfaces, parsedRules, warnings);
  }

  return {
    defaults,
    rules: dedupeRules(parsedRules),
    routes: dedupeRoutes(parsedRoutes),
    warnings,
  };
}

function inferInterfaceKind(name, detailLine) {
  const loweredName = String(name || "").toLowerCase();
  const loweredDetail = String(detailLine || "").toLowerCase();

  if (loweredName === "lo" || loweredDetail.includes("link/loopback")) {
    return "loopback";
  }
  if (loweredName.startsWith("wg")) {
    return "wireguard";
  }
  if (loweredName.startsWith("br")) {
    return "bridge";
  }
  if (loweredName.startsWith("vlan") || loweredName.includes(".")) {
    return "vlan";
  }
  if (loweredName.startsWith("tun")) {
    return "tunnel";
  }
  if (loweredName.startsWith("veth") || loweredName.startsWith("tap")) {
    return "virtual";
  }
  if (loweredDetail.includes("link/ether")) {
    return "physical";
  }
  return "virtual";
}

function ensureInterfaceRecord(map, name, line) {
  if (!name) {
    return null;
  }
  const normalizedName = normalizeInterfaceName(name);
  if (!normalizedName) {
    return null;
  }

  if (!map.has(normalizedName)) {
    map.set(normalizedName, {
      name: normalizedName,
      kind: inferInterfaceKind(normalizedName, line),
      addressMode: "dhcp",
      ip: "",
      netmask: "",
      cidr: "",
      broadcast: "",
      gateway: "",
      state: "down",
    });
  }
  return map.get(normalizedName);
}

function applyCidrToInterface(record, cidr, broadcast) {
  const parsed = parseCidr(cidr);
  record.addressMode = "static";
  record.cidr = cidr;
  record.ip = parsed.ip || record.ip;
  record.netmask = prefixToDottedMask(parsed.mask) || record.netmask;
  if (broadcast && broadcast.toLowerCase() !== "global") {
    record.broadcast = broadcast;
  }
}

export function parseInterfaceImport(text) {
  const interfacesByName = new Map();
  const warnings = [];
  const lines = String(text || "").split(/\r?\n/);
  let currentInterfaceName = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const linkHeaderMatch = line.match(/^(\d+):\s+([^:]+):\s+<([^>]*)>(.*)$/);
    if (linkHeaderMatch) {
      const name = normalizeInterfaceName(linkHeaderMatch[2]);
      const record = ensureInterfaceRecord(interfacesByName, name, line);
      if (!record) {
        continue;
      }
      currentInterfaceName = record.name;

      const flags = (linkHeaderMatch[3] || "").split(",").map((token) => token.trim().toUpperCase());
      const stateMatch = line.match(/\bstate\s+([A-Z]+)\b/);
      const state = (stateMatch?.[1] || "").toUpperCase();
      if (state === "UP" || flags.includes("UP")) {
        record.state = "up";
      } else if (state === "DOWN") {
        record.state = "down";
      }
      record.kind = inferInterfaceKind(record.name, line);
      continue;
    }

    const linkLineMatch = line.match(/^\d+:\s+([^\s:]+)(?:@[^:\s]+)?\s+link\/(\S+)/);
    if (linkLineMatch) {
      const record = ensureInterfaceRecord(interfacesByName, linkLineMatch[1], line);
      if (record) {
        currentInterfaceName = record.name;
        record.kind = inferInterfaceKind(record.name, `link/${linkLineMatch[2]}`);
      }
      continue;
    }

    const nestedLinkMatch = line.match(/^link\/(\S+)/);
    if (nestedLinkMatch && currentInterfaceName) {
      const record = ensureInterfaceRecord(interfacesByName, currentInterfaceName, "");
      if (record) {
        record.kind = inferInterfaceKind(record.name, `link/${nestedLinkMatch[1]}`);
      }
      continue;
    }

    const oneLineAddrMatch = line.match(/^\d+:\s+([^\s:]+)(?:@[^:\s]+)?\s+inet\s+([0-9.]+\/\d+)(?:\s+brd\s+([0-9.]+))?/);
    if (oneLineAddrMatch) {
      const record = ensureInterfaceRecord(interfacesByName, oneLineAddrMatch[1], line);
      if (!record) {
        continue;
      }
      currentInterfaceName = record.name;
      applyCidrToInterface(record, oneLineAddrMatch[2], oneLineAddrMatch[3] || "");
      continue;
    }

    const multiLineAddrMatch = line.match(/^inet\s+([0-9.]+\/\d+)(?:\s+brd\s+([0-9.]+))?/);
    if (multiLineAddrMatch && currentInterfaceName) {
      const record = ensureInterfaceRecord(interfacesByName, currentInterfaceName, "");
      if (!record) {
        continue;
      }
      applyCidrToInterface(record, multiLineAddrMatch[1], multiLineAddrMatch[2] || "");
      continue;
    }

    const defaultRouteMatch = line.match(/^default\s+via\s+(\S+)\s+dev\s+(\S+)/i);
    if (defaultRouteMatch) {
      const gateway = defaultRouteMatch[1];
      const ifaceName = normalizeInterfaceName(defaultRouteMatch[2]);
      const record = ensureInterfaceRecord(interfacesByName, ifaceName, "");
      if (record) {
        record.gateway = gateway;
      }
    }
  }

  const interfaces = Array.from(interfacesByName.values())
    .map((item) => ({
      ...item,
      state: item.state || "up",
      kind: item.kind || "physical",
      addressMode: item.ip || item.cidr ? "static" : "dhcp",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (!interfaces.length) {
    warnings.push("No interfaces were parsed from the pasted text.");
  }

  return { interfaces, warnings };
}
