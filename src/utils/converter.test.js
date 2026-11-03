import * as XLSX from "xlsx";
import {
	buildJson,
	columnNames,
	concatNodes,
	concatValues,
	splitConcat,
	updateConcat,
	fieldsBySource,
	groupNodes,
	initialShape,
	isSpreadsheetFile,
	moveNode,
	moveOut,
	readWorkbook,
	renameNode,
	sheetView,
	convertValue,
	typeIssues,
	setFieldType,
	mappingData,
	applyMapping,
	guessHeaderRow,
	matchHeaderRow,
	mappingColumns,
	setIncluded,
	ungroupNode,
} from "./converter";

const columns = [{ name: "name" }, { name: "city" }, { name: "zip" }];
const rows = [
	["Amina", "Rabat", 10000],
	["Louis", null, 69001],
];

describe("reading", () => {
	test("blank and duplicate headers get unique names", () => {
		expect(columnNames(["id", "", "id", null, "id"], ["A", "B", "C", "D", "E"])).toEqual([
			"id",
			"Column B",
			"id_2",
			"Column D",
			"id_3",
		]);
	});

	test("keeps every column, even when the first rows are empty there", () => {
		const ws = XLSX.utils.aoa_to_sheet([
			["name", "note", "date"],
			["Amina", null, new Date(2024, 2, 1)],
			[null, null, null],
			["Louis", "vip", null],
		]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "People");
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "Empty");
		const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

		const [rawPeople, rawEmpty] = readWorkbook(buffer);
		const people = sheetView(rawPeople);
		const empty = sheetView(rawEmpty);
		expect(people.name).toBe("People");
		expect(people.columns.map((c) => c.name)).toEqual(["name", "note", "date"]);
		expect(people.columns.map((c) => c.letter)).toEqual(["A", "B", "C"]);
		// blank row dropped, dates as yyyy-mm-dd
		expect(people.rows).toEqual([
			["Amina", null, "2024-03-01"],
			["Louis", "vip", null],
		]);
		expect(empty.rows).toEqual([]);
	});

	test("file extensions", () => {
		expect(isSpreadsheetFile("Data.XLSX")).toBe(true);
		expect(isSpreadsheetFile("data.csv")).toBe(true);
		expect(isSpreadsheetFile("data.json")).toBe(false);
	});
});

describe("shape", () => {
	const shape = initialShape(columns);

	test("default output mirrors the sheet", () => {
		expect(buildJson(rows, shape)).toEqual([
			{ name: "Amina", city: "Rabat", zip: 10000 },
			{ name: "Louis", city: null, zip: 69001 },
		]);
	});

	test("empty cells can be omitted or empty strings", () => {
		expect(buildJson(rows, shape, { emptyCells: "omit" })[1]).toEqual({ name: "Louis", zip: 69001 });
		expect(buildJson(rows, shape, { emptyCells: "empty" })[1].city).toBe("");
	});

	test("group, rename inside the group, then ungroup", () => {
		const grouped = groupNodes(shape, ["c1", "c2"], "address").nodes;
		expect(buildJson(rows, grouped)[0]).toEqual({ name: "Amina", address: { city: "Rabat", zip: 10000 } });
		expect(fieldsBySource(grouped).get(2).path).toEqual(["address", "zip"]);

		const renamed = renameNode(grouped, "c1", "town").nodes;
		expect(buildJson(rows, renamed)[0].address).toEqual({ town: "Rabat", zip: 10000 });
		// the sheet column is untouched
		expect(rows[0][1]).toBe("Rabat");

		const flat = ungroupNode(renamed, grouped[1].id).nodes;
		expect(buildJson(rows, flat)[0]).toEqual({ name: "Amina", town: "Rabat", zip: 10000 });
	});

	test("the group takes the place of the first grouped column", () => {
		const grouped = groupNodes(shape, ["c2", "c0"], "who").nodes;
		expect(Object.keys(buildJson(rows, grouped)[0])).toEqual(["who", "city"]);
	});

	test("key validation", () => {
		expect(groupNodes(shape, ["c1"], " ").error).toBe("emptyKey");
		expect(groupNodes(shape, ["c1"], "name").error).toBe("keyTaken");
		expect(groupNodes(shape, [], "x").error).toBe("selectColumn");
		expect(renameNode(shape, "c0", "city").error).toBe("keyTaken");
		// a selected column may give its own name to the group
		expect(groupNodes(shape, ["c1", "c2"], "city").nodes).toBeDefined();
	});

	test("grouping needs keys of the same level", () => {
		const grouped = groupNodes(shape, ["c1", "c2"], "address").nodes;
		expect(groupNodes(grouped, ["c0", "c1"], "x").error).toBe("sameLevel");
	});

	test("move out of a group removes the emptied group", () => {
		const grouped = groupNodes(shape, ["c1"], "address").nodes;
		const out = moveOut(grouped, "c1").nodes;
		expect(buildJson(rows, out)[0]).toEqual({ name: "Amina", city: "Rabat", zip: 10000 });
	});

	test("exclude and reorder", () => {
		const hidden = setIncluded(shape, ["c0"], false);
		expect(buildJson(rows, hidden)[0]).toEqual({ city: "Rabat", zip: 10000 });
		const moved = moveNode(shape, "c2", -1).nodes;
		expect(Object.keys(buildJson(rows, moved)[0])).toEqual(["name", "zip", "city"]);
	});

	test("a group whose fields are all excluded disappears", () => {
		const grouped = groupNodes(shape, ["c1", "c2"], "address").nodes;
		expect(buildJson(rows, setIncluded(grouped, ["c1", "c2"], false))[0]).toEqual({ name: "Amina" });
	});
});

