import { expect, test } from "bun:test";
import {
	blogUrl,
	type Frame,
	listData,
	listHtml,
	pageHtml,
	postData,
	postHtml,
} from "../lib/render.ts";
import { feedXml } from "../lib/feed.ts";
import {
	checkPost,
	cleanTags,
	isLive,
	livePosts,
	metaOf,
	pageOf,
	picturesAllowed,
	picturesOf,
	slugify,
	tagsOf,
	type Meta,
	type Post,
} from "./posts.ts";

/*
 * The rules of a blog post: link names, tags, what may be in the body,
 * and which posts a visitor of the store can read.
 */

const NOW = new Date("2026-10-13T12:00:00Z");
const base = { shopId: 3, taken: [] as string[], now: NOW };

/**
 * A post's list entry for the tests.
 * @param over What differs from a live post.
 * @returns The entry.
 */
function meta(over: Partial<Meta>): Meta {
	return {
		id: 1,
		title: "Post",
		slug: "post",
		summary: "",
		cover: null,
		tags: [],
		status: "published",
		published_at: "2026-10-01T00:00:00.000Z",
		updated_at: "2026-10-01T00:00:00.000Z",
		minutes: 1,
		...over,
	};
}

test("slug rules: made from the title, letters of any language, checked and unique", () => {
	expect(slugify("  Five ways to Brew — better coffee!  ")).toBe(
		"five-ways-to-brew-better-coffee",
	);
	expect(slugify("กาแฟ ดี")).toBe("กาแฟ-ดี");
	expect(slugify("!!!")).toBe("");
	const made = checkPost({ title: "Hello World", status: "draft" }, base);
	expect(made.post?.slug).toBe("hello-world");
	// a typed link name wins over the title
	const typed = checkPost(
		{ title: "Hello", slug: "my-link", status: "draft" },
		base,
	);
	expect(typed.post?.slug).toBe("my-link");
	for (const slug of ["My Link", "a/b", "-a", "a--b", "a b", "<x>"])
		expect(
			checkPost({ title: "T", slug, status: "draft" }, base).errors?.slug,
			slug,
		).toBe("error.slug");
	expect(
		checkPost(
			{ title: "Hello World", status: "draft" },
			{ ...base, taken: ["hello-world"] },
		).errors,
	).toEqual({ slug: "error.slug_taken" });
	// a title with no letter can't name a link by itself
	expect(checkPost({ title: "!!!", status: "draft" }, base).errors?.slug).toBe(
		"error.slug",
	);
});

test("a post needs a title, a known status and a thumbnail of the shop's own", () => {
	// no title and no link: only the title is asked for
	expect(checkPost({ status: "draft" }, base).errors).toEqual({
		title: "error.title_required",
	});
	expect(checkPost({ title: "T", status: "live" }, base).errors?.status).toBe(
		"error.status",
	);
	expect(
		checkPost(
			{ title: "T", status: "draft", cover: "/uploads/4/extensions/a.webp" },
			base,
		).errors?.cover,
	).toBe("error.cover");
	expect(
		checkPost(
			{ title: "T", status: "draft", cover: "/uploads/3/extensions/a.webp" },
			base,
		).post?.cover,
	).toBe("/uploads/3/extensions/a.webp");
});

test("the body keeps only pictures of ours or https links, never picture data", () => {
	expect(
		picturesAllowed(
			'<p>Hi</p><img src="/uploads/3/extensions/a.webp"><img alt="x" src="https://cdn.example.com/a.png">',
		),
	).toBe(true);
	for (const src of [
		"data:image/png;base64,AAAA",
		"http://example.com/a.png",
		"//example.com/a.png",
		"blob:https://x/1",
		"/other/a.png",
	])
		expect(picturesAllowed(`<img src="${src}">`), src).toBe(false);
	// a picture with no address at all (the cleaner took a bad one away)
	expect(picturesAllowed('<img alt="x">')).toBe(false);
	expect(
		checkPost(
			{
				title: "T",
				status: "draft",
				body: '<img src="data:image/png;base64,AAAA">',
			},
			base,
		).errors,
	).toEqual({ body: "error.body_picture" });
	expect(
		picturesOf({
			cover: "/uploads/3/extensions/c.webp",
			body: '<img src="/uploads/3/extensions/a.webp"><img src="https://x.io/b.png">',
		}),
	).toEqual(["/uploads/3/extensions/c.webp", "/uploads/3/extensions/a.webp"]);
});

