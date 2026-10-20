/**
 * The HTML of the blog's two store pages: the list and one post.
 * Each is a whole page the blog builds by itself (`pageHtml`), with no
 * theme around it (`ctx.storefront.page({ html })`). The app does not
 * clean it: every text is escaped here, and a post's body was cleaned
 * when it was saved.
 * The look follows the Pencil design "Blog v2": a serif for headings,
 * a warm paper background and one rust accent.
 */
import type { Translate } from "@extensions/types";
import { BLOG_PATH, slugify, type Meta, type Post } from "../assets/posts.ts";

/** How many page numbers the pager shows around the open page. */
const PAGER_SPAN = 2;

/** How many posts the grid under the big post shows. The rest are rows. */
const GRID_SIZE = 3;

/** The two fonts of the design, from Google Fonts. */
const FONTS =
	"https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400&family=Inter:wght@400;500;600;700&display=swap";

/** What both pages need to write their texts. */
export type Look = {
	t: Translate;
	/** Formats a post's date in the visitor's language. */
	date: (iso: string) => string;
};

/** What `pageHtml` puts around a page's body. */
export type Frame = {
	/** The page's language, for `<html lang>`. */
	lang: string;
	/** The page's title, without the shop's name. */
	title: string;
	/** The description for search engines and shared links. */
	description: string;
	/** The page's full address. */
	url: string;
	/** The picture of a shared link: a full address, or null. */
	image: string | null;
	/** The shop's name. */
	shop: string;
	/** The address of the shop's online store. */
	home: string;
	/** The texts of the header, the band and the footer. */
	t: Translate;
	/** "article" for a post, "website" for a list. */
	type: "article" | "website";
	/** The shop's logo: a full address, or null. */
	logo: string | null;
	/** Structured data (schema.org) for search engines and AI search. */
	data: object[];
	/** A post's dates and tags, for the article head tags. */
	article?: { published: string | null; modified: string; tags: string[] };
	/** The full addresses of the list pages before and after this one. */
	prev?: string | null;
	next?: string | null;
};

/** Search engines may show a big picture and the whole snippet. */
const ROBOTS =
	"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

/**
 * Make a text safe to print inside HTML.
 * @param text The text.
 * @returns The text with `&`, `<`, `>` and `"` escaped.
 */