describe("concatenation", () => {
	const cols = [{ name: "first" }, { name: "last" }, { name: "city" }, { name: "zip" }];
	const people = [
		["Amina", "Benali", "Rabat", 10000],
		["Louis", null, "Lyon", 69001],
		[null, null, null, null],
	];
	const shape = initialShape(cols);

	test("joins values in the chosen order, with the separator", () => {
		const r = concatNodes(shape, ["c1", "c0"], { key: "fullName", separator: ", " });
		expect(buildJson(people, r.nodes)[0]).toEqual({ fullName: "Benali, Amina", city: "Rabat", zip: 10000 });
		// the combined key takes the place of the first part
		expect(Object.keys(buildJson(people, r.nodes)[0])[0]).toBe("fullName");
	});

	test("empty values are skipped, or kept to keep positions", () => {
		const skip = concatNodes(shape, ["c0", "c1"], { key: "name", separator: " " }).nodes;
		expect(buildJson(people, skip)[1].name).toBe("Louis");
		const keep = concatNodes(shape, ["c0", "c1"], { key: "name", separator: "|", skipEmpty: false }).nodes;
		expect(buildJson(people, keep)[1].name).toBe("Louis|");
		// nothing at all -> treated like an empty cell
		expect(buildJson(people, skip)[2].name).toBeNull();
		expect(buildJson(people, skip, { emptyCells: "omit" })[2]).toEqual({});
	});

	test("numbers become text", () => {
		const r = concatNodes(shape, ["c3", "c2"], { key: "place", separator: " " }).nodes;
		expect(buildJson(people, r)[0].place).toBe("10000 Rabat");
	});

	test("edit order, separator and key; then split back", () => {
		const made = concatNodes(shape, ["c0", "c1"], { key: "name", separator: " " }).nodes;
		const id = made[0].id;
		const edited = updateConcat(made, id, { key: "full", separator: "-", order: ["c1", "c0"] }).nodes;
		expect(buildJson(people, edited)[0].full).toBe("Benali-Amina");
		expect(updateConcat(made, id, { key: "city" }).error).toBe("keyTaken");

		const split = splitConcat(edited, id).nodes;
		expect(buildJson(people, split)[0]).toEqual({ last: "Benali", first: "Amina", city: "Rabat", zip: 10000 });
	});

	test("validation", () => {
		expect(concatNodes(shape, ["c0"], { key: "x" }).error).toBe("concatTwo");
		expect(concatNodes(shape, ["c0", "c1"], { key: "city" }).error).toBe("keyTaken");
		const grouped = groupNodes(shape, ["c2", "c3"], "address").nodes;
		expect(concatNodes(grouped, ["c0", grouped[2].id], { key: "x" }).error).toBe("concatFields");
		expect(concatNodes(grouped, ["c0", "c2"], { key: "x" }).error).toBe("sameLevel");
	});

	test("the sheet shows the combined key on each part's column, and it can be left out", () => {
		const made = concatNodes(shape, ["c0", "c1"], { key: "name" }).nodes;
		expect(fieldsBySource(made).get(1)).toMatchObject({ id: made[0].id, path: ["name"], concat: true });
		expect(buildJson(people, setIncluded(made, [made[0].id], false))[0]).toEqual({ city: "Rabat", zip: 10000 });
	});

	test("values of any kind", () => {
		expect(concatValues(["a", 1, true, ["x", "y"]], { separator: " / " })).toBe("a / 1 / true / x, y");
		expect(concatValues(["", "  ", null])).toBeNull();
	});
});

