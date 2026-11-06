/**
 * Blogger: a blog for the shop's online store.
 * Staff write posts on the Blog page (`routes`).
 * The store shows them at `/blogs` and `/blogs/<slug>` (`publicRoutes`),
 * links the blog in its menu and lists the posts in its sitemap
 * (`storefront`).
 * Posts are kept in `ctx.data`: one record per post, and one record
 * (the index) with every post's list entry.
 */
import type {
	ExtensionData,
	RouteContext,
	Routes,
	StorefrontContext,
	StorefrontHooks,
} from "@extensions/types";
import {
	BLOG_PATH,
	checkPost,
	isLive,
	livePosts,
	metaOf,
	pageOf,
	picturesOf,
	POSTS_MAX,
	slugify,
	tagsOf,
	type Errors,
	type Meta,
	type Post,
	type PostInput,
} from "./assets/posts.ts";
import {
	listData,
	listHtml,
	pageHtml,
	postData,
	postHtml,
	postPath,
	type Frame,
	type Look,
} from "./lib/render.ts";
import { FEED_SIZE, feedXml } from "./lib/feed.ts";

/** The name of the list that holds the posts, one record each. */
const POSTS = "posts";

/** The name of the record that holds every post's list entry. */
const INDEX = "index";

/** The name of the lock every change of the posts runs under. */
const LOCK = "posts";

/** The fields of a post a create or an update may set. */
const EDITABLE = [
	"title",
	"slug",
	"summary",
	"cover",
	"body",
	"tags",
	"status",
	"published_at",
] as const;

/** How many pictures sent as base64 one save may store. */
const PICTURES_MAX = 20;

/** A picture sent as base64 inside the body's HTML. */
const DATA_PICTURE = /data:image\/[\w.+-]+;base64,[A-Za-z0-9+/]+={0,2}/g;

/** How many other posts a post's page offers to read next. */
const MORE_POSTS = 3;

/**
 * A JSON answer with a status.
 * @param body What to send.
 * @param status The HTTP status.
 * @returns The response.
 */
