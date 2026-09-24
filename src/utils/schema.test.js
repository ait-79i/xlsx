import {
	inferSchema,
	inferValueType,
	mergeTypes,
	sanitizeName,
	applySchemaOverrides,
	schemaRelations,
} from "./schemaInference";
import {
	generateCreateTables,
	generateInserts,
	generateMermaid,
	sqlLiteral,
	sortTablesByDependencies,
} from "./sqlGenerator";
import { parseSqlSchema, mapSqlType } from "./sqlParser";

const orders = [
	{
		id: 10,
		"Nom client": "Léa",
		total: 12.5,
		paid: true,
		created: "2024-01-02",
		address: { city: "Paris", zip: "75001" },
		items: [
			{ sku: "A", qty: 1 },
			{ sku: "B", qty: 2 },
		],
		tags: ["new", "vip"],
	},
	{
		id: 11,
		"Nom client": "Omar",
		total: 3,
		paid: false,
		created: "2024-01-03",
		address: { city: "Lyon", zip: null },
		items: [{ sku: "A", qty: 5 }],
		tags: [],
	},
];

const table = (schema, name) => schema.tables.find((t) => t.name === name);
const column = (t, name) => t.columns.find((c) => c.name === name);

describe("type inference", () => {
	test("detects value types", () => {
		expect(inferValueType(1)).toBe("integer");
		expect(inferValueType(2 ** 40)).toBe("bigint");
		expect(inferValueType(1.5)).toBe("float");
		expect(inferValueType(true)).toBe("boolean");
		expect(inferValueType("2024-01-02")).toBe("date");
		expect(inferValueType("2024-01-02T10:00:00Z")).toBe("datetime");
		expect(inferValueType("hello")).toBe("string");
		expect(inferValueType(null)).toBeNull();
	});

	test("merges types", () => {
		expect(mergeTypes("integer", "float")).toBe("float");
		expect(mergeTypes("date", "datetime")).toBe("datetime");
		expect(mergeTypes("integer", "string")).toBe("string");
		expect(mergeTypes(null, "boolean")).toBe("boolean");
	});

	test("sanitizes names", () => {
		expect(sanitizeName("Nom client")).toBe("nom_client");
		expect(sanitizeName("Prénom")).toBe("prenom");
		expect(sanitizeName("2024")).toBe("c_2024");
		expect(sanitizeName("***")).toBe("col");
	});
});

describe("inferSchema", () => {
	const schema = inferSchema(orders, { rootName: "orders" });

	test("creates one table per nested structure", () => {
		expect(schema.tables.map((t) => t.name)).toEqual([
			"orders",
			"address",
			"items",
			"orders_tags",
		]);
	});

	test("reuses a unique integer id as primary key", () => {
		const t = table(schema, "orders");
		expect(t.columns[0]).toMatchObject({ name: "id", pk: true, type: "integer" });
		expect(t.columns.filter((c) => c.pk)).toHaveLength(1);
	});

	test("infers column types and nullability", () => {
		const t = table(schema, "orders");
		expect(column(t, "nom_client")).toMatchObject({ type: "string", nullable: false });
		expect(column(t, "total").type).toBe("float");
		expect(column(t, "paid").type).toBe("boolean");
		expect(column(t, "created").type).toBe("date");
		expect(column(table(schema, "address"), "zip").nullable).toBe(true);
	});

	test("links child tables with foreign keys and ids", () => {
		const items = table(schema, "items");
		expect(column(items, "id")).toMatchObject({ pk: true });
		expect(column(items, "orders_id").fk).toEqual({
			tableId: "$",
			column: "id",
			cardinality: "1:N",
		});
		expect(items.rows.map((r) => r.orders_id)).toEqual([10, 10, 11]);
		expect(column(table(schema, "address"), "orders_id").fk.cardinality).toBe("1:1");

		const tags = table(schema, "orders_tags");
		expect(tags.rows).toEqual([
			{ value: "new", id: 1, orders_id: 10 },
			{ value: "vip", id: 2, orders_id: 10 },
		]);
	});

	test("adds a surrogate key when id is not usable", () => {
		const s = inferSchema([{ id: "a" }, { id: "a" }]);
		const t = s.tables[0];
		expect(t.columns.map((c) => c.name)).toEqual(["row_id", "id"]);
		expect(t.rows.map((r) => r.row_id)).toEqual([1, 2]);
	});

	test("handles objects, primitives and empty input", () => {
		expect(inferSchema({ a: 1 }).tables[0].rows).toEqual([{ a: 1, id: 1 }]);
		expect(inferSchema([1, 2]).tables[0].columns.map((c) => c.name)).toEqual([
			"id",
			"value",
		]);
		expect(inferSchema([]).tables).toEqual([]);
	});

	test("lists relations and applies overrides", () => {
		expect(schemaRelations(schema)).toHaveLength(3);
		const edited = applySchemaOverrides(schema, {
			tableNames: { $: "commandes" },
			columnTypes: { "$::total": "decimal" },
		});
		expect(table(edited, "commandes")).toBeDefined();
		expect(column(table(edited, "commandes"), "total").type).toBe("decimal");
	});
});

