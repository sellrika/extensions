/**
 * The HTML of the blog's two store pages: the list and one post.
 * Each is a whole page between the theme's header and footer
 * (`ctx.storefront.page({ frame: "full" })`). The app cleans it again,
 * so only plain tags and classes are used: no script, no SVG.
 * Colours and fonts are the theme's own CSS variables.
 */
import type { Translate } from "@extensions/types";
import { BLOG_PATH, slugify, type Meta, type Post } from "../assets/posts.ts";

/** How many page numbers the pager shows around the open page. */
const PAGER_SPAN = 2;

/** What both pages need to write their texts. */
export type Look = {
	t: Translate;
	/** Formats a post's date in the visitor's language. */
	date: (iso: string) => string;
};

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
 * The small line of a post: the date and the reading time.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The line, escaped.
 */
function metaLine(post: Meta, look: Look): string {
	const when = post.published_at ? look.date(post.published_at) : "";
	const read = look.t("store.minutes", { count: post.minutes });
	return esc(when ? `${when} · ${read}` : read);
}

/**
 * The tags of a post as one small line over its title.
 * @param post The post.
 * @returns The line's HTML, "" for a post with no tag.
 */
function kicker(post: Meta): string {
	return post.tags.length
		? `<span class="blg-kicker">${esc(post.tags.join(" · "))}</span>`
		: "";
}

/**
 * The first post of the list, drawn big: the picture at the left,
 * the words at the right.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The HTML.
 */
function featured(post: Meta, look: Look): string {
	const picture = post.cover
		? `<img class="blg-feat-img" src="${esc(post.cover)}" alt="">`
		: "";
	const summary = post.summary
		? `<span class="blg-feat-summary">${esc(post.summary)}</span>`
		: "";
	return `<article class="blg-feat"><a class="blg-feat-link" href="${postPath(post)}">${picture}<span class="blg-feat-text"><span class="blg-feat-meta">${kicker(post)}<small class="blg-meta">${metaLine(post, look)}</small></span><span class="blg-feat-title">${esc(post.title)}</span>${summary}<span class="blg-read">${esc(look.t("store.read"))} →</span></span></a></article>`;
}

/**
 * One post of the grid.
 * @param post The post.
 * @param look The texts and the date format.
 * @returns The card's HTML.
 */
function card(post: Meta, look: Look): string {
	const picture = post.cover
		? `<img class="blg-thumb" src="${esc(post.cover)}" alt="" loading="lazy">`
		: `<span class="blg-thumb"></span>`;
	const summary = post.summary
		? `<span class="blg-summary">${esc(post.summary)}</span>`
		: "";
	return `<article class="blg-card"><a class="blg-card-link" href="${postPath(post)}">${picture}${kicker(post)}<span class="blg-card-title">${esc(post.title)}</span>${summary}<small class="blg-meta">${metaLine(post, look)}</small></a></article>`;
}

/**
 * The row of tags over the list.
 * @param tags Every tag of the live posts.
 * @param on The slug of the open tag, "" for all posts.
 * @param look The texts.
 * @returns The row's HTML, "" when no post has a tag.
 */