test("tags: trimmed, each once whatever its case, ten at most, most used first", () => {
	expect(cleanTags(["  Coffee ", "coffee", "", "Guides", 7, null])).toEqual([
		"Coffee",
		"Guides",
		"7",
	]);
	expect(cleanTags("nope")).toEqual([]);
	expect(
		cleanTags(Array.from({ length: 30 }, (_, i) => `tag ${i}`)),
	).toHaveLength(10);
	expect(
		tagsOf([
			meta({ tags: ["News", "Coffee"] }),
			meta({ tags: ["coffee"] }),
			meta({ tags: ["Apples"] }),
		]),
	).toEqual(["Coffee", "Apples", "News"]);
});

test("draft against published: a draft and a post dated later never show", () => {
	const draft = meta({ id: 1, status: "draft", slug: "draft" });
	const later = meta({
		id: 2,
		slug: "later",
		published_at: "2026-10-20T00:00:00.000Z",
	});
	const old = meta({ id: 3, slug: "old", tags: ["Coffee"] });
	const fresh = meta({
		id: 4,
		slug: "fresh",
		published_at: "2026-10-12T00:00:00.000Z",
	});
	expect(isLive(draft, NOW)).toBe(false);
	expect(isLive(later, NOW)).toBe(false);
	expect(isLive(meta({ published_at: null }), NOW)).toBe(false);
	expect(isLive(old, NOW)).toBe(true);
	// newest first, and the scheduled post shows once its time has come
	const index = [draft, later, old, fresh];
	expect(livePosts(index, NOW).map((p) => p.slug)).toEqual(["fresh", "old"]);
	expect(
		livePosts(index, new Date("2026-10-21T00:00:00Z")).map((p) => p.slug),
	).toEqual(["later", "fresh", "old"]);
	expect(livePosts(index, NOW, "coffee").map((p) => p.slug)).toEqual(["old"]);
	// publishing with no date goes live now; a draft keeps none
	const published = checkPost({ title: "T", status: "published" }, base);
	expect(published.post?.published_at).toBe(NOW.toISOString());
	expect(
		checkPost({ title: "T", status: "draft" }, base).post?.published_at,
	).toBeNull();
	expect(
		checkPost({ title: "T", status: "published", published_at: "soon" }, base)
			.errors?.published_at,
	).toBe("error.date");
});

test("paging: nine posts a page, a page out of range is the nearest one", () => {
	const all = Array.from({ length: 20 }, (_, i) => i);
	expect(pageOf(all, 1).items).toHaveLength(9);
	expect(pageOf(all, 3)).toEqual({ items: [18, 19], page: 3, last: 3 });
	expect(pageOf(all, 99).page).toBe(3);
	expect(pageOf(all, Number.NaN).page).toBe(1);
	expect(pageOf([], 1)).toEqual({ items: [], page: 1, last: 1 });
});

