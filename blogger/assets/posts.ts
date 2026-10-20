/**
 * The rules of a blog post, with no request and no database in them.
 * The routes (index.ts), the store pages (lib/render.ts) and the staff
 * page (assets/) share the shapes; the rules run on the server.
 */

/** The address of the blog on the shop's online store. */
export const BLOG_PATH = "/blogs";

/** How many posts one page of the blog shows. */
export const PER_PAGE = 9;

/** The longest title, in characters. */
export const TITLE_MAX = 200;

/** The longest link name (slug), in characters. */
export const SLUG_MAX = 100;

/** The longest summary, in characters. */
export const SUMMARY_MAX = 300;

/** The longest body, in characters of HTML. */
export const BODY_MAX = 200_000;

/** How many tags one post may have. */
export const TAGS_MAX = 10;

/** The longest tag, in characters. */
export const TAG_MAX = 30;

/** How many posts a shop may keep. The index is one record. */
export const POSTS_MAX = 2000;

/** How many words a person reads in a minute. */
const WORDS_PER_MINUTE = 200;

/** A slug: letters and digits of any language, joined by single dashes. */
const SLUG = /^[\p{L}\p{M}\p{N}]+(-[\p{L}\p{M}\p{N}]+)*$/u;

/** The two states of a post. */
export const STATUSES = ["draft", "published"] as const;
export type Status = (typeof STATUSES)[number];

/**
 * What the list knows about a post: everything but its body.
 * The shop's whole list is kept as one record (the index).
 */
export type Meta = {
	id: number;
	title: string;
	slug: string;
	summary: string;
	/** The thumbnail: a `/uploads/…` path, or null. */
	cover: string | null;
	tags: string[];
	status: Status;
	/** When it goes live, as an ISO time in UTC. Null for a new draft. */
	published_at: string | null;
	updated_at: string;
	/** How long the body takes to read, in minutes. */
	minutes: number;
};

/** A whole post: its list entry and its body (cleaned HTML). */
export type Post = Meta & { body: string };

/** What the form sends. Nothing in it is trusted. */
export type PostInput = Partial<Record<keyof Post, unknown>>;

/** Field name → the dictionary key of what is wrong with it. */
export type Errors = Record<string, string>;

/**
 * Turn a text into a slug: lower case, dashes for everything that is
 * not a letter or a digit. Letters of every language stay.
 * @param text A title or a tag.
 * @returns The slug, "" when the text has no letter or digit.
 */
export function slugify(text: string): string {
	return text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, SLUG_MAX)
		.replace(/-+$/, "");
}

/**
 * Clean a list of tags: trimmed, no empty one, no tag twice
 * (whatever its case), not too long and not too many.
 * @param value What the form sent.
 * @returns The tags.
 */
