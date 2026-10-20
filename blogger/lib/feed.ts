/**
 * The blog's RSS 2.0 feed, at `/blogs/feed.xml`.
 * Feed readers, aggregators and AI search follow it to find new posts.
 * Each item carries the whole post (`content:encoded`), not only the
 * summary, with every picture as a full address.
 */
import { BLOG_PATH, type Post } from "../assets/posts.ts";
import { esc, postPath } from "./render.ts";

/** How many of the newest posts the feed lists. */
export const FEED_SIZE = 20;

/** The feed's path in the store. */
export const FEED_PATH = `${BLOG_PATH}/feed.xml`;

/** What the feed says about the blog itself. */
export type FeedInfo = {
	/** The feed's title: the blog's name and the shop's. */
	title: string;
	/** One line about the blog. */
	description: string;
	/** The address of the shop's online store, no `/` at the end. */
	home: string;
	/** The language of the posts, like "en". */
	lang: string;
};

/**
 * Put HTML in a CDATA block.
 * A `]]>` inside would end the block early, so it is split in two.
 * @param html The HTML.
 * @returns The CDATA block.
 */
function cdata(html: string): string {
	return `<![CDATA[${html.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/**
 * Give every picture and link of a body the store's full address:
 * a feed reader does not know which site a `/uploads/…` path is on.
 * @param html The post's body.
 * @param home The store's address.
 * @returns The body with full addresses.
 */
function absolute(html: string, home: string): string {
	return html.replace(/\b(src|href)="\/(?!\/)/g, `$1="${home}/`);
}

/**
 * One post as a feed item.
 * @param post The post, with its cleaned body.
 * @param home The store's address.
 * @returns The `<item>` XML.
 */
function item(post: Post, home: string): string {
	const url = `${home}${postPath(post)}`;
	const date = post.published_at
		? `<pubDate>${new Date(post.published_at).toUTCString()}</pubDate>`
		: "";
	const tags = post.tags
		.map((tag) => `<category>${esc(tag)}</category>`)
		.join("");
	const cover = post.cover
		? `<p><img src="${esc(post.cover)}" alt="${esc(post.title)}"></p>`
		: "";
	return `<item><title>${esc(post.title)}</title><link>${esc(url)}</link><guid isPermaLink="true">${esc(url)}</guid>${date}<description>${esc(post.summary)}</description>${tags}<content:encoded>${cdata(absolute(cover + post.body, home))}</content:encoded></item>`;
}

/**
 * The whole feed.
 * @param info What the feed says about the blog.
 * @param posts The newest live posts, newest first, with their bodies.
 * @returns The RSS XML.
 */
export function feedXml(info: FeedInfo, posts: Post[]): string {
	const self = `${info.home}${FEED_PATH}`;
	// the last change of any post in it, not only the newest post
	const newest = posts.map((post) => post.updated_at).sort().at(-1);
	const built = newest
		? `<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`
		: "";
	return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${esc(info.title)}</title><link>${esc(info.home + BLOG_PATH)}</link><description>${esc(info.description)}</description><language>${esc(info.lang)}</language>${built}<atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>${posts.map((post) => item(post, info.home)).join("")}</channel></rss>`;
}