test("the store pages escape what a person typed and link posts, tags and pages", () => {
	const look = {
		t: (key: string, params?: Record<string, string | number>) =>
			params ? `${key}:${Object.values(params).join(",")}` : key,
		blog: "/blogs",
		date: () => "1 Oct 2026",
	};
	const evil = meta({
		title: "<script>x</script>",
		slug: "a b",
		summary: '"quoted" & <b>',
		tags: ["R&D"],
		cover: "/uploads/3/extensions/c.webp",
	});
	const frame = {
		title: "Blog",
		intro: "From the shop",
		tags: ["R&D"],
		counts: { "r-d": 1 },
		total: 2,
	};
	const first = listHtml(
		{
			...frame,
			posts: [evil, meta({ id: 2, slug: "two" })],
			tag: "",
			page: 1,
			last: 3,
		},
		look,
	);
	expect(first).not.toContain("<script>");
	expect(first).toContain("&lt;script&gt;x&lt;/script&gt;");
	expect(first).toContain('<h1 class="blg-h1">Blog</h1>');
	expect(first).toContain('href="/blogs/tag/r-d"');
	expect(first).toContain('src="/uploads/3/extensions/c.webp"');
	// the first post of the first page is drawn big, the others in the grid
	expect(first).toContain(
		'<article class="blg-feat"><a class="blg-feat-link" href="/blogs/a%20b"',
	);
	expect(first.match(/class="blg-card"/g)).toHaveLength(1);
	// the topic tabs carry their number of posts
	expect(first).toContain(
		'<a class="blg-tab" href="/blogs/tag/r-d">R&amp;D<small>1</small></a>',
	);
	// page 1 of 3: no way back, the numbers, on to the second
	expect(first).not.toContain('rel="prev"');
	expect(first).toContain(
		'<span class="blg-page is-on" aria-current="page">1</span>',
	);
	expect(first).toContain(
		'rel="next" aria-label="store.older" href="/blogs?page=2"',
	);
	// a tag's list and a later page have no big post; page 2 leads back to the plain address
	const tagged = listHtml(
		{ ...frame, posts: [evil], tag: "r-d", page: 2, last: 2 },
		look,
	);
	expect(tagged).not.toContain("blg-feat");
	expect(tagged).toContain(
		'rel="prev" aria-label="store.newer" href="/blogs/tag/r-d"',
	);
	expect(
		listHtml(
			{ ...frame, posts: [], tags: [], tag: "", page: 1, last: 1 },
			look,
		),
	).toContain("store.empty");
	const post: Post = { ...evil, body: "<p>Body text</p>" };
	const page = postHtml(
		post,
		[meta({ id: 9, slug: "next", title: "Next" })],
		"https://shop.test/blogs/a%20b",
		"Main Shop",
		look,
	);
	expect(page).toContain(
		'<h1 class="blg-title">&lt;script&gt;x&lt;/script&gt;</h1>',
	);
	expect(page).toContain("<p>Body text</p>");
	expect(page).toContain("&quot;quoted&quot; &amp; &lt;b&gt;");
	expect(page).toContain(
		'<a class="blg-back" href="/blogs" aria-label="store.back">',
	);
	// the posts to read next, and the shop as the author
	expect(page).toContain('class="blg-card-link" href="/blogs/next"');
	expect(page).toContain(
		'<span class="blg-avatar" aria-hidden="true">MS</span>',
	);
	// the share links carry the post's full address, encoded
	expect(page).toContain(
		"https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fshop.test%2Fblogs%2Fa%2520b",
	);
	expect(metaOf(post)).not.toHaveProperty("body");
});

test("a post page tells search engines and AI search what it is", () => {
	const post: Post = {
		...meta({
			title: "Brew </script><script>x()</script>",
			slug: "brew",
			summary: "Better coffee",
			tags: ["Coffee", "Guides"],
		}),
		body: "<p>Text</p>",
	};
	const frame: Frame = {
		lang: "en",
		title: post.title,
		description: post.summary,
		url: "https://shop.test/blogs/brew",
		image: "https://shop.test/uploads/1/a.webp",
		shop: "Main Shop",
		home: "https://shop.test",
		blog: "https://shop.test/blogs",
		t: (key: string) => key,
		type: "article",
		logo: null,
		data: [],
		article: {
			published: post.published_at,
			modified: post.updated_at,
			tags: post.tags,
		},
	};
	frame.data = postData(frame, post);
	const html = pageHtml(frame, "");
	// the structured data parses, and no title can close its script tag
	const scripts = [
		...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
	].map((m) => JSON.parse(m[1] ?? ""));
	expect(scripts.map((one) => one["@type"])).toEqual([
		"BlogPosting",
		"BreadcrumbList",
	]);
	expect(scripts[0].headline).toBe(post.title);
	expect(scripts[0].author.name).toBe("Main Shop");
	expect(scripts[0].keywords).toBe("Coffee, Guides");
	expect(scripts[1].itemListElement).toHaveLength(3);
	expect(html).not.toContain("<script>x()");
	// the head tags of an article
	expect(html).toContain('<meta property="og:type" content="article">');
	expect(html).toContain(
		'<meta name="twitter:card" content="summary_large_image">',
	);
	expect(html).toContain('<meta property="article:tag" content="Guides">');
	expect(html).toContain("max-image-preview:large");
	// a list names its posts with their full addresses
	const list = listData(
		{ ...frame, type: "website", url: "https://shop.test/blogs" },
		[post],
		() => null,
	);
	expect((list[0] as { blogPost: { url: string }[] }).blogPost[0]?.url).toBe(
		"https://shop.test/blogs/brew",
	);
});

