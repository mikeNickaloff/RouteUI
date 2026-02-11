export function normalizeCidr(cidr) {
  const value = (cidr || "").trim();
  if (!value) {
    return "";
  }
  if (value.includes("/")) {
    return value;
  }
  return value.includes(":") ? `${value}/128` : `${value}/32`;
}

export function dottedMaskToPrefix(mask) {
  const parts = (mask || "").trim().split(".");
  if (parts.length !== 4) {
    return null;
  }
  let bits = "";
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      return null;
    }
    bits += n.toString(2).padStart(8, "0");
  }
  if (!/^1*0*$/.test(bits)) {
    return null;
  }
  return bits.indexOf("0") === -1 ? 32 : bits.indexOf("0");
}

export function prefixToDottedMask(prefix) {
  const n = Number(prefix);
  if (!Number.isInteger(n) || n < 0 || n > 32) {
    return "";
  }
  const bits = `${"1".repeat(n)}${"0".repeat(32 - n)}`;
  const octets = [];
  for (let i = 0; i < 4; i += 1) {
    octets.push(String(parseInt(bits.slice(i * 8, i * 8 + 8), 2)));
  }
  return octets.join(".");
}

export function buildCidr(ip, netmask) {
  const address = (ip || "").trim();
  if (!address) {
    return "";
  }
  if (address.includes("/")) {
    return normalizeCidr(address);
  }
  const prefix = dottedMaskToPrefix(netmask);
  if (prefix === null) {
    return normalizeCidr(address);
  }
  return `${address}/${prefix}`;
}

export function parseCidr(cidr) {
  const normalized = normalizeCidr(cidr);
  if (!normalized || !normalized.includes("/")) {
    return { ip: "", mask: "" };
  }
  const [ip, mask] = normalized.split("/");
  return { ip: ip.trim(), mask: mask.trim() };
}

export function cidrToNetwork(cidr) {
  return normalizeCidr(cidr);
}

export function sanitizeChainName(text) {
  return (text || "CHAIN").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 28);
}

export function normalizePorts(ports) {
  return (ports || "").trim();
}

export function asLines(items) {
  if (!items.length) {
    return "# No commands generated for this endpoint and tab.";
  }
  return items.join("\n");
}

export function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