function answer(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

/**
 * The "not there" answer. On a store page the app shows the theme's
 * own not-found page for it.
 * @returns A 404 response.
 */
function gone(): Response {
	return answer({ error: "not_found" }, 404);
}

/**
 * Stop a cashier: managers and admins write posts.
 * @param ctx The route's context.
 * @returns A 403 answer for a cashier, else null.
 */
function refuse(ctx: RouteContext): Response | null {
	return ctx.user && ctx.user.role !== "cashier"
		? null
		: answer({ error: ctx.t("error.forbidden") }, 403);
}

/**
 * Every post's list entry.
 * @param data The shop's data of this extension.
 * @returns The index, [] for a shop with no post yet.
 */
async function readIndex(data: ExtensionData): Promise<Meta[]> {
	return (await data.get<Meta[]>(INDEX)) ?? [];
}

/**
 * The errors of a form, with each dictionary key turned into its text.
 * @param ctx The route's context.
 * @param errors Field name → dictionary key.
 * @returns The 422 answer.
 */
function invalid(ctx: RouteContext, errors: Errors): Response {
	const texts: Errors = {};
	for (const [field, key] of Object.entries(errors)) texts[field] = ctx.t(key);
	return answer({ errors: texts }, 422);
}

/**
 * Store the pictures an AI tool or the API sent as text.
 * A cover that is base64 or an https link, and every base64 picture in
 * the body, are saved to the shop's storage. Their paths take their
 * place in `input`.
 * @param ctx The route's context.
 * @param input What the call sent. Changed in place.
 * @returns The new paths, and the errors by field (dictionary keys).
 */
async function storePictures(
	ctx: RouteContext,
	input: PostInput,
): Promise<{ saved: string[]; errors: Errors }> {
	const saved: string[] = [];
	const errors: Errors = {};
	const cover = typeof input.cover === "string" ? input.cover.trim() : "";
	if (cover && !cover.startsWith("/uploads/")) {
		const r = await ctx.uploads.save(cover);
		if ("url" in r) {
			input.cover = r.url;
			saved.push(r.url);
		} else errors.cover = "error.picture_save";
	}
	if (typeof input.body !== "string") return { saved, errors };
	let body = input.body;
	const found = [...new Set(body.match(DATA_PICTURE) ?? [])];
	if (found.length > PICTURES_MAX) {
		errors.body = "error.too_many_pictures";
		return { saved, errors };
	}
	for (const data of found) {
		const r = await ctx.uploads.save(data);
		if ("error" in r) {
			errors.body = "error.picture_save";
			break;
		}
		body = body.replaceAll(data, r.url);
		saved.push(r.url);
	}
	input.body = body;
	return { saved, errors };
}

/**
 * Save a new post or a change of one.
 * The whole "read the index, check, write" runs under one lock, so two
 * saves at the same moment can't take the same link name.
 * Pictures sent as text are stored first (`storePictures`).
 * Pictures the post stopped using are handed back to the app.
 * @param ctx The route's context.
 * @param id The post to change, or null for a new one.
 * @returns The saved post, or the 404 / 422 answer.
 */
async function save(ctx: RouteContext, id: number | null) {
	const denied = refuse(ctx);
	if (denied) return denied;
	const input = ((await ctx.req.json().catch(() => null)) ?? {}) as PostInput;
	// stored before the lock: a download may take a while
	const pictures = await storePictures(ctx, input);
	if (Object.keys(pictures.errors).length) {
		await ctx.uploads.drop(pictures.saved);
		return invalid(ctx, pictures.errors);
	}
	const posts = ctx.data.collection<Omit<Post, "id">>(POSTS);
	const result = await ctx.data.lock(LOCK, async function write() {
		const index = await readIndex(ctx.data);
		const row = id === null ? null : await posts.get(id);
		if (id !== null && !row) return gone();
		if (id === null && index.length >= POSTS_MAX)
			return invalid(ctx, { title: "error.too_many" });
		const before = row ? { ...row.value, id: row.id } : undefined;
		// an update keeps every field the call leaves out:
		// an AI tool may send only the title, and the body must stay
		if (before)
			for (const field of EDITABLE)
				if (!Object.hasOwn(input, field)) input[field] = before[field];
		// what a person typed is cleaned before it is kept
		input.body = await ctx.html.clean(String(input.body ?? ""));
		const taken: string[] = [];
		for (const one of index) if (one.id !== id) taken.push(one.slug);
		const checked = checkPost(input, {
			shopId: ctx.shop.id,
			taken,
			before,
			now: new Date(),
		});
		if (checked.errors) return invalid(ctx, checked.errors);
		const savedId = id ?? (await posts.add(checked.post));
		if (id !== null) await posts.update(id, checked.post);
		const post: Post = { ...checked.post, id: savedId };
		const rest = index.filter((one) => one.id !== savedId);
		await ctx.data.set(INDEX, [metaOf(post), ...rest]);
		if (before) {
			const kept = new Set(picturesOf(post));
			await ctx.uploads.drop(
				picturesOf(before).filter((url) => !kept.has(url)),
			);
		}
		return post;
	});
	// a refused save keeps none of the pictures it stored
	if (result instanceof Response) await ctx.uploads.drop(pictures.saved);
	return result;
}

/**
 * Staff routes, at `/ext/blogger/…`. The Blog page calls them.
 */
export const routes: Routes = {
	/** The list: every post without its body, and the tags in use. */
	"GET /posts": async (ctx) => {
		const denied = refuse(ctx);
		if (denied) return denied;
		const index = await readIndex(ctx.data);
		return {
			posts: index,
			tags: tagsOf(index),
			blog_url: ctx.store_url + BLOG_PATH,
		};
	},

	/** One post with its body, for the form. */
	"GET /posts/:id": async (ctx) => {
		const denied = refuse(ctx);
		if (denied) return denied;
		const row = await ctx.data
			.collection<Omit<Post, "id">>(POSTS)
			.get(Number(ctx.params.id));
		return row ? { ...row.value, id: row.id } : gone();
	},

	"POST /posts": (ctx) => save(ctx, null),

	"PUT /posts/:id": (ctx) => save(ctx, Number(ctx.params.id)),

	/** Delete a post. Its pictures go when nothing else uses them. */
	"DELETE /posts/:id": async (ctx) => {
		const denied = refuse(ctx);
		if (denied) return denied;
		const id = Number(ctx.params.id);
		const posts = ctx.data.collection<Omit<Post, "id">>(POSTS);
		return ctx.data.lock(LOCK, async function remove() {
			const row = await posts.get(id);
			if (!row) return gone();
			await posts.delete(id);
			const index = await readIndex(ctx.data);
			await ctx.data.set(
				INDEX,
				index.filter((one) => one.id !== id),
			);
			await ctx.uploads.drop(picturesOf(row.value));
			return { deleted: true };
		});
	},
};

/**
 * The texts and the date format of a store page.
 * @param ctx The route's context.
 * @returns What lib/render.ts needs.
 */
function lookOf(ctx: RouteContext): Look {
	const format = new Intl.DateTimeFormat(ctx.locale, {
		dateStyle: "long",
		timeZone: ctx.shop.timezone || undefined,
	});
	return { t: ctx.t, date: (iso) => format.format(new Date(iso)) };
}

/**
 * The blog's list page: every live post, or the ones of a tag.
 * @param ctx The route's context.
 * @param tag The tag's slug, "" for all posts.
 * @returns The page, or 404 for a tag no live post has.
 */
async function listPage(ctx: RouteContext, tag: string) {
	if (!ctx.storefront) return gone();
	const now = new Date();
	const index = await readIndex(ctx.data);
	const all = livePosts(index, now);
	const tags = tagsOf(all);
	const name = tags.find((one) => slugify(one) === tag);
	if (tag && !name) return gone();
	const found = tag ? livePosts(index, now, tag) : all;
	const { items, page, last } = pageOf(
		found,
		Number(ctx.url.searchParams.get("page")),
	);
	const base = tag ? `${BLOG_PATH}/tag/${encodeURIComponent(tag)}` : BLOG_PATH;
	const title = name
		? ctx.t("store.tag_title", { tag: name })
		: ctx.t("store.title");
	const counts: Record<string, number> = {};
	for (const post of all)
		for (const one of post.tags)
			counts[slugify(one)] = (counts[slugify(one)] ?? 0) + 1;
	const body = listHtml(
		{
			title,
			intro: ctx.t("store.intro"),
			posts: items,
			tags,
			counts,
			total: all.length,
			tag,
			page,
			last,
		},
		lookOf(ctx),
	);
	const frame = frameOf(ctx, title, pathOf(base, page));
	frame.description = ctx.t("store.description", { shop: ctx.shop.name });
	// the share picture of a list: the cover of its newest post
	frame.image = fullUrl(ctx, items.find((post) => post.cover)?.cover ?? null);
	frame.prev = page > 1 ? fullUrl(ctx, pathOf(base, page - 1)) : null;
	frame.next = page < last ? fullUrl(ctx, pathOf(base, page + 1)) : null;
	frame.data = listData(frame, items, `${ctx.store_url}${BLOG_PATH}`, (post) =>
		fullUrl(ctx, post.cover),
	);
	return ctx.storefront.page({ html: pageHtml(frame, body) });
}

/**
 * What goes around a store page of the blog.
 * @param ctx The route's context.
 * @param title The page's title.
 * @param path The page's path in the store.
 * @returns The frame for `pageHtml`.
 */
function frameOf(ctx: RouteContext, title: string, path: string): Frame {
	return {
		lang: ctx.locale,
		title,
		description: "",
		url: `${ctx.store_url}${path}`,
		image: null,
		shop: ctx.shop.name,
		home: ctx.store_url,
		link: linkOf(ctx),
		t: ctx.t,
		type: "website",
		logo: fullUrl(ctx, ctx.shop.logo),
		data: [],
	};
}

/**
 * The blog's own button from the settings, when the shop set a link.
 * @param ctx The route's context.
 * @returns The link and its text, or null to lead to the store.
 */
function linkOf(ctx: RouteContext): Frame["link"] {
	const url = String(ctx.config.link_url ?? "").trim();
	if (!url.startsWith("https://")) return null;
	return { url, text: String(ctx.config.link_text ?? "").trim() };
}

/**
 * A full address for a path of the store.
 * An upload path gets the store's address in front; an https link stays.
 * @param ctx The route's context.
 * @param path The path or link, or null.
 * @returns The full address, or null.
 */
function fullUrl(ctx: RouteContext, path: string | null): string | null {
	if (!path) return null;
	return path.startsWith("/") ? `${ctx.store_url}${path}` : path;
}

/**
 * The path of one page of a list.
 * @param base The list's own path (the blog, or one tag).
 * @param page The page, from 1.
 * @returns The path. The first page has no number.
 */
function pathOf(base: string, page: number): string {
	return page > 1 ? `${base}?page=${page}` : base;
}

/**
 * Store routes. On the store's host they answer below `/blogs`
 * (manifest `storefront.path`).
 */
export const publicRoutes: Routes = {
	"GET /blogs": (ctx) => listPage(ctx, ""),

	"GET /blogs/tag/:tag": (ctx) => listPage(ctx, slugify(ctx.params.tag ?? "")),

	/** One post. A draft, or a post dated in the future, is not there. */
	/** The RSS feed. Before `/blogs/:slug`: the first route that fits wins. */
	"GET /blogs/feed.xml": async (ctx) => {
		const now = new Date();
		const live = livePosts(await readIndex(ctx.data), now).slice(0, FEED_SIZE);
		const posts: Post[] = [];
		for (const meta of live) {
			const row = await ctx.data
				.collection<Omit<Post, "id">>(POSTS)
				.get(meta.id);
			if (row) posts.push({ ...row.value, id: row.id });
		}
		const xml = feedXml(
			{
				title: `${ctx.t("store.title")} · ${ctx.shop.name}`,
				description: ctx.t("store.description", { shop: ctx.shop.name }),
				home: ctx.store_url,
				lang: ctx.locale,
			},
			posts,
		);
		return new Response(xml, {
			headers: {
				"content-type": "application/rss+xml; charset=utf-8",
				"cache-control": "public, max-age=900",
			},
		});
	},

	"GET /blogs/:slug": async (ctx) => {
		if (!ctx.storefront) return gone();
		const now = new Date();
		const index = await readIndex(ctx.data);
		const meta = index.find((one) => one.slug === ctx.params.slug);
		if (!meta || !isLive(meta, now)) return gone();
		const row = await ctx.data.collection<Omit<Post, "id">>(POSTS).get(meta.id);
		if (!row) return gone();
		const post: Post = { ...row.value, id: row.id };
		const more = livePosts(index, now)
			.filter((one) => one.id !== post.id)
			.slice(0, MORE_POSTS);
		const frame = frameOf(ctx, post.title, postPath(post));
		frame.description =
			post.summary || ctx.t("store.description", { shop: ctx.shop.name });
		frame.image = fullUrl(ctx, post.cover);
		frame.type = "article";
		frame.article = {
			published: post.published_at,
			modified: post.updated_at,
			tags: post.tags,
		};
		frame.data = postData(frame, post, `${ctx.store_url}${BLOG_PATH}`);
		const body = postHtml(post, more, frame.url, ctx.shop.name, lookOf(ctx));
		return ctx.storefront.page({ html: pageHtml(frame, body) });
	},
};

/**
 * The live posts of a shop, for the menu link and the sitemap.
 * @param ctx What the store hands the function.
 * @returns The live posts, newest first.
 */
async function liveOf(ctx: StorefrontContext): Promise<Meta[]> {
	return livePosts(await readIndex(ctx.data), new Date());
}

/**
 * What the blog adds to the store: a menu link once a post is live,
 * and the blog with its posts in the sitemap.
 */
export const storefront: StorefrontHooks = {
	links: async (ctx) =>
		(await liveOf(ctx)).length
			? [{ title: ctx.t("store.title"), path: BLOG_PATH }]
			: [],

	sitemap: async (ctx) => {
		const live = await liveOf(ctx);
		if (!live.length) return [];
		const paths = [BLOG_PATH];
		for (const post of live)
			paths.push(`${BLOG_PATH}/${encodeURIComponent(post.slug)}`);
		return paths;
	},
};