test("the feed carries whole posts with full addresses, and nothing can break its XML", () => {
	const post: Post = {
		...meta({
			title: "Tea & <cake>",
			slug: "tea",
			summary: "A summary",
			tags: ["Recipes"],
			cover: "/uploads/1/c.webp",
		}),
		body: '<p>Hi ]]> there</p><img src="/uploads/1/a.webp"><a href="//evil.test">x</a>',
	};
	const xml = feedXml(
		{
			title: "Blog · Main Shop",
			description: "News",
			home: "https://shop.test",
			blog: "https://shop.test/blogs",
			lang: "en",
		},
		[post],
	);
	expect(xml).toContain("<title>Tea &amp; &lt;cake&gt;</title>");
	expect(xml).toContain("<link>https://shop.test/blogs/tea</link>");
	expect(xml).toContain("<category>Recipes</category>");
	expect(xml).toContain(
		'<atom:link href="https://shop.test/blogs/feed.xml" rel="self"',
	);
	// pictures get the store's address; a link to another site stays as it is
	expect(xml).toContain('src="https://shop.test/uploads/1/a.webp"');
	expect(xml).toContain('src="https://shop.test/uploads/1/c.webp"');
	expect(xml).toContain('href="//evil.test"');
	// a "]]>" in the body does not end the CDATA block early
	expect(xml).toContain("Hi ]]]]><![CDATA[> there");
});

/**
 * Build a whole post page and a list page on one blog address.
 * @param blog Where the blog starts.
 * @returns The post page and the list page.
 */
function pagesOn(blog: string): { post: string; list: string } {
	const look = { t: (key: string) => key, blog, date: () => "1 Oct 2026" };
	const post: Post = {
		...meta({ slug: "brew", tags: ["Coffee"] }),
		body: "<p>Text</p>",
	};
	const frame: Frame = {
		lang: "en",
		title: post.title,
		description: "",
		url: `${blog}/brew`,
		image: null,
		shop: "Main Shop",
		home: "https://shop.x.com",
		blog,
		t: look.t,
		type: "article",
		logo: null,
		data: [],
	};
	frame.data = postData(frame, post);
	const body = postHtml(
		post,
		[meta({ id: 2, slug: "next" })],
		frame.url,
		"Main Shop",
		look,
	);
	const list = listHtml(
		{
			title: "Blog",
			intro: "",
			posts: [post],
			tags: ["Coffee"],
			counts: { coffee: 1 },
			total: 1,
			tag: "",
			page: 1,
			last: 2,
		},
		look,
	);
	return { post: pageHtml(frame, body), list };
}

test("every blog link starts at the blog's address, also on another host", () => {
	const { post, list } = pagesOn("https://blog.x.com");
	expect(post).toContain(
		'<link rel="canonical" href="https://blog.x.com/brew">',
	);
	expect(post).toContain(
		'<meta property="og:url" content="https://blog.x.com/brew">',
	);
	expect(post).toContain('href="https://blog.x.com/feed.xml"');
	expect(post).toContain('href="https://blog.x.com/tag/coffee"');
	expect(post).toContain(
		'class="blg-card-link" href="https://blog.x.com/next"',
	);
	expect(post).toContain('"url":"https://blog.x.com"');
	expect(list).toContain('href="https://blog.x.com/brew"');
	expect(list).toContain('href="https://blog.x.com/tag/coffee"');
	expect(list).toContain('href="https://blog.x.com?page=2"');
	// the way back to the shop stays on the store's host
	expect(post).toContain('<a href="https://shop.x.com/track">');
	expect(post).not.toContain('"/blogs');
});

test("without a blog address from the app, the blog is /blogs of the store", () => {
	const store = "https://shop.x.com";
	expect(blogUrl({ store_url: store })).toBe("https://shop.x.com/blogs");
	expect(blogUrl({ store_url: store, storefront: {} })).toBe(
		"https://shop.x.com/blogs",
	);
	expect(
		blogUrl({ store_url: store, storefront: { url: "https://blog.x.com/" } }),
	).toBe("https://blog.x.com");
	const { post } = pagesOn(blogUrl({ store_url: store }));
	expect(post).toContain(
		'<link rel="canonical" href="https://shop.x.com/blogs/brew">',
	);
	expect(post).toContain('href="https://shop.x.com/blogs/feed.xml"');
	expect(post).toContain('href="https://shop.x.com/blogs/tag/coffee"');
});