export function esc(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * The whole document of a store page: the head tags, the site header,
 * the body, the band that leads to the shop and the footer.
 * @param frame What goes around the body.
 * @param body The page's HTML.
 * @returns The HTML document.
 */
export function pageHtml(frame: Frame, body: string): string {
	const home = esc(frame.home);
	const shop = esc(frame.shop);
	const t = frame.t;
	const nav = `<nav class="blg-nav"><a href="${home}">${esc(t("store.shop"))}</a><a class="is-on" href="${BLOG_PATH}" aria-current="page">${esc(t("store.title"))}</a><a href="${home}/track">${esc(t("store.track"))}</a></nav>`;
	const visit = `<a class="blg-btn blg-btn-line" href="${home}">${esc(t("store.visit"))} <span aria-hidden="true">↗</span></a>`;
	const header = `<header class="blg-site"><a class="blg-site-name" href="${home}">${shop}</a>${nav}${visit}</header>`;
	const band = `<section class="blg-band"><div class="blg-band-in"><p class="blg-band-title">${esc(t("store.band"))}</p><a class="blg-btn blg-btn-light" href="${home}">${esc(t("store.visit"))} <span aria-hidden="true">↗</span></a></div></section>`;
	const footer = `<footer class="blg-foot-site"><a class="blg-site-name" href="${home}">${shop}</a><nav class="blg-foot-links"><a href="${home}">${esc(t("store.shop"))}</a><a href="${BLOG_PATH}">${esc(t("store.title"))}</a><a href="${home}/track">${esc(t("store.track"))}</a><a href="${BLOG_PATH}/feed.xml" type="application/rss+xml">${esc(t("store.rss"))}</a></nav><small>© ${new Date().getFullYear()} ${shop}</small></footer>`;
	return `<!doctype html><html lang="${esc(frame.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${headTags(frame)}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS}"><style>${BLOG_CSS}</style></head><body class="blg">${header}<main>${body}</main>${band}${footer}</body></html>`;
}

/**
 * The head tags for search engines, AI search and shared links:
 * the title, the description, the canonical address, Open Graph,
 * the X card, a post's dates and tags, the pager links and the
 * structured data.
 * @param frame What the page is.
 * @returns The HTML of the tags.
 */
function headTags(frame: Frame): string {
	const title = esc(`${frame.title} · ${frame.shop}`);
	const plain = esc(frame.title);
	const desc = esc(frame.description);
	const tags = [
		`<title>${title}</title>`,
		`<meta name="description" content="${desc}">`,
		`<meta name="robots" content="${ROBOTS}">`,
		`<link rel="canonical" href="${esc(frame.url)}">`,
		`<meta property="og:type" content="${frame.type}">`,
		`<meta property="og:site_name" content="${esc(frame.shop)}">`,
		`<meta property="og:title" content="${plain}">`,
		`<meta property="og:description" content="${desc}">`,
		`<meta property="og:url" content="${esc(frame.url)}">`,
		`<meta name="twitter:card" content="${frame.image ? "summary_large_image" : "summary"}">`,
		`<meta name="twitter:title" content="${plain}">`,
		`<meta name="twitter:description" content="${desc}">`,
	];
	if (frame.image)
		tags.push(
			`<meta property="og:image" content="${esc(frame.image)}">`,
			`<meta property="og:image:alt" content="${plain}">`,
			`<meta name="twitter:image" content="${esc(frame.image)}">`,
		);
	const a = frame.article;
	if (a) {
		if (a.published)
			tags.push(
				`<meta property="article:published_time" content="${esc(a.published)}">`,
			);
		tags.push(
			`<meta property="article:modified_time" content="${esc(a.modified)}">`,
			`<meta property="article:author" content="${esc(frame.shop)}">`,
		);
		if (a.tags[0])
			tags.push(`<meta property="article:section" content="${esc(a.tags[0])}">`);
		for (const tag of a.tags)
			tags.push(`<meta property="article:tag" content="${esc(tag)}">`);
	}
	tags.push(
		`<link rel="alternate" type="application/rss+xml" title="${esc(`${frame.t("store.title")} · ${frame.shop}`)}" href="${esc(frame.home + BLOG_PATH)}/feed.xml">`,
	);
	if (frame.prev) tags.push(`<link rel="prev" href="${esc(frame.prev)}">`);
	if (frame.next) tags.push(`<link rel="next" href="${esc(frame.next)}">`);
	for (const one of frame.data) tags.push(jsonLd(one));
	return tags.join("");
}

/**
 * Structured data as a script tag.
 * A `<` is written as `<`, so no text in it can close the tag.
 * @param data One schema.org object.
 * @returns The `<script type="application/ld+json">` tag.
 */
function jsonLd(data: object): string {
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	return `<script type="application/ld+json">${json}</script>`;
}

/**
 * The shop as the author and publisher of the blog.
 * @param frame What the page is.
 * @returns A schema.org Organization.
 */
function shopData(frame: Frame): object {
	return {
		"@type": "Organization",
		name: frame.shop,
		url: frame.home,
		...(frame.logo && { logo: { "@type": "ImageObject", url: frame.logo } }),
	};
}

/**
 * The trail from the store to this page, for search results.
 * @param frame What the page is.
 * @param blogUrl The blog's full address.
 * @param post The post's title, or null on a list page.
 * @returns A schema.org BreadcrumbList.
 */
function trailData(frame: Frame, blogUrl: string, post: string | null): object {
	const items = [
		[frame.shop, frame.home],
		[frame.t("store.title"), blogUrl],
		...(post ? [[post, frame.url]] : []),
	];
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map(([name, item], i) => ({
			"@type": "ListItem",
			position: i + 1,
			name,
			item,
		})),
	};
}

/**
 * A post as structured data.
 * @param post The post.
 * @param url Its full address.
 * @param image Its picture's full address, or null.
 * @returns A schema.org BlogPosting, without its context.
 */
function postingData(post: Meta, url: string, image: string | null): object {
	return {
		"@type": "BlogPosting",
		headline: post.title,
		url,
		...(post.summary && { description: post.summary }),
		...(image && { image: [image] }),
		...(post.published_at && { datePublished: post.published_at }),
		dateModified: post.updated_at,
		...(post.tags.length && { keywords: post.tags.join(", ") }),
	};
}

/**
 * The structured data of a post's page: the post with its author,
 * publisher, language and reading time, and the breadcrumbs.
 * @param frame What the page is (`frame.image` is the post's picture).
 * @param post The post.
 * @param blogUrl The blog's full address.
 * @returns The schema.org objects.
 */
export function postData(frame: Frame, post: Post, blogUrl: string): object[] {
	const shop = shopData(frame);
	return [
		{
			"@context": "https://schema.org",
			...postingData(post, frame.url, frame.image),
			mainEntityOfPage: { "@type": "WebPage", "@id": frame.url },
			author: shop,
			publisher: shop,
			inLanguage: frame.lang,
			...(post.tags[0] && { articleSection: post.tags[0] }),
			timeRequired: `PT${post.minutes}M`,
			isPartOf: { "@type": "Blog", name: frame.t("store.title"), url: blogUrl },
		},
		trailData(frame, blogUrl, post.title),
	];
}

