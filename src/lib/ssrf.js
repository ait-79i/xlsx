// Guards the request proxy against reaching the server's own network (SSRF).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const v4ToInt = (ip) => ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;

const V4_BLOCKED = [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
].map(([base, bits]) => [v4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

/** true for loopback, private, link-local, multicast and other non public addresses */
export function isPrivateAddress(ip) {
	const version = isIP(ip);
	if (version === 4) {
		const n = v4ToInt(ip);
		return V4_BLOCKED.some(([base, mask]) => ((n & mask) >>> 0) === base);
	}
	if (version === 6) {
		const lower = ip.toLowerCase();
		const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
		if (mapped) return isPrivateAddress(mapped[1]);
		if (lower === "::" || lower === "::1") return true;
		// fc00::/7 unique local, fe80::/10 link-local, ff00::/8 multicast
		return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || /^ff/.test(lower);
	}
	return true;
}

/** Throws when the host name resolves to an address the proxy must not reach. */
export async function assertPublicHost(hostname) {
	const host = hostname.replace(/^\[|\]$/g, "");
	const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
	if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
		const error = new Error("private address");
		error.code = "privateAddress";
		throw error;
	}
}