describe("header row", () => {
	const sheet = {
		name: "Report",
		letters: ["A", "B"],
		matrix: [["Sales report 2024", null], ["name", "total"], ["Amina", 10], ["Louis", 20]],
		headerRow: 0,
	};

	test("the first row by default, any row when chosen", () => {
		expect(sheetView(sheet).columns.map((c) => c.name)).toEqual(["Sales report 2024", "Column B"]);
		const view = sheetView({ ...sheet, headerRow: 1 });
		expect(view.columns.map((c) => c.name)).toEqual(["name", "total"]);
		expect(view.rows).toEqual([["Amina", 10], ["Louis", 20]]);
		expect(view.rowCount).toBe(2);
	});

	test("sheets saved before this option still open", () => {
		const old = { name: "x", columns: [{ name: "a", letter: "A" }], rows: [[1]] };
		expect(sheetView(old)).toMatchObject({ columns: old.columns, rows: old.rows, headerRow: 0 });
	});
});

describe("value types", () => {
	test.each([
		["number", "1 234,5", 1234.5],
		["number", "1,234.5", 1234.5],
		["number", "1.234,5", 1234.5],
		["number", " 42 ", 42],
		["integer", "7", 7],
		["text", 20250, "20250"],
		["boolean", "Oui", true],
		["boolean", "no", false],
		["boolean", 1, true],
		["date", "31/12/2024", "2024-12-31"],
		["date", "2024-03-01T10:00:00", "2024-03-01"],
		["date", 45292, "2024-01-01"],
		["auto", "20250", "20250"],
	])("%s: %p -> %p", (type, input, expected) => {
		expect(convertValue(input, type)).toEqual({ value: expected, ok: true });
	});

	test.each([
		["number", "abc"],
		["integer", "1.5"],
		["boolean", "maybe"],
		["date", "13/13/2024"],
	])("%s: %p cannot be converted and becomes null", (type, input) => {
		expect(convertValue(input, type)).toEqual({ value: null, ok: false });
	});

	test("empty cells stay empty whatever the type", () => {
		expect(convertValue(null, "number")).toEqual({ value: null, ok: true });
	});

	test("typed keys in the output, and the values that failed", () => {
		const cols = [{ name: "zip" }, { name: "active" }];
		const rows = [[10000, "yes"], ["n/a", "no"]];
		let shape = initialShape(cols);
		shape = setFieldType(shape, "c0", "text").nodes;
		shape = setFieldType(shape, "c1", "boolean").nodes;
		expect(buildJson(rows, shape)).toEqual([{ zip: "10000", active: true }, { zip: "n/a", active: false }]);

		shape = setFieldType(shape, "c0", "integer").nodes;
		expect(buildJson(rows, shape)[1].zip).toBeNull();
		const issues = typeIssues((field) => rows.map((r) => r[field.source]), shape);
		expect([...issues]).toEqual([["c0", 1]]);
	});
});

describe("saved structures", () => {
	const cols = [{ name: "first" }, { name: "last" }, { name: "city" }, { name: "zip" }];

	test("applied by column name to a file with moved, missing and new columns", () => {
		let shape = initialShape(cols);
		shape = groupNodes(shape, ["c2", "c3"], "address").nodes;
		shape = concatNodes(shape, ["c0", "c1"], { key: "name", separator: " " }).nodes;
		shape = setFieldType(shape, "c3", "text").nodes;
		const data = JSON.parse(JSON.stringify(mappingData(shape, cols, { emptyCells: "omit" })));
		expect(data.options).toEqual({ emptyCells: "omit" });

		// new file: columns in another order, no "last", a new "email"
		const next = [{ name: "zip" }, { name: "email" }, { name: "first" }, { name: "city" }];
		const { nodes, missing, added } = applyMapping(data, next);
		expect(missing).toEqual(["last"]);
		expect(added).toEqual(["email"]);
		const rows = [[10000, "a@b.c", "Amina", "Rabat"]];
		expect(buildJson(rows, nodes)).toEqual([{ name: "Amina", address: { city: "Rabat", zip: "10000" }, email: "a@b.c" }]);
	});
});

describe("finding the header row", () => {
	test("skips a title and notes above the table", () => {
		expect(guessHeaderRow([["Orders report"], ["order", "customer", "zip"], [1, "Amina", 20250]])).toBe(1);
		expect(guessHeaderRow([["Exported 2025-01-31", null, null], ["Source: CRM", null, null], ["id", "name", "city"], [1, "a", "b"]])).toBe(2);
	});

	test("keeps the first row for a plain table", () => {
		expect(guessHeaderRow([["id", "name"], [1, "Amina"]])).toBe(0);
		expect(guessHeaderRow([[1, 2], [3, 4]])).toBe(0);
	});

	test("a saved structure finds the row with its column names", () => {
		const sheet = { letters: ["A", "B", "C"], matrix: [["Report", null, null], ["zip", "order", "email"], [1, 2, 3]] };
		expect(matchHeaderRow(sheet, ["order", "zip", "paid"])).toBe(1);
		expect(mappingColumns({ shape: [{ kind: "group", children: [{ kind: "field", column: "zip" }] }, { kind: "field", column: "order" }] })).toEqual(["zip", "order"]);
	});
});