/**
 * The structured data of a list page: the blog with the posts of this
 * page, and the breadcrumbs.
 * @param frame What the page is.
 * @param posts The posts of this page.
 * @param blogUrl The blog's full address.
 * @param imageOf Gives a post's picture as a full address, or null.
 * @returns The schema.org objects.
 */
export function listData(
	frame: Frame,
	posts: Meta[],
	blogUrl: string,
	imageOf: (post: Meta) => string | null,
): object[] {
	return [
		{
			"@context": "https://schema.org",
			"@type": "Blog",
			"@id": frame.url,
			url: frame.url,
			name: `${frame.title} · ${frame.shop}`,
			description: frame.description,
			inLanguage: frame.lang,
			publisher: shopData(frame),
			blogPost: posts.map((post) =>
				postingData(
					post,
					`${frame.home}${postPath(post)}`,
					imageOf(post),
				),
			),
		},
		trailData(frame, blogUrl, null),
	];
}

/**
 * The address of a tag's page.
 * @param tag The tag as written.
 * @returns Its path.
 */
export function tagPath(tag: string): string {
	return `${BLOG_PATH}/tag/${encodeURIComponent(slugify(tag))}`;
}

/**
 * The address of a post.
 * @param post The post.
 * @returns Its path.
 */
export function postPath(post: { slug: string }): string {
	return `${BLOG_PATH}/${encodeURIComponent(post.slug)}`;
}

/**
 * The date and the reading time of a post.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The line's HTML.
 */
function when(post: Meta, look: Look): string {
	const read = esc(look.t("store.minutes", { count: post.minutes }));
	if (!post.published_at) return read;
	return `${dateTag(post.published_at, look)} · ${read}`;
}

/**
 * A date a machine can read too: `<time datetime="…">`.
 * @param iso The time, as an ISO text.
 * @param look The date format.
 * @returns The HTML.
 */
function dateTag(iso: string, look: Look): string {
	return `<time datetime="${esc(iso)}">${esc(look.date(iso))}</time>`;
}

/**
 * The small line over a post's title: its first tag, a dot, the date.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The HTML.
 */
function metaLine(post: Meta, look: Look): string {
	const tag = post.tags[0]
		? `<span class="blg-kicker">${esc(post.tags[0])}</span><span class="blg-dot"></span>`
		: "";
	return `<span class="blg-meta">${tag}<span>${when(post, look)}</span></span>`;
}

/**
 * A post's picture, or an empty box of the same size.
 * @param post The post.
 * @param cls The class of the picture.
 * @param lazy True to load it only when it comes into view.
 * @returns The HTML.
 */
function picture(post: Meta, cls: string, lazy: boolean): string {
	return post.cover
		? `<img class="${cls}" src="${esc(post.cover)}" alt="${esc(post.title)}"${lazy ? ' loading="lazy"' : ""}>`
		: `<span class="${cls}"></span>`;
}

/**
 * The first post of the list, drawn big: the picture at the left,
 * the words at the right.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The HTML.
 */
function featured(post: Meta, look: Look): string {
	const summary = post.summary
		? `<span class="blg-feat-summary">${esc(post.summary)}</span>`
		: "";
	return `<article class="blg-feat"><a class="blg-feat-link" href="${postPath(post)}">${picture(post, "blg-feat-img", false)}<div class="blg-feat-text"><span class="blg-badge">${esc(look.t("store.featured"))}</span>${metaLine(post, look)}<h2 class="blg-feat-title">${esc(post.title)}</h2>${summary}<span class="blg-btn blg-btn-accent">${esc(look.t("store.read"))} <span aria-hidden="true">→</span></span></div></a></article>`;
}

/**
 * One post of the grid.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The card's HTML.
 */
function card(post: Meta, look: Look): string {
	const summary = post.summary
		? `<span class="blg-summary">${esc(post.summary)}</span>`
		: "";
	return `<article class="blg-card"><a class="blg-card-link" href="${postPath(post)}">${picture(post, "blg-thumb", true)}${metaLine(post, look)}<h3 class="blg-card-title">${esc(post.title)}</h3>${summary}</a></article>`;
}

/**
 * One post of the numbered list under the grid.
 * @param post The post.
 * @param n Its number on the page.
 * @param look The texts and the date format.
 * @returns The row's HTML.
 */
function row(post: Meta, n: number, look: Look): string {
	const tag = post.tags[0] ? `${esc(post.tags[0])} · ` : "";
	const date = post.published_at ? dateTag(post.published_at, look) : "";
	return `<article class="blg-row"><a class="blg-row-link" href="${postPath(post)}"><span class="blg-row-n">${String(n).padStart(2, "0")}</span><div class="blg-row-text"><span class="blg-row-meta">${tag}${date}</span><h3 class="blg-row-title">${esc(post.title)}</h3></div>${picture(post, "blg-row-img", true)}</a></article>`;
}

