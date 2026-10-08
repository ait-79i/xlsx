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

		const [people, empty] = readWorkbook(buffer);
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
