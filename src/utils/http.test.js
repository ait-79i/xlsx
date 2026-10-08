import {
	buildHeaders,
	normalizeUrl,
	parseJsonBody,
	readBody,
	requestErrors,
	statusTone,
	toCurl,
} from "./http";
import { isPrivateAddress } from "../lib/ssrf";

test("URLs without a scheme get one", () => {
	expect(normalizeUrl("api.example.com/users")).toBe("https://api.example.com/users");
	expect(normalizeUrl("localhost:8080/x")).toBe("http://localhost:8080/x");
	expect(normalizeUrl("ftp://example.com")).toBeNull();
	expect(normalizeUrl("  ")).toBeNull();
});

test("JSON body errors point at the line", () => {
	expect(parseJsonBody("").ok).toBe(true);
	expect(parseJsonBody('{"a": 1}').value).toEqual({ a: 1 });
	const bad = parseJsonBody('{\n  "a": 1,\n}');
	expect(bad.ok).toBe(false);
	expect(bad.line).toBe(3);
});

test("headers: disabled and empty rows skipped, auth added, content-type only with a body", () => {
	const rows = [
		{ on: true, key: "Accept", value: "application/json" },
		{ on: false, key: "X-Off", value: "1" },
		{ on: true, key: " ", value: "x" },
		{ on: true, key: "Content-Type", value: "application/json" },
		{ on: true, key: "authorization", value: "old" },
	];
	expect(buildHeaders(rows, { type: "bearer", token: "abc" })).toEqual({
		Accept: "application/json",
		"Content-Type": "application/json",
		Authorization: "Bearer abc",
	});
	expect(buildHeaders(rows, { type: "none" }, { hasBody: false })).toEqual({
		Accept: "application/json",
		authorization: "old",
	});
	expect(buildHeaders([], { type: "basic", user: "amina", password: "é" }).Authorization).toBe("Basic YW1pbmE6w6k=");
});

test("request validation", () => {
	expect(requestErrors({ method: "GET", url: "", bodyText: "" })).toEqual({ url: "emptyUrl" });
	expect(requestErrors({ method: "POST", url: "x.io", bodyText: "{" })).toEqual({ body: "invalidBody" });
	// a GET ignores the body
	expect(requestErrors({ method: "GET", url: "x.io", bodyText: "{" })).toEqual({});
});

test("response helpers", () => {
	expect(readBody('[{"a":1}]', "text/plain")).toEqual({ json: [{ a: 1 }] });
	expect(readBody("<html>", "text/html")).toEqual({ text: "<html>" });
	expect(statusTone(201)).toBe("success");
	expect(statusTone(404)).toBe("client");
	expect(toCurl({ method: "POST", url: "https://x.io", headers: { A: "it's" }, body: "{}" })).toBe(
		"curl -X POST 'https://x.io' \\\n  -H 'A: it'\\''s' \\\n  --data '{}'"
	);
});

test("private addresses are blocked for the proxy", () => {
	for (const ip of ["127.0.0.1", "10.2.3.4", "172.20.0.1", "192.168.1.10", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1", "0.0.0.0"]) {
		expect(isPrivateAddress(ip)).toBe(true);
	}
	for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"]) {
		expect(isPrivateAddress(ip)).toBe(false);
	}
});