export function cleanTags(value: unknown): string[] {
	const seen = new Set<string>();
	const tags: string[] = [];
	for (const one of Array.isArray(value) ? value : []) {
		const tag = String(one ?? "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, TAG_MAX);
		const slug = slugify(tag);
		if (!slug || seen.has(slug)) continue;
		seen.add(slug);
		tags.push(tag);
	}
	return tags.slice(0, TAGS_MAX);
}

/**
 * How long a body takes to read.
 * @param html The body.
 * @returns Whole minutes, at least 1.
 */
export function minutesOf(html: string): number {
	const words = html
		.replace(/<[^>]*>/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * The pictures a post uses: its thumbnail and the ones in its body.
 * @param post The post, or what is left of one.
 * @returns Their `/uploads/…` paths.
 */
export function picturesOf(post: {
	cover?: string | null;
	body?: string;
}): string[] {
	const found = new Set<string>();
	if (post.cover) found.add(post.cover);
	for (const hit of (post.body ?? "").matchAll(/\/uploads\/[\w./-]+/g))
		found.add(hit[0]);
	return [...found];
}

/**
 * Does the body hold only pictures it may keep?
 * A picture is our own upload (`/uploads/…`) or an https link.
 * Picture data (base64) and every other address are refused: the body
 * keeps a path, never the picture itself.
 * @param html The body.
 * @returns False when one `<img>` has another address, or none.
 */
export function picturesAllowed(html: string): boolean {
	for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
		const src = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
		const url = (src?.[1] ?? src?.[2] ?? src?.[3] ?? "").trim();
		if (!/^(https:\/\/|\/uploads\/)/i.test(url)) return false;
	}
	return true;
}

/**
 * Check what the form sent and turn it into a post.
 * The body must be cleaned by the caller: this only measures it.
 * @param input What the form sent, the body already cleaned.
 * @param o.shopId The shop: a thumbnail must be its own upload.
 * @param o.taken The slugs other posts of the shop use.
 * @param o.before The post as it was, when it is an edit.
 * @param o.now The time of the save.
 * @returns The post without its id, or the errors by field.
 */
export function checkPost(
	input: PostInput,
	o: { shopId: number; taken: string[]; before?: Post; now: Date },
):
	| { post: Omit<Post, "id">; errors?: never }
	| { errors: Errors; post?: never } {
	const errors: Errors = {};
	const title = String(input.title ?? "").trim();
	if (!title) errors.title = "error.title_required";
	else if (title.length > TITLE_MAX) errors.title = "error.title_long";

	const slug = String(input.slug ?? "").trim() || slugify(title);
	// with no title and no link typed, the missing title is the one thing to say
	const named = !!title || !!slug;
	if (named && (!SLUG.test(slug) || slug.length > SLUG_MAX))
		errors.slug = "error.slug";
	else if (o.taken.includes(slug)) errors.slug = "error.slug_taken";

	const summary = String(input.summary ?? "").trim();
	if (summary.length > SUMMARY_MAX) errors.summary = "error.summary_long";

	const body = String(input.body ?? "");
	if (body.length > BODY_MAX) errors.body = "error.body_long";
	else if (!picturesAllowed(body)) errors.body = "error.body_picture";

	const cover = input.cover ? String(input.cover) : null;
	if (cover && !cover.startsWith(`/uploads/${o.shopId}/`))
		errors.cover = "error.cover";

	const status = STATUSES.find((one) => one === input.status);
	if (!status) errors.status = "error.status";

	let published_at = o.before?.published_at ?? null;
	if (input.published_at) {
		const at = new Date(String(input.published_at));
		if (Number.isNaN(at.getTime())) errors.published_at = "error.date";
		else published_at = at.toISOString();
	} else if (input.published_at === null || input.published_at === "") {
		published_at = null;
	}
	// a post published with no date goes live now
	if (status === "published" && !published_at)
		published_at = o.now.toISOString();

	if (Object.keys(errors).length) return { errors };
	return {
		post: {
			title,
			slug,
			summary,
			cover,
			body,
			tags: cleanTags(input.tags),
			status: status!,
			published_at,
			updated_at: o.now.toISOString(),
			minutes: minutesOf(body),
		},
	};
}

/**
 * A post's entry for the list: the post without its body.
 * @param post The whole post.
 * @returns Its list entry.
 */
export function metaOf(post: Post): Meta {
	const { body: _body, ...meta } = post;
	return meta;
}

/**
 * Can a visitor of the store read this post now?
 * A draft never shows. A published post shows from its date on.
 * @param post The post's list entry.
 * @param now The time of the request.
 * @returns True when it is live.
 */
export function isLive(post: Meta, now: Date): boolean {
	return (
		post.status === "published" &&
		!!post.published_at &&
		new Date(post.published_at).getTime() <= now.getTime()
	);
}

/**
 * The posts a visitor can read, newest first.
 * @param index Every post of the shop.
 * @param now The time of the request.
 * @param tag Only the posts with this tag (its slug), when given.
 * @returns The live posts.
 */
export function livePosts(index: Meta[], now: Date, tag?: string): Meta[] {
	const live: Meta[] = [];
	for (const post of index) {
		if (!isLive(post, now)) continue;
		if (tag && !post.tags.some((one) => slugify(one) === tag)) continue;
		live.push(post);
	}
	return live.sort(newestFirst);
}

/**
 * Sort order: the newest publish date first.
 * @param a One post.
 * @param b Another post.
 * @returns A negative number when `a` comes first.
 */
function newestFirst(a: Meta, b: Meta): number {
	return (b.published_at ?? "").localeCompare(a.published_at ?? "");
}

/**
 * Every tag of some posts, most used first, then by name.
 * @param posts The posts.
 * @returns The tags, each once, as first written.
 */
export function tagsOf(posts: Meta[]): string[] {
	const count = new Map<string, { tag: string; n: number }>();
	for (const post of posts)
		for (const tag of post.tags) {
			const slug = slugify(tag);
			const hit = count.get(slug);
			if (hit) hit.n++;
			else count.set(slug, { tag, n: 1 });
		}
	return [...count.values()].sort(byUse).map(nameOf);
}

/**
 * Sort order of tags: the most used first, then by name.
 * @param a One tag with its count.
 * @param b Another.
 * @returns A negative number when `a` comes first.
 */
function byUse(a: { tag: string; n: number }, b: { tag: string; n: number }) {
	return b.n - a.n || a.tag.localeCompare(b.tag);
}

/**
 * The name of a counted tag.
 * @param one The tag with its count.
 * @returns The tag.
 */
function nameOf(one: { tag: string }) {
	return one.tag;
}

/**
 * One page of a list.
 * @param all The whole list.
 * @param page The page asked for, from 1. Anything else counts as 1.
 * @returns The page's items, its number and the last page's number.
 */
export function pageOf<T>(all: T[], page: number) {
	const last = Math.max(1, Math.ceil(all.length / PER_PAGE));
	const at = Math.min(last, Math.max(1, Math.floor(page) || 1));
	return {
		items: all.slice((at - 1) * PER_PAGE, at * PER_PAGE),
		page: at,
		last,
	};
}
