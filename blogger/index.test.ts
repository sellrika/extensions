import { expect, test } from "bun:test";
import type { RouteContext } from "@extensions/types";
import { routes } from "./index.ts";

/*
 * A save stores the pictures an AI tool sent as base64, and keeps none
 * of them when the post is refused.
 */

const PNG = "data:image/png;base64,iVBORw0KGgo=";

/**
 * A route context with data in memory and a fake picture store.
 * @param body What the call sends.
 * @returns The context, what was saved and what was dropped.
 */
function fakeCtx(body: unknown) {
	const values = new Map<string, unknown>();
	const rows = new Map<number, unknown>();
	const saved: string[] = [];
	const dropped: string[] = [];
	const ctx = {
		user: { role: "manager" },
		shop: { id: 7 },
		req: new Request("http://x.io", {
			method: "POST",
			body: JSON.stringify(body),
		}),
		t: (key: string) => key,
		html: { clean: async (html: string) => html },
		uploads: {
			async save(picture: string) {
				if (picture.includes("bad")) return { error: "bad" };
				const url = `/uploads/7/extensions/p${saved.length}.png`;
				saved.push(url);
				return { url };
			},
			async drop(urls: string[]) {
				dropped.push(...urls);
			},
		},
		data: {
			get: async (name: string) => values.get(name) ?? null,
			set: async (name: string, value: unknown) => {
				values.set(name, value);
			},
			lock: (_name: string, run: () => unknown) => run(),
			collection: () => ({
				get: async (id: number) =>
					rows.has(id) ? { id, value: rows.get(id) } : null,
				add: async (value: unknown) => {
					rows.set(rows.size + 1, value);
					return rows.size;
				},
				update: async (id: number, value: unknown) => {
					rows.set(id, value);
				},
			}),
		},
	};
	return { ctx: ctx as unknown as RouteContext, saved, dropped };
}

test("a base64 cover and body pictures are saved; the post keeps their paths", async () => {
	const { ctx, saved } = fakeCtx({
		title: "Hello",
		status: "draft",
		cover: PNG,
		body: `<p>Hi</p><img src="${PNG}"><img src="data:image/gif;base64,R0lGOD">`,
	});
	const post = (await routes["POST /posts"]!(ctx)) as {
		cover: string;
		body: string;
	};
	expect(saved).toHaveLength(3);
	expect(post.cover).toBe(saved[0]!);
	expect(post.body).toBe(
		`<p>Hi</p><img src="${saved[1]}"><img src="${saved[2]}">`,
	);
});

test("a picture that cannot be saved refuses the post and drops the others", async () => {
	const { ctx, saved, dropped } = fakeCtx({
		title: "Hello",
		status: "draft",
		cover: PNG,
		body: '<img src="data:image/png;base64,bad=">',
	});
	const r = (await routes["POST /posts"]!(ctx)) as Response;
	expect(r.status).toBe(422);
	expect(await r.json()).toEqual({ errors: { body: "error.picture_save" } });
	expect(dropped).toEqual(saved);
});

test("a post refused for another reason drops the pictures it saved", async () => {
	const { ctx, saved, dropped } = fakeCtx({ status: "draft", cover: PNG });
	const r = (await routes["POST /posts"]!(ctx)) as Response;
	expect(r.status).toBe(422);
	expect(saved).toHaveLength(1);
	expect(dropped).toEqual(saved);
});
