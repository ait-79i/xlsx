import { autoMapping, buildTables, expandRows, fieldPaths, listPaths, mappingFromSchema } from "./dbMapping";
import { csvCommands, csvFiles, cqlScript, esBulk, generate, mongoFiles, mongoScript, sqlScript } from "./dbTargets";
import { parseSqlSchema } from "./sqlParser";

const orders = [
	{ id: 1001, placed: "2024-03-02", customer: { name: "Amina O'Neil", city: "Rabat" }, tags: ["vip"], lines: [{ sku: "A1", qty: 2 }, { sku: "B2", qty: 1 }] },
	{ id: 1002, placed: "2024-03-04", customer: { name: "Louis", city: "Lyon" }, lines: [{ sku: "C3", qty: 5 }] },
];

const tableOf = (built, name) => built.find((b) => b.table.name === name);
const asObjects = ({ table, rows }) => rows.map((r) => Object.fromEntries(table.columns.map((c, i) => [c.name, r[i]])));

describe("rows from the data", () => {
	test("one row per item, or per element of a list, with its parent and position", () => {
		const rows = expandRows(orders, "lines");
		expect(rows.map((r) => [r.value.sku, r.parent.base.id, r.index, r.row])).toEqual([["A1", 1001, 1, 1], ["B2", 1001, 2, 2], ["C3", 1002, 1, 3]]);
		expect(listPaths(orders)).toEqual(["lines", "tags"]);
		expect(fieldPaths(orders, "lines").map((f) => f.path)).toEqual(["sku", "qty"]);
	});
});

describe("automatic tables", () => {
	const mapping = autoMapping(orders, { rootName: "orders" });
	const built = buildTables(orders, mapping);

	test("nested objects become columns, lists of objects linked tables", () => {
		expect(mapping.tables.map((t) => [t.name, t.rowsFrom])).toEqual([["orders", ""], ["orders_lines", "lines"]]);
		expect(asObjects(tableOf(built, "orders"))[0]).toEqual({
			id: 1001, placed: "2024-03-02", customer_name: "Amina O'Neil", customer_city: "Rabat", tags: ["vip"],
		});
		// the existing id is the key; the lines get a surrogate key and a link to their order
		expect(asObjects(tableOf(built, "orders_lines"))).toEqual([
			{ id: 1, orders_id: 1001, sku: "A1", qty: 2 },
			{ id: 2, orders_id: 1001, sku: "B2", qty: 1 },
			{ id: 3, orders_id: 1002, sku: "C3", qty: 5 },
		]);
	});

	test("without an id, rows are numbered and children point to that number", () => {
		const data = [{ name: "a", items: [{ v: 1 }] }, { name: "b", items: [{ v: 2 }, { v: 3 }] }];
		const b = buildTables(data, autoMapping(data));
		expect(asObjects(tableOf(b, "data_items")).map((r) => [r.id, r.data_id, r.v])).toEqual([[1, 1, 1], [2, 2, 2], [3, 2, 3]]);
	});

	test("document databases keep each item as it is", () => {
		const m = autoMapping(orders, { rootName: "orders", flatten: false });
		expect(m.tables).toHaveLength(1);
		expect(asObjects(buildTables(orders, m)[0])[0].customer).toEqual({ name: "Amina O'Neil", city: "Rabat" });
	});

	test("column types convert the values and count the failures", () => {
		const m = autoMapping(orders, { rootName: "orders" });
		m.tables[0].columns.find((c) => c.name === "customer_city").type = "integer";
		const b = buildTables(orders, m);
		expect(b[0].issues.get("customer_city")).toBe(2);
	});
});

describe("your own tables", () => {
	const ddl = `
		CREATE TABLE orders (order_id INT PRIMARY KEY, placed DATE, customer_name VARCHAR(100));
		CREATE TABLE order_lines (line_id INT PRIMARY KEY, order_id INT REFERENCES orders(order_id), sku VARCHAR(20), quantity INT);`;

	test("columns are matched by name, a table named after a list reads its rows", () => {
		const mapping = mappingFromSchema(parseSqlSchema(ddl).schema, orders);
		const [o, l] = mapping.tables;
		expect(o.rowsFrom).toBe("");
		expect(o.columns.map((c) => [c.name, c.source])).toEqual([
			["order_id", { kind: "field", path: "id" }],
			["placed", { kind: "field", path: "placed" }],
			["customer_name", { kind: "field", path: "customer.name" }],
		]);
		expect(l.rowsFrom).toBe("lines");
		expect(l.columns.find((c) => c.name === "line_id").source).toEqual({ kind: "row" });
		expect(l.columns.find((c) => c.name === "order_id").source).toEqual({ kind: "parent", path: "id" });
		expect(l.columns.find((c) => c.name === "quantity").source).toEqual({ kind: "none" });
	});
});