describe("SQL generation", () => {
	const schema = inferSchema(orders, { rootName: "orders" });

	test("creates tables with keys", () => {
		const sql = generateCreateTables(schema, "postgres");
		expect(sql).toContain('CREATE TABLE "orders" (\n  "id" INTEGER NOT NULL,');
		expect(sql).toContain('"nom_client" VARCHAR(255) NOT NULL');
		expect(sql).toContain('FOREIGN KEY ("orders_id") REFERENCES "orders" ("id")');
		expect(sql.indexOf('CREATE TABLE "orders"')).toBeLessThan(
			sql.indexOf('CREATE TABLE "items"')
		);
	});

	test("uses the dialect types and quotes", () => {
		const sql = generateCreateTables(schema, "mysql");
		expect(sql).toContain("`paid` BOOLEAN NOT NULL");
		expect(sql).toContain("ENGINE=InnoDB");
		expect(generateCreateTables(schema, "sqlserver")).toContain("[total] FLOAT NOT NULL");
	});

	test("escapes literals", () => {
		expect(sqlLiteral("l'été")).toBe("'l''été'");
		expect(sqlLiteral("a\\b", "mysql")).toBe("'a\\\\b'");
		expect(sqlLiteral(true, "sqlite")).toBe("1");
		expect(sqlLiteral(null)).toBe("NULL");
		expect(sqlLiteral(NaN)).toBe("NULL");
	});

	test("generates inserts in dependency order", () => {
		const sql = generateInserts(schema, "postgres");
		expect(sql).toContain(`INSERT INTO "orders" ("id", "nom_client"`);
		expect(sql).toContain(`(10, 'Léa', 12.5, TRUE, '2024-01-02')`);
		expect(sql.indexOf('INSERT INTO "orders"')).toBeLessThan(
			sql.indexOf('INSERT INTO "items"')
		);
	});

	test("generates a mermaid diagram", () => {
		const mermaid = generateMermaid(schema);
		expect(mermaid).toContain('orders ||--o{ items : "orders_id"');
		expect(mermaid).toContain('orders ||--|| address : "orders_id"');
		expect(mermaid).toContain("integer id PK");
	});
});

describe("SQL parser", () => {
	const sql = `
		-- users
		CREATE TABLE IF NOT EXISTS "public"."users" (
			id SERIAL PRIMARY KEY,
			email VARCHAR(120) NOT NULL UNIQUE,
			price NUMERIC(10, 2) DEFAULT 0,
			created_at timestamp with time zone,
			key VARCHAR(10)
		);
		CREATE TABLE \`posts\` (
			\`id\` int NOT NULL AUTO_INCREMENT,
			\`user_id\` int NOT NULL,
			\`title\` text,
			PRIMARY KEY (\`id\`),
			KEY \`idx_user\` (\`user_id\`),
			CONSTRAINT \`fk_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
		) ENGINE=InnoDB;
		CREATE TABLE comments (
			id integer primary key,
			post_id integer references posts,
			body text check (length(body) > 0)
		);
		CREATE TABLE profiles (user_id int PRIMARY KEY, bio text);
		ALTER TABLE ONLY profiles ADD CONSTRAINT fk_p FOREIGN KEY (user_id) REFERENCES users(id);
	`;
	const { schema, errors } = parseSqlSchema(sql);

	test("reads tables and columns", () => {
		expect(errors).toEqual([]);
		expect(schema.tables.map((t) => t.name)).toEqual([
			"users",
			"posts",
			"comments",
			"profiles",
		]);
		const users = table(schema, "users");
		expect(users.columns.map((c) => c.name)).toEqual([
			"id",
			"email",
			"price",
			"created_at",
			"key",
		]);
		expect(column(users, "id")).toMatchObject({ pk: true, type: "integer" });
		expect(column(users, "email")).toMatchObject({
			type: "string",
			length: 120,
			nullable: false,
			unique: true,
		});
		expect(column(users, "price")).toMatchObject({ type: "decimal", rawType: "NUMERIC(10, 2)" });
		expect(column(users, "created_at").type).toBe("datetime");
	});

	test("reads primary and foreign keys", () => {
		const posts = table(schema, "posts");
		expect(column(posts, "id").pk).toBe(true);
		expect(posts.columns).toHaveLength(3);
		expect(column(posts, "user_id").fk).toEqual({
			tableId: "users",
			column: "id",
			cardinality: "1:N",
		});
		// REFERENCES without column -> primary key of the target
		expect(column(table(schema, "comments"), "post_id").fk.column).toBe("id");
		// ALTER TABLE ... FOREIGN KEY on a primary key -> 1:1
		expect(column(table(schema, "profiles"), "user_id").fk.cardinality).toBe("1:1");
	});

	test("reports errors", () => {
		expect(parseSqlSchema("SELECT 1").errors).toEqual(["No CREATE TABLE statement found."]);
		expect(
			parseSqlSchema("CREATE TABLE a (b_id int REFERENCES b(id));").errors[0]
		).toContain('referenced table "b" not found');
	});

	test("maps SQL types", () => {
		expect(mapSqlType("tinyint(1)").type).toBe("boolean");
		expect(mapSqlType("BIGSERIAL").type).toBe("bigint");
		expect(mapSqlType("double precision").type).toBe("float");
		expect(mapSqlType("uuid")).toEqual({ type: "string", length: 36 });
		expect(mapSqlType("NVARCHAR(MAX)").type).toBe("text");
	});

	test("round trips through the generator", () => {
		const regenerated = parseSqlSchema(generateCreateTables(schema, "mysql")).schema;
		expect(sortTablesByDependencies(regenerated).map((t) => t.name)).toEqual(
			sortTablesByDependencies(schema).map((t) => t.name)
		);
		expect(column(table(regenerated, "posts"), "user_id").fk.tableId).toBe("users");
	});
});
