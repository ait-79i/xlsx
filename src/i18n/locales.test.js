import fs from "fs";
import path from "path";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLURAL_FORMS = {
	en: ["one", "other"],
	fr: ["one", "other"],
	ar: ["zero", "one", "two", "few", "many", "other"],
};
const locales = { en, fr, ar };

const flatten = (obj, prefix = "") =>
	Object.entries(obj).flatMap(([key, value]) =>
		typeof value === "object"
			? flatten(value, `${prefix}${key}.`)
			: [[`${prefix}${key}`, value]]
	);

// "graph.nodes_one" -> "graph.nodes"
const baseKeys = (locale) =>
	new Set(flatten(locale).map(([key]) => key.replace(PLURAL_SUFFIX, "")));

const pluralBases = (locale) =>
	new Set(
		flatten(locale)
			.map(([key]) => key)
			.filter((key) => PLURAL_SUFFIX.test(key))
			.map((key) => key.replace(PLURAL_SUFFIX, ""))
	);

const sourceFiles = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return /\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
	});

describe("translations", () => {
	test.each(["fr", "ar"])("%s has the same keys as en", (code) => {
		expect([...baseKeys(locales[code])].sort()).toEqual([...baseKeys(en)].sort());
	});

	test.each(Object.keys(locales))("%s has every plural form of its language", (code) => {
		const keys = new Set(flatten(locales[code]).map(([key]) => key));
		for (const base of pluralBases(en)) {
			for (const form of PLURAL_FORMS[code]) {
				expect(keys).toContain(`${base}_${form}`);
			}
		}
	});

	test.each(Object.keys(locales))("%s keeps the interpolation variables", (code) => {
		const enValues = new Map(flatten(en).map(([k, v]) => [k.replace(PLURAL_SUFFIX, ""), v]));
		for (const [key, value] of flatten(locales[code])) {
			const base = key.replace(PLURAL_SUFFIX, "");
			const vars = (s) => [...s.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).filter((v) => v !== "count");
			expect({ key, vars: vars(value).sort() }).toEqual({ key, vars: vars(enValues.get(base)).sort() });
		}
	});

	test("every key used in the code exists", () => {
		const known = baseKeys(en);
		const used = new Set();
		for (const file of sourceFiles(path.join(__dirname, ".."))) {
			const code = fs.readFileSync(file, "utf8");
			for (const m of code.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) used.add(m[1]);
			for (const m of code.matchAll(/i18nKey="([\w.]+)"/g)) used.add(m[1]);
		}
		// keys built at runtime
		["graph", "schema", "export"].forEach((tab) => used.add(`visualizer.tabs.${tab}`));
		["missingParenthesis", "duplicateTable", "referencedTableNotFound", "noCreateTable"].forEach(
			(code) => used.add(`schema.parseErrors.${code}`)
		);
		// converter
		["emptyKey", "keyTaken", "sameLevel", "selectColumn", "notFound", "concatTwo", "concatFields"].forEach((code) => used.add(`converter.errors.${code}`));
		["space", "comma", "dash", "slash", "underscore", "none"].forEach((name) => used.add(`converter.concat.separators.${name}`));
		["auto", "text", "number", "integer", "boolean", "date"].forEach((type) => used.add(`converter.types.${type}`));
		["sheet", "json"].forEach((kind) => used.add(`mappings.help.${kind}`));
		["load", "name", "save", "delete", "tooLarge", "tooMany"].forEach((code) => used.add(`mappings.errors.${code}`));
		["load", "name", "save", "delete", "tooLarge", "tooMany"].forEach((code) => used.add(`savedRequests.errors.${code}`));
		["failed", "invalidUsername", "invalidEmail", "emailTaken", "wrongPassword", "weakPassword", "tooManyAttempts"].forEach((code) => used.add(`account.errors.${code}`));
		["question", "bug", "idea", "account", "other"].forEach((topic) => used.add(`contact.topics.${topic}`));
		["required", "invalidEmail", "messageLength"].forEach((code) => used.add(`contact.errors.${code}`));
		["weak", "fair", "good", "strong"].forEach((level) => used.add(`login.strength.${level}`));
		["network", "aborted", "timeout", "privateAddress", "dnsFailed", "unreachable", "invalidUrl", "invalidRequest", "tooManyRequests", "unauthorized"].forEach(
			(code) => used.add(`apiTester.batch.errors.${code}`)
		);
		["json", "graph", "tables"].forEach((tab) => used.add(`converter.preview.tabs.${tab}`));
		// JSON structure
		["result", "original", "graph", "tables"].forEach((view) => used.add(`reshape.views.${view}`));
		// load into a database
		["sql", "nosql"].forEach((g) => used.add(`dbLoad.groups.${g}`));
		["load", "diagram", "insert", "upsert", "skip"].forEach((m) => used.add(`dbLoad.modes.${m}`));
		["integer", "bigint", "float", "decimal", "boolean", "date", "datetime", "string", "text", "json"].forEach((type) => used.add(`dbLoad.types.${type}`));
		["schema", "database", "keyspace"].forEach((n) => used.add(`dbLoad.namespace.${n}`));
		["sql", "mongo", "cql", "es"].forEach((family) => {
			used.add(`dbLoad.output.${family}.script`);
			used.add(`dbLoad.output.${family}.scriptHint`);
		});
		["sql", "mongo", "cql"].forEach((family) => {
			used.add(`dbLoad.output.${family}.files`);
			used.add(`dbLoad.output.${family}.filesHint`);
		});
		["emptyArray", "notObjects"].forEach((code) => used.add(`reshape.errors.${code}`));
		["expand", "collapse"].forEach((action) => used.add(`converter.keys.${action}`));
		// API tester
		["browser", "server"].forEach((via) => {
			used.add(`apiTester.via.${via}`);
			used.add(`apiTester.via.${via}Title`);
			used.add(`apiTester.response.via.${via}`);
		});
		["none", "bearer", "basic"].forEach((type) => used.add(`apiTester.auth.${type}`));
		["array", "object", "value"].forEach((kind) => used.add(`apiTester.body.${kind}`));
		["emptyUrl", "invalidUrl", "invalidBody"].forEach((code) => used.add(`apiTester.errors.${code}`));
		["network", "aborted", "timeout", "privateAddress", "dnsFailed", "unreachable", "invalidUrl", "invalidRequest", "unauthorized", "tooManyRequests"].forEach(
			(code) => {
				used.add(`apiTester.failure.${code}.title`);
				used.add(`apiTester.failure.${code}.text`);
			}
		);

		expect(used.size).toBeGreaterThan(100);
		expect([...used].filter((key) => !known.has(key))).toEqual([]);
	});
});