function tagRow(tags: string[], on: string, look: Look): string {
	if (!tags.length) return "";
	const links = [
		`<a class="blg-tag${on ? "" : " is-on"}" href="${BLOG_PATH}">${esc(look.t("store.all"))}</a>`,
	];
	for (const tag of tags)
		links.push(
			`<a class="blg-tag${slugify(tag) === on ? " is-on" : ""}" href="${tagPath(tag)}">${esc(tag)}</a>`,
		);
	return `<nav class="blg-tags">${links.join("")}</nav>`;
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
 * The numbered links to the pages of the list, with an arrow at each end.
 * @param base The list's own path (the blog, or one tag).
 * @param page The open page.
 * @param last The last page.
 * @param look The texts.
 * @returns The pager's HTML, "" when there is one page.
 */
function pager(base: string, page: number, last: number, look: Look): string {
	if (last < 2) return "";
	const links: string[] = [];
	if (page > 1)
		links.push(
			`<a class="blg-page" rel="prev" aria-label="${esc(look.t("store.newer"))}" href="${pagePath(base, page - 1)}">‹</a>`,
		);
	const from = Math.max(1, page - PAGER_SPAN);
	const to = Math.min(last, page + PAGER_SPAN);
	for (let n = from; n <= to; n++)
		links.push(
			n === page
				? `<span class="blg-page is-on" aria-current="page">${n}</span>`
				: `<a class="blg-page" href="${pagePath(base, n)}">${n}</a>`,
		);
	if (page < last)
		links.push(
			`<a class="blg-page" rel="next" aria-label="${esc(look.t("store.older"))}" href="${pagePath(base, page + 1)}">›</a>`,
		);
	return `<nav class="blg-pager" aria-label="${esc(look.t("store.page_of", { page, last }))}">${links.join("")}</nav>`;
}

/**
 * The blog's list page.
 * The first post of the first page is drawn big, the rest as a grid.
 * @param o.title The page's heading.
 * @param o.intro The line under the heading.
 * @param o.posts The posts of this page.
 * @param o.tags Every tag of the live posts.
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
	const cards = rest.map((post) => card(post, look)).join("");
	const empty = o.posts.length
		? ""
		: `<p class="blg-empty">${esc(look.t("store.empty"))}</p>`;
	return `<div class="blg"><header class="blg-head"><h1 class="blg-h1">${esc(o.title)}</h1><p class="blg-intro">${esc(o.intro)}</p></header>${tagRow(o.tags, o.tag, look)}${lead ? featured(lead, look) : ""}${cards ? `<div class="blg-grid">${cards}</div>` : ""}${empty}${pager(base, o.page, o.last, look)}</div>`;
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
				`<a class="blg-share-btn blg-i-${icon}" href="${esc(href)}" target="_blank" aria-label="${esc(name)}" title="${esc(name)}"></a>`,
		)
		.join("");
	return `<nav class="blg-share"><small class="blg-meta">${esc(look.t("store.share"))}</small>${links}</nav>`;
}

/**
 * One of the posts to read next: a small picture, the title, the date.
 * @param post The post.
 * @param look The date format.
 * @returns The HTML.
 */
function mini(post: Meta, look: Look): string {
	const picture = post.cover
		? `<img class="blg-mini-img" src="${esc(post.cover)}" alt="" loading="lazy">`
		: `<span class="blg-mini-img"></span>`;
	const when = post.published_at ? esc(look.date(post.published_at)) : "";
	return `<a class="blg-mini" href="${postPath(post)}">${picture}<span class="blg-mini-text"><span class="blg-mini-title">${esc(post.title)}</span><small class="blg-meta">${when}</small></span></a>`;
}

/**
 * One post's page: a centred column with the title, the cover, the body,
 * then the tags, the share links and the posts to read next.
 * @param post The post, its body already cleaned.
 * @param more Up to two other live posts to read next.
 * @param url The post's full address, for the share links.
 * @param look The texts and the date format.
 * @returns The HTML.
 */
export function postHtml(
	post: Post,
	more: Meta[],
	url: string,
	look: Look,
): string {
	const summary = post.summary
		? `<p class="blg-lead">${esc(post.summary)}</p>`
		: "";
	const cover = post.cover
		? `<img class="blg-cover" src="${esc(post.cover)}" alt="">`
		: "";
	const tags = post.tags
		.map((tag) => `<a class="blg-tag" href="${tagPath(tag)}">${esc(tag)}</a>`)
		.join("");
	const next = more.length
		? `<aside class="blg-more"><h2 class="blg-more-title">${esc(look.t("store.more"))}</h2><div class="blg-more-row">${more.map((one) => mini(one, look)).join("")}</div></aside>`
		: "";
	return `<article class="blg blg-post"><a class="blg-back" href="${BLOG_PATH}">← ${esc(look.t("store.back"))}</a><small class="blg-meta">${metaLine(post, look)}</small><h1 class="blg-title">${esc(post.title)}</h1>${summary}${cover}<div class="blg-body rich-html">${post.body}</div><footer class="blg-foot"><nav class="blg-tags">${tags}</nav>${share(post, url, look)}</footer>${next}</article>`;
}

/**
 * An icon as a CSS mask, drawn in the text colour (Lucide, ISC licence).
 * The page may hold no SVG tag, so the icon lives in the stylesheet.
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
 * Every colour is one of the theme's own variables, so the blog fits
 * each theme, light or dark. The fallbacks are for a theme without them.
 * A body pasted from another page may carry that page's colours and
 * fonts as inline styles: they are switched off, the theme's own show.
 */
export const BLOG_CSS = `
.blg{--blg-fg:var(--store-fg,currentColor);--blg-bg:var(--store-bg,#fff);--blg-muted:var(--store-muted,color-mix(in srgb,currentColor 60%,transparent));--blg-line:var(--store-line,color-mix(in srgb,currentColor 14%,transparent));--blg-soft:var(--store-surface,color-mix(in srgb,currentColor 7%,transparent));--blg-accent:color-mix(in srgb,var(--store-accent,currentColor) 75%,var(--blg-fg));--blg-radius:var(--store-radius,.6rem);--blg-heading:var(--store-font-heading,inherit);display:block;color:var(--blg-fg)}
.blg a{text-decoration:none;color:inherit}
.blg-head{margin:0 0 2rem}
.blg-h1{font-family:var(--blg-heading);font-size:clamp(2.2rem,5vw,3rem);font-weight:600;line-height:1.1;letter-spacing:-.02em;margin:0}
.blg-intro{color:var(--blg-muted);font-size:1.05rem;margin:.6rem 0 0}
.blg-tags{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 2.25rem}
.blg-tag{border:1px solid var(--blg-line);border-radius:999px;padding:.35rem .95rem;font-size:.85rem;font-weight:500;line-height:1.4;background:var(--blg-bg)}
.blg-tag:hover{background:var(--blg-soft)}
.blg-tag.is-on{background:var(--blg-fg);border-color:var(--blg-fg);color:var(--blg-bg)}
.blg-kicker{font-size:.72rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--blg-accent)}
.blg-meta{display:block;font-size:.85rem;color:var(--blg-muted)}
.blg-feat{margin:0 0 2.75rem}
.blg-feat-link{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:2.5rem;align-items:center}
.blg-feat-img{display:block;width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:var(--blg-radius);background:var(--blg-soft)}
.blg-feat-text{display:flex;flex-direction:column;gap:.9rem;min-width:0}
.blg-feat-meta{display:flex;flex-wrap:wrap;gap:.3rem .75rem;align-items:center}
.blg-feat-title{font-family:var(--blg-heading);font-size:clamp(1.6rem,3vw,2.15rem);font-weight:600;line-height:1.15;letter-spacing:-.015em}
.blg-feat-summary{color:var(--blg-muted);font-size:1.02rem;line-height:1.6}
.blg-read{font-weight:600;font-size:.92rem}
.blg-feat-link:hover .blg-feat-title,.blg-card-link:hover .blg-card-title,.blg-mini:hover .blg-mini-title{text-decoration:underline}
.blg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.5rem 2rem}
.blg-card{margin:0}
.blg-card-link{display:flex;flex-direction:column;gap:.55rem}
.blg-thumb{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:var(--blg-radius);background:var(--blg-soft);margin:0 0 .4rem}
.blg-card-title{font-family:var(--blg-heading);font-size:1.35rem;font-weight:600;line-height:1.25}
.blg-summary{font-size:.92rem;line-height:1.6;color:var(--blg-muted)}
.blg-empty{color:var(--blg-muted)}
.blg-pager{display:flex;justify-content:center;align-items:center;gap:.5rem;margin:3rem 0 0}
.blg-page{display:inline-flex;align-items:center;justify-content:center;min-width:2.25rem;height:2.25rem;padding:0 .5rem;border:1px solid var(--blg-line);border-radius:var(--blg-radius);background:var(--blg-bg);font-size:.9rem;font-weight:500}
.blg-page:hover{background:var(--blg-soft)}
.blg-page.is-on{background:var(--blg-fg);border-color:var(--blg-fg);color:var(--blg-bg)}
.blg-post{max-width:47.5rem;margin:0 auto}
.blg-back{display:inline-block;font-size:.9rem;color:var(--blg-muted);margin:0 0 1.5rem}
.blg-back:hover{color:var(--blg-fg)}
.blg-title{font-family:var(--blg-heading);font-size:clamp(2.1rem,5.5vw,2.9rem);font-weight:600;line-height:1.1;letter-spacing:-.02em;margin:.75rem 0 0}
.blg-lead{font-size:1.2rem;line-height:1.5;color:var(--blg-muted);margin:1rem 0 0}
.blg-cover{display:block;width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:var(--blg-radius);margin:1.75rem 0 0}
.blg-body{font-size:1.06rem;line-height:1.75;margin:1.75rem 0 0}
.blg-body [style]{color:inherit!important;background:none!important;font-family:inherit!important;font-size:inherit!important;line-height:inherit!important}
.blg-body h1,.blg-body h2,.blg-body h3{font-family:var(--blg-heading);line-height:1.3;margin:2rem 0 .75rem}
.blg-body h1{font-size:1.75rem}.blg-body h2{font-size:1.6rem}.blg-body h3{font-size:1.3rem}
.blg-body p{margin:0 0 1.1rem}
.blg-body img{max-width:100%;height:auto;border-radius:var(--blg-radius);margin:0}
.blg-body figure{margin:1.75rem 0;text-align:center}
.blg-body figure img{display:inline-block;vertical-align:top}
.blg-body figcaption{font-size:.85rem;color:var(--blg-muted);margin:.6rem 0 0;font-style:italic}
.blg-body a{text-decoration:underline}
.blg-body blockquote{border-left:3px solid var(--blg-accent);margin:1.75rem 0;padding:.25rem 0 .25rem 1.25rem;font-family:var(--blg-heading);font-size:1.35rem;font-style:italic;line-height:1.4}
.blg-foot{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;margin:2.5rem 0 0;padding:1.5rem 0 0;border-top:1px solid var(--blg-line)}
.blg-foot .blg-tags{margin:0}
.blg-share{display:flex;gap:.5rem;align-items:center}
.blg-share-btn{display:inline-flex;align-items:center;justify-content:center;width:2.15rem;height:2.15rem;border:1px solid var(--blg-line);border-radius:50%;background:var(--blg-bg)}
.blg-share-btn:hover{background:var(--blg-soft)}
.blg-share-btn::before{content:"";width:.95rem;height:.95rem;background:var(--blg-fg);-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}
.blg-i-facebook{--i:${ICONS.facebook}}.blg-i-x{--i:${ICONS.x}}.blg-i-mail{--i:${ICONS.mail}}
.blg-more{display:block;margin:2.75rem 0 0}
.blg-more-title{font-family:var(--blg-heading);font-size:1.4rem;font-weight:600;margin:0 0 1rem}
.blg-more-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem}
.blg-mini{display:flex;gap:.9rem;align-items:center;min-width:0}
.blg-mini-img{flex:none;display:block;width:7.5rem;height:5rem;object-fit:cover;border-radius:var(--blg-radius);background:var(--blg-soft)}
.blg-mini-text{display:flex;flex-direction:column;gap:.35rem;min-width:0}
.blg-mini-title{font-weight:600;line-height:1.3}
@media (max-width:860px){.blg-feat-link{grid-template-columns:minmax(0,1fr);gap:1.25rem}.blg-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.blg-grid,.blg-more-row{grid-template-columns:minmax(0,1fr)}}
`;