/**
 * One topic tab.
 * @param label The topic's name.
 * @param href Its list's path.
 * @param n The number of live posts with it.
 * @param on True for the open topic.
 * @returns The tab's HTML.
 */
function tab(label: string, href: string, n: number, on: boolean): string {
	return `<a class="blg-tab${on ? " is-on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}>${esc(label)}<small>${n}</small></a>`;
}

/**
 * The topic tabs over the list, each with its number of posts.
 * @param tags Every tag of the live posts.
 * @param counts The number of live posts per tag slug.
 * @param total The number of live posts.
 * @param on The slug of the open tag, "" for all posts.
 * @param look The texts.
 * @returns The tabs' HTML, "" when no post has a tag.
 */
function tagRow(
	tags: string[],
	counts: Record<string, number>,
	total: number,
	on: string,
	look: Look,
): string {
	if (!tags.length) return "";
	const links = [tab(look.t("store.all"), BLOG_PATH, total, !on)];
	for (const tag of tags) {
		const slug = slugify(tag);
		links.push(tab(tag, tagPath(tag), counts[slug] ?? 0, slug === on));
	}
	return `<nav class="blg-tabs">${links.join("")}</nav>`;
}

/**
 * The address of one page of a list.
 * @param base The list's own path (the blog, or one tag).
 * @param page The page, from 1.
 * @returns The path. The first page has no number.
 */
function pagePath(base: string, page: number): string {
	return page > 1 ? `${base}?page=${page}` : base;
}

/**
 * The pager: "Newer posts" at the left, the numbers in the middle,
 * "Older posts" at the right. An end with no page is shown faded.
 * @param base The list's own path (the blog, or one tag).
 * @param page The open page.
 * @param last The last page.
 * @param look The texts.
 * @returns The pager's HTML, "" when there is one page.
 */
function pager(base: string, page: number, last: number, look: Look): string {
	if (last < 2) return "";
	const newer = esc(look.t("store.newer"));
	const older = esc(look.t("store.older"));
	const prev =
		page > 1
			? `<a class="blg-btn blg-btn-line" rel="prev" aria-label="${newer}" href="${pagePath(base, page - 1)}">← ${newer}</a>`
			: `<span class="blg-btn blg-btn-line is-off">← ${newer}</span>`;
	const next =
		page < last
			? `<a class="blg-btn blg-btn-line" rel="next" aria-label="${older}" href="${pagePath(base, page + 1)}">${older} →</a>`
			: `<span class="blg-btn blg-btn-line is-off">${older} →</span>`;
	const numbers: string[] = [];
	const from = Math.max(1, page - PAGER_SPAN);
	const to = Math.min(last, page + PAGER_SPAN);
	for (let n = from; n <= to; n++)
		numbers.push(
			n === page
				? `<span class="blg-page is-on" aria-current="page">${n}</span>`
				: `<a class="blg-page" href="${pagePath(base, n)}">${n}</a>`,
		);
	return `<nav class="blg-pager" aria-label="${esc(look.t("store.page_of", { page, last }))}">${prev}<span class="blg-pages">${numbers.join("")}</span>${next}</nav>`;
}

/**
 * One number of the masthead, like "24 posts".
 * @param n The number.
 * @param label The word under it.
 * @returns The HTML.
 */
function stat(n: number, label: string): string {
	return `<span class="blg-stat"><b>${n}</b><small>${esc(label)}</small></span>`;
}

/**
 * The blog's list page: the masthead and the topic tabs, then on the
 * first page of all posts one big post. Next a grid of three, then the
 * rest as numbered rows.
 * @param o.title The page's heading.
 * @param o.intro The line under the heading.
 * @param o.posts The posts of this page.
 * @param o.tags Every tag of the live posts.
 * @param o.counts The number of live posts per tag slug.
 * @param o.total The number of live posts.
 * @param o.tag The slug of the open tag, "" for all posts.
 * @param o.page The open page.
 * @param o.last The last page.
 * @param look The texts and the date format.
 * @returns The HTML.
 */