describe("scripts and files", () => {
	const mapping = autoMapping(orders, { rootName: "orders" });
	const built = buildTables(orders, mapping);

	test("PostgreSQL: create, insert in a transaction, quotes escaped", () => {
		const sql = sqlScript(built, "postgres");
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS "orders" (');
		expect(sql).toContain('PRIMARY KEY ("id")');
		expect(sql).toContain("BEGIN;");
		expect(sql).toContain(`(1001, '2024-03-02', 'Amina O''Neil', 'Rabat', '["vip"]')`);
		// parents before children
		expect(sql.indexOf('INSERT INTO "orders"')).toBeLessThan(sql.indexOf('INSERT INTO "orders_lines"'));
		expect(sqlScript(built, "postgres", { mode: "upsert" })).toContain('ON CONFLICT ("id") DO UPDATE SET "placed" = excluded."placed"');
		expect(sqlScript(built, "postgres", { mode: "skip", namespace: "shop" })).toContain('INSERT INTO "shop"."orders"');
	});

	test("each database writes its own SQL", () => {
		expect(sqlScript(built, "mysql", { mode: "upsert" })).toContain("AS new\nON DUPLICATE KEY UPDATE `placed` = new.`placed`");
		expect(sqlScript(built, "mariadb", { mode: "upsert" })).toContain("`placed` = VALUES(`placed`)");
		expect(sqlScript(built, "mysql", { mode: "skip" })).toContain("INSERT IGNORE INTO `orders`");
		const mssql = sqlScript(built, "sqlserver", { mode: "upsert" });
		expect(mssql).toContain("IF OBJECT_ID(N'orders', N'U') IS NULL");
		expect(mssql).toContain("MERGE INTO [orders] AS t");
		expect(mssql).toContain("N'Amina O''Neil'");
		const oracle = sqlScript(built, "oracle");
		expect(oracle).toContain("WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;");
		expect(oracle).toContain("INSERT ALL");
		expect(oracle).toContain("SELECT 1 FROM DUAL;");
		expect(sqlScript(built, "sqlite")).toContain("BEGIN TRANSACTION;");
	});

	test("batches", () => {
		const many = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
		const sql = sqlScript(buildTables(many, autoMapping(many)), "postgres", { batchSize: 2, createTables: false });
		expect(sql.match(/INSERT INTO/g)).toHaveLength(3);
	});

	test("CSV files and their import commands", () => {
		const [file] = csvFiles(built);
		expect(file.content.split("\r\n")[1]).toBe('1001,2024-03-02,Amina O\'Neil,Rabat,"[""vip""]"');
		expect(csvCommands(built, "postgres")).toContain("\\copy orders (id, placed, customer_name, customer_city, tags) FROM 'orders.csv' WITH (FORMAT csv, HEADER true)");
		expect(csvCommands(built, "mysql")).toContain("LOAD DATA LOCAL INFILE 'orders.csv' INTO TABLE orders");
	});

	test("MongoDB: script with dates, upserts on the key, and mongoimport files", () => {
		const docs = autoMapping(orders, { rootName: "orders", flatten: false });
		docs.tables[0].columns.find((c) => c.name === "placed").type = "date";
		const b = buildTables(orders, docs);
		const script = mongoScript(b, { namespace: "shop" });
		expect(script).toContain('db = db.getSiblingDB("shop");');
		expect(script).toContain('"placed":new Date("2024-03-02T00:00:00Z")');
		expect(script).toContain("insertMany");
		expect(mongoScript(b, { mode: "upsert" })).toContain('{ updateOne: { filter: {"id":1001}');
		expect(JSON.parse(mongoFiles(b)[0].content.split("\n")[0]).placed).toEqual({ $date: "2024-03-02T00:00:00Z" });
	});

	test("Cassandra and Elasticsearch", () => {
		const cql = cqlScript(built, { namespace: "shop" });
		expect(cql).toContain('CREATE TABLE IF NOT EXISTS "shop"."orders"');
		expect(cql).toContain("BEGIN UNLOGGED BATCH");
		expect(cqlScript(built, { mode: "skip" })).toContain("IF NOT EXISTS;");
		const bulk = esBulk(built).split("\n");
		expect(JSON.parse(bulk[0])).toEqual({ index: { _index: "orders", _id: "1001" } });
		expect(JSON.parse(esBulk(built, { mode: "skip" }).split("\n")[0])).toEqual({ create: { _index: "orders", _id: "1001" } });
	});

	test("one entry point per target and output", () => {
		expect(generate(built, "postgres", "script").files[0].name).toBe("load.sql");
		expect(generate(built, "postgres", "files").files.map((f) => f.name)).toEqual(["orders.csv", "orders_lines.csv"]);
		expect(generate(built, "mongodb", "files").commands).toContain("mongoimport");
		expect(generate(built, "elasticsearch", "script").commands).toContain("_bulk");
	});
});
