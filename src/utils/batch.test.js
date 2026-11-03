import { batchReport, fillTemplate, runBatch, summarize, templateKeys } from "./batch";

test("URL templates use the values of each item", () => {
	expect(templateKeys("https://x.io/c/{{id}}/o/{{ order.ref }}?q={{id}}")).toEqual(["id", "order.ref"]);
	expect(fillTemplate("https://x.io/c/{{id}}/o/{{order.ref}}", { id: 7, order: { ref: "A/1 b" } })).toEqual({
		url: "https://x.io/c/7/o/A%2F1%20b",
		missing: [],
	});
	expect(fillTemplate("https://x.io/c/{{id}}", { name: "x" })).toEqual({ url: "https://x.io/c/", missing: ["id"] });
});

test("sends every item, a limited number at a time, results in item order", async () => {
	let running = 0;
	let peak = 0;
	const send = async (item) => {
		running++;
		peak = Math.max(peak, running);
		await new Promise((r) => setTimeout(r, 5));
		running--;
		if (item === 3) throw Object.assign(new Error("x"), { code: "network" });
		return { status: item === 2 ? 422 : 201, ms: 5 };
	};
	const seen = [];
	const results = await runBatch([1, 2, 3, 4, 5], send, { concurrency: 2, onResult: (r) => seen.push(r.index) });
	expect(peak).toBe(2);
	expect(seen.sort()).toEqual([0, 1, 2, 3, 4]);
	expect(results.map((r) => r.status ?? r.error)).toEqual([201, 422, "network", 201, 201]);
	expect(summarize(results)).toEqual({ done: 5, ok: 3, failed: 2 });
});

test("stopping leaves the remaining items unsent", async () => {
	const controller = new AbortController();
	const send = async (_item, index) => {
		if (index === 1) controller.abort();
		return { status: 200, ms: 1 };
	};
	const results = await runBatch([1, 2, 3, 4], send, { concurrency: 1, signal: controller.signal });
	expect(summarize(results).done).toBe(2);
});

test("CSV report", () => {
	const csv = batchReport([{ index: 0, status: 201, ok: true, ms: 12.4 }, { index: 1, ok: false, error: "network" }], ["https://x.io/1", "https://x.io/2"]);
	expect(csv.split("\n")).toEqual([
		"item,url,status,ok,ms,error,detail",
		'"1","https://x.io/1","201","true","12","",""',
		'"2","https://x.io/2","","false","","network",""',
		"",
	]);
});