export function listHtml(
	o: {
		title: string;
		intro: string;
		posts: Meta[];
		tags: string[];
		counts: Record<string, number>;
		total: number;
		tag: string;
		page: number;
		last: number;
	},
	look: Look,
): string {
	const base = o.tag
		? `${BLOG_PATH}/tag/${encodeURIComponent(o.tag)}`
		: BLOG_PATH;
	const lead = o.page === 1 && !o.tag ? o.posts[0] : undefined;
	const rest = lead ? o.posts.slice(1) : o.posts;
	const grid = rest.slice(0, GRID_SIZE);
	const rows = rest.slice(GRID_SIZE);
	const head = `<header class="blg-mast"><div class="blg-mast-text"><p class="blg-eyebrow">${esc(look.t("store.kicker"))}</p><h1 class="blg-h1">${esc(o.title)}</h1><p class="blg-intro">${esc(o.intro)}</p></div><div class="blg-stats">${stat(o.total, look.t("store.posts"))}${stat(o.tags.length, look.t("store.topics"))}</div></header>`;
	const pageOf =
		o.last > 1
			? `<small>${esc(look.t("store.page_of", { page: o.page, last: o.last }))}</small>`
			: "";
	const latest = grid.length
		? `<section class="blg-latest"><div class="blg-sec-head"><h2>${esc(look.t("store.latest"))}</h2>${pageOf}</div><div class="blg-grid">${grid.map((post) => card(post, look)).join("")}</div></section>`
		: "";
	const list = rows.length
		? `<section class="blg-rows">${rows.map((post, i) => row(post, i + 1, look)).join("")}</section>`
		: "";
	const empty = o.posts.length
		? ""
		: `<p class="blg-empty">${esc(look.t("store.empty"))}</p>`;
	return `<div class="blg-wrap">${head}${tagRow(o.tags, o.counts, o.total, o.tag, look)}${lead ? featured(lead, look) : ""}${latest}${list}${empty}${pager(base, o.page, o.last, look)}</div>`;
}

/**
 * The links to share a post: plain links, no script.
 * @param post The post.
 * @param url The post's full address.
 * @param look The texts.
 * @returns The HTML.
 */
function share(post: Meta, url: string, look: Look): string {
	const link = encodeURIComponent(url);
	const title = encodeURIComponent(post.title);
	const sites = [
		[
			"facebook",
			"Facebook",
			`https://www.facebook.com/sharer/sharer.php?u=${link}`,
		],
		["x", "X", `https://twitter.com/intent/tweet?url=${link}&text=${title}`],
		[
			"mail",
			look.t("store.share_mail"),
			`mailto:?subject=${title}&body=${link}`,
		],
	] as const;
	const links = sites
		.map(
			([icon, name, href]) =>
				`<a class="blg-share-btn blg-i-${icon}" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(name)}" title="${esc(name)}"></a>`,
		)
		.join("");
	return `<nav class="blg-share"><small>${esc(look.t("store.share"))}</small>${links}</nav>`;
}

/**
 * The first letters of a name, for the round author picture.
 * @param name The shop's name.
 * @returns One or two capital letters.
 */
function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => [...word][0] ?? "");
	return letters.join("").toUpperCase();
}

/**
 * One post's page: a centred head (the way back, the title, the lead,
 * the author line), the wide cover, the body in a narrow column, the
 * tags and share links, then the posts to read next.
 * @param post The post, its body already cleaned.
 * @param more Up to three other live posts to read next.
 * @param url The post's full address, for the share links.
 * @param shop The shop's name: the author of every post.
 * @param look The texts and the date format.
 * @returns The HTML.
 */
export function postHtml(
	post: Post,
	more: Meta[],
	url: string,
	shop: string,
	look: Look,
): string {
	const topic = post.tags[0]
		? `<span class="blg-crumb-sep">/</span><span class="blg-crumb-topic">${esc(post.tags[0])}</span>`
		: "";
	const lead = post.summary
		? `<p class="blg-lead">${esc(post.summary)}</p>`
		: "";
	const byline = `<div class="blg-by"><span class="blg-avatar" aria-hidden="true">${esc(initials(shop))}</span><span><b>${esc(shop)}</b><small>${when(post, look)}</small></span></div>`;
	const cover = post.cover
		? `<div class="blg-cover-wrap"><img class="blg-cover" src="${esc(post.cover)}" alt="${esc(post.title)}" fetchpriority="high"></div>`
		: "";
	const tags = post.tags
		.map((tag) => `<a class="blg-tag" href="${tagPath(tag)}">${esc(tag)}</a>`)
		.join("");
	const next = more.length
		? `<section class="blg-next"><div class="blg-sec-head"><h2>${esc(look.t("store.more"))}</h2><a class="blg-all" href="${BLOG_PATH}">${esc(look.t("store.all_posts"))} →</a></div><div class="blg-grid">${more.map((one) => card(one, look)).join("")}</div></section>`
		: "";
	return `<article class="blg-post"><header class="blg-post-head"><nav class="blg-crumb"><a class="blg-back" href="${BLOG_PATH}" aria-label="${esc(look.t("store.back"))}">← ${esc(look.t("store.title"))}</a>${topic}</nav><h1 class="blg-title">${esc(post.title)}</h1>${lead}${byline}</header>${cover}<div class="blg-body rich-html">${post.body}</div><footer class="blg-end"><nav class="blg-tags">${tags}</nav>${share(post, url, look)}</footer></article>${next}`;
}

