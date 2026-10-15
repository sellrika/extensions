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
import { BLOG_CSS, listHtml, postHtml, type Look } from "./lib/render.ts";

/** The name of the list that holds the posts, one record each. */
const POSTS = "posts";

/** The name of the record that holds every post's list entry. */
const INDEX = "index";

/** The name of the lock every change of the posts runs under. */
const LOCK = "posts";

/** How many other posts a post's page offers to read next. */
const MORE_POSTS = 2;

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
 * Save a new post or a change of one.
 * The whole "read the index, check, write" runs under one lock, so two
 * saves at the same moment can't take the same link name.
 * Pictures the post stopped using are handed back to the app.
 * @param ctx The route's context.
 * @param id The post to change, or null for a new one.
 * @returns The saved post, or the 404 / 422 answer.
 */
async function save(ctx: RouteContext, id: number | null) {
	const denied = refuse(ctx);
	if (denied) return denied;
	const input = ((await ctx.req.json().catch(() => null)) ?? {}) as PostInput;
	// what a person typed is cleaned before it is kept
	input.body = await ctx.html.clean(String(input.body ?? ""));
	const posts = ctx.data.collection<Omit<Post, "id">>(POSTS);
	return ctx.data.lock(LOCK, async function write() {
		const index = await readIndex(ctx.data);
		const row = id === null ? null : await posts.get(id);
		if (id !== null && !row) return gone();
		if (id === null && index.length >= POSTS_MAX)
			return invalid(ctx, { title: "error.too_many" });
		const before = row ? { ...row.value, id: row.id } : undefined;
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
 * @returns The themed page, or 404 for a tag no live post has.
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
	return ctx.storefront.page({
		frame: "full",
		title,
		body: listHtml(
			{
				title,
				intro: ctx.t("store.intro"),
				posts: items,
				tags,
				tag,
				page,
				last,
			},
			lookOf(ctx),
		),
		css: BLOG_CSS,
		description: ctx.t("store.description", { shop: ctx.shop.name }),
		canonical: page > 1 ? `${base}?page=${page}` : base,
	});
}

/**
 * Store routes. On the store's host they answer below `/blogs`
 * (manifest `storefront.path`).
 */
export const publicRoutes: Routes = {
	"GET /blogs": (ctx) => listPage(ctx, ""),

	"GET /blogs/tag/:tag": (ctx) => listPage(ctx, slugify(ctx.params.tag ?? "")),

	/** One post. A draft, or a post dated in the future, is not there. */
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
		return ctx.storefront.page({
			frame: "full",
			title: post.title,
			body: postHtml(
				post,
				more,
				`${ctx.store_url}${BLOG_PATH}/${encodeURIComponent(post.slug)}`,
				lookOf(ctx),
			),
			css: BLOG_CSS,
			description: post.summary || undefined,
			image: post.cover,
		});
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