/**
 * An icon as a CSS mask, drawn in the text colour (Lucide, ISC licence).
 * The icon lives in the stylesheet, so the page needs no SVG tag.
 * @param shapes The inner shapes of the icon, on a 24 × 24 grid.
 * @returns The `url(…)` of the mask.
 */
function mask(shapes: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The share icons. */
const ICONS = {
	facebook: mask(
		'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
	),
	x: mask('<path d="M4 4l16 16"/><path d="M20 4L4 20"/>'),
	mail: mask(
		'<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
	),
};

/**
 * The stylesheet of both pages.
 * The page has no theme, so the colours and fonts are the blog's own.
 * A body pasted from another page may carry that page's colours and
 * fonts as inline styles: they are switched off, the blog's own show.
 */
export const BLOG_CSS = `
*,*::before,*::after{box-sizing:border-box}
.blg{--fg:#1b1915;--fg2:#57524a;--fg3:#8a847a;--bg:#faf7f2;--line:#e7e1d7;--soft:#f1ece3;--accent:#b4532a;--serif:"Fraunces",Georgia,serif;--sans:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--pad:clamp(1.25rem,8.3vw,7.5rem);margin:0;background:var(--bg);color:var(--fg);font-family:var(--sans);-webkit-font-smoothing:antialiased}
:where(.blg) a{color:inherit;text-decoration:none}
:where(.blg) img{max-width:100%}
.blg-btn{display:inline-flex;align-items:center;gap:.5rem;border-radius:999px;padding:.7rem 1.2rem;font-size:.92rem;font-weight:600;line-height:1;white-space:nowrap}
.blg-btn-line{border:1px solid var(--fg)}
.blg-btn-line:hover{background:var(--fg);color:var(--bg)}
.blg-btn-line.is-off{border-color:var(--line);opacity:.45}
.blg-btn-line.is-off:hover{background:none;color:inherit}
.blg-btn-accent{background:var(--accent);color:#fff;padding:.85rem 1.35rem;align-self:flex-start}
.blg-btn-light{background:var(--bg);color:var(--fg);padding:.95rem 1.6rem}
.blg-site{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1.35rem var(--pad);border-bottom:1px solid var(--line)}
.blg-site-name{font-family:var(--serif);font-size:1.5rem;font-weight:600}
.blg-nav{display:flex;gap:2.25rem;font-size:.9rem;color:var(--fg2)}
.blg-nav a{padding:.35rem 0;border-bottom:2px solid transparent}
.blg-nav a:hover{color:var(--fg)}
.blg-nav a.is-on{color:var(--fg);font-weight:600;border-color:var(--accent)}
.blg-wrap{padding:0 var(--pad)}
.blg-mast{display:flex;align-items:flex-end;justify-content:space-between;gap:3rem;padding:5.5rem 0 3rem}
.blg-mast-text{max-width:47.5rem}
.blg-eyebrow{display:flex;align-items:center;gap:.65rem;margin:0 0 1.25rem;color:var(--accent);font-size:.75rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.blg-eyebrow::before{content:"";width:1.75rem;height:2px;background:var(--accent)}
.blg-h1{margin:0;font-family:var(--serif);font-size:clamp(3rem,8vw,7rem);font-weight:500;letter-spacing:-.035em;line-height:.95}
.blg-intro{margin:1.25rem 0 0;color:var(--fg2);font-size:1.2rem;line-height:1.55}
.blg-stats{display:flex;gap:2.5rem;padding-bottom:.5rem}
.blg-stat{display:flex;flex-direction:column;gap:.1rem}
.blg-stat b{font-family:var(--serif);font-size:2.75rem;font-weight:500;line-height:1}
.blg-stat small{color:var(--fg3);font-size:.8rem}
.blg-tabs{display:flex;gap:1.75rem;overflow-x:auto;border-bottom:1px solid var(--line);scrollbar-width:none}
.blg-tab{display:flex;align-items:center;gap:.4rem;padding:1rem 0;border-bottom:2px solid transparent;margin-bottom:-1px;color:var(--fg2);font-size:.95rem;white-space:nowrap}
.blg-tab small{color:var(--fg3);font-size:.75rem}
.blg-tab:hover{color:var(--fg)}
.blg-tab.is-on{color:var(--fg);font-weight:600;border-color:var(--fg)}
.blg-tab.is-on small{color:var(--accent)}
.blg-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;color:var(--fg3);font-size:.82rem}
.blg-kicker{color:var(--accent);font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.blg-dot{width:3px;height:3px;border-radius:50%;background:var(--fg3)}
.blg-feat{padding:3.5rem 0 4.5rem}
.blg-feat-link{display:grid;grid-template-columns:minmax(0,1.33fr) minmax(0,1fr);gap:4rem;align-items:center}
.blg-feat-img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:.4rem;background:var(--soft)}
.blg-feat-text{display:flex;flex-direction:column;gap:1.35rem}
.blg-badge{align-self:flex-start;padding:.35rem .75rem;border-radius:999px;background:var(--fg);color:var(--bg);font-size:.75rem;font-weight:600}
.blg-feat-title{margin:0;font-family:var(--serif);font-size:clamp(2rem,3.4vw,3rem);font-weight:500;letter-spacing:-.025em;line-height:1.08}
.blg-feat-summary{color:var(--fg2);font-size:1.06rem;line-height:1.6}
.blg-feat-link:hover .blg-feat-title,.blg-card-link:hover .blg-card-title,.blg-row-link:hover .blg-row-title{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.15em}
.blg-sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;padding-top:1.75rem;margin-bottom:2rem;border-top:1px solid var(--fg)}
.blg-sec-head h2{margin:0;font-family:var(--serif);font-size:2rem;font-weight:500;letter-spacing:-.02em}
.blg-sec-head small{color:var(--fg3);font-size:.82rem}
.blg-latest{padding-bottom:4.5rem}
.blg-tabs+.blg-latest{padding-top:3.5rem}
.blg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.5rem}
.blg-card-link{display:flex;flex-direction:column;gap:1.1rem}
.blg-thumb{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:.4rem;background:var(--soft)}
.blg-card-title{margin:0;font-family:var(--serif);font-size:1.6rem;font-weight:500;letter-spacing:-.015em;line-height:1.18}
.blg-summary{color:var(--fg2);font-size:.95rem;line-height:1.6}
.blg-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:2.5rem;padding-bottom:3.5rem}
.blg-row{border-top:1px solid var(--line)}
.blg-row-link{display:flex;align-items:center;gap:1.5rem;padding:1.4rem 0}
.blg-row-n{flex:none;width:2.5rem;font-family:var(--serif);font-size:1.75rem;font-style:italic;color:var(--fg3)}
.blg-row-text{display:flex;flex:1;flex-direction:column;gap:.5rem;min-width:0}
.blg-row-meta{color:var(--fg3);font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.blg-row-title{margin:0;font-family:var(--serif);font-size:1.38rem;font-weight:500;line-height:1.25}
.blg-row-img{flex:none;display:block;width:6rem;height:6rem;object-fit:cover;border-radius:.25rem;background:var(--soft)}
.blg-empty{padding:3rem 0;color:var(--fg2)}
.blg-pager{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.5rem 0 6rem}
.blg-pages{display:flex;gap:.35rem}
.blg-page{display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;border-radius:50%;color:var(--fg2);font-size:.9rem;font-weight:600}
.blg-page:hover{background:var(--soft)}
.blg-page.is-on{background:var(--fg);color:var(--bg)}
.blg-band{padding:0 var(--pad)}
.blg-band-in{display:flex;align-items:center;justify-content:space-between;gap:2.5rem;padding:3.5rem 4rem;border-radius:.5rem;background:var(--fg);color:var(--bg)}
.blg-band-title{max-width:39rem;margin:0;font-family:var(--serif);font-size:clamp(1.6rem,2.4vw,2.15rem);font-weight:500;letter-spacing:-.02em;line-height:1.2}
.blg-foot-site{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.5rem;padding:3.5rem var(--pad) 3rem;color:var(--fg3);font-size:.82rem}
.blg-foot-site .blg-site-name{color:var(--fg);font-size:1.25rem}
.blg-foot-links{display:flex;gap:1.75rem;color:var(--fg2);font-size:.9rem}
.blg-foot-links a:hover{color:var(--fg)}
.blg-post-head{display:flex;flex-direction:column;align-items:flex-start;gap:1.5rem;padding:4.5rem var(--pad) 3rem}
.blg-crumb{display:flex;align-items:center;gap:.6rem;font-size:.9rem}
.blg-back{color:var(--fg2);font-weight:500}
.blg-back:hover{color:var(--fg)}
.blg-crumb-sep{color:var(--fg3)}
.blg-crumb-topic{color:var(--accent);font-weight:600}
.blg-title{max-width:56rem;margin:0;font-family:var(--serif);font-size:clamp(2.4rem,5.5vw,4.5rem);font-weight:500;letter-spacing:-.035em;line-height:1.04}
.blg-lead{max-width:42.5rem;margin:0;color:var(--fg2);font-size:1.25rem;line-height:1.55}
.blg-by{display:flex;align-items:center;gap:.85rem;padding-top:.75rem}
.blg-by b{display:block;font-size:.9rem}
.blg-by small{color:var(--fg3);font-size:.82rem}
.blg-avatar{display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;border-radius:50%;background:var(--fg);color:var(--bg);font-family:var(--serif);font-size:.95rem;font-weight:600}
.blg-cover-wrap{padding:1rem var(--pad) 0}
.blg-cover{display:block;width:100%;max-height:38.75rem;aspect-ratio:1200/620;object-fit:cover;border-radius:.5rem;background:var(--soft)}
.blg-body{max-width:calc(42.5rem + 2 * var(--pad));margin:0 auto;padding:4.5rem var(--pad) 0;font-size:1.125rem;line-height:1.75}
.blg-body [style]{color:inherit!important;background:none!important;font-family:inherit!important;font-size:inherit!important;line-height:inherit!important}
.blg-body>p:first-child::first-letter{float:left;margin:.35rem .6rem 0 0;font-family:var(--serif);font-size:5.25rem;font-weight:500;line-height:.75;color:var(--accent)}
.blg-body h1,.blg-body h2,.blg-body h3{margin:2.75rem 0 1rem;font-family:var(--serif);font-weight:500;letter-spacing:-.02em;line-height:1.2}
.blg-body h1{font-size:2.25rem}.blg-body h2{font-size:2rem}.blg-body h3{font-size:1.5rem}
.blg-body p{margin:0 0 1.5rem}
.blg-body ul,.blg-body ol{margin:0 0 1.5rem;padding-left:1.4rem}
.blg-body li{margin:.35rem 0}
.blg-body img{height:auto;border-radius:.4rem}
.blg-body figure{margin:2.25rem 0;text-align:center}
.blg-body figure img{display:inline-block;vertical-align:top}
.blg-body figcaption{margin:.75rem 0 0;color:var(--fg3);font-size:.88rem;font-style:italic}
.blg-body a{text-decoration:underline;text-underline-offset:.15em}
.blg-body blockquote{margin:2.25rem 0;padding:.5rem 0 .5rem 1.75rem;border-left:3px solid var(--accent);font-family:var(--serif);font-size:1.85rem;font-style:italic;line-height:1.3}
.blg-body blockquote p{margin:0}
.blg-body table{width:100%;border-collapse:collapse;margin:0 0 1.5rem;font-size:1rem}
.blg-body :is(td,th){padding:.6rem .75rem;border:1px solid var(--line);text-align:left}
.blg-body details{margin:0 0 1rem;padding:1rem 1.25rem;border-radius:.4rem;background:var(--soft)}
.blg-body summary{cursor:pointer;font-weight:600}
.blg-end{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1rem;width:min(42.5rem,calc(100% - 2 * var(--pad)));margin:3.5rem auto 6rem;padding:1.75rem 0 0;border-top:1px solid var(--line)}
.blg-tags{display:flex;flex-wrap:wrap;gap:.5rem}
.blg-tag{padding:.5rem .9rem;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:.82rem;font-weight:500}
.blg-tag::before{content:"#"}
.blg-tag:hover{border-color:var(--fg)}
.blg-share{display:flex;align-items:center;gap:.5rem}
.blg-share small{margin-right:.25rem;color:var(--fg3);font-size:.82rem}
.blg-share-btn{display:inline-flex;align-items:center;justify-content:center;width:2.4rem;height:2.4rem;border:1px solid var(--line);border-radius:50%;background:#fff}
.blg-share-btn:hover{border-color:var(--fg)}
.blg-share-btn::before{content:"";width:1rem;height:1rem;background:var(--fg);-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}
.blg-i-facebook{--i:${ICONS.facebook}}.blg-i-x{--i:${ICONS.x}}.blg-i-mail{--i:${ICONS.mail}}
.blg-next{padding:4.5rem var(--pad) 6rem;margin-bottom:6rem;background:var(--soft)}
.blg-next .blg-sec-head{border:0;padding:0}
.blg-next .blg-sec-head h2{font-size:clamp(1.75rem,6vw,2.5rem)}
.blg-all{font-size:.95rem;font-weight:600;white-space:nowrap}
@media (max-width:960px){.blg-nav{display:none}.blg-mast{flex-direction:column;align-items:flex-start;padding-top:3.5rem}.blg-feat-link{grid-template-columns:minmax(0,1fr);gap:1.75rem}.blg-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.blg-rows{grid-template-columns:minmax(0,1fr)}.blg-band-in{flex-direction:column;align-items:flex-start;padding:2.5rem 2rem}}
@media (max-width:600px){.blg-site .blg-btn{display:none}.blg-grid{grid-template-columns:minmax(0,1fr)}.blg-pager .blg-btn{padding:.6rem .9rem}.blg-row-img{width:4.5rem;height:4.5rem}.blg-end{flex-direction:column;align-items:flex-start}}
`;
