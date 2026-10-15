import { expect, test, type Page } from "@playwright/test";
import { enableGlobally, login, TINY_PNG } from "../../e2e/helpers";
import { storeOf } from "../../e2e/tmp";

// The Blogger extension: a manager writes a post with a thumbnail, a picture in the body and a tag,
// keeps it as a draft (the store answers 404), publishes it, and a visitor reads it on the store's host.
const STORE = storeOf("y-blogger");
const run = Date.now().toString(36);
const TITLE = `Brew better coffee ${run}`;
const SLUG = `brew-better-coffee-${run}`;
const SUMMARY = "Five small changes for a better cup at home.";

test.describe.configure({ mode: "serial" });

let admin: Page;
let visitor: Page;
test.beforeAll(async ({ browser }) => {
	admin = await browser.newPage();
	await login(admin);
	visitor = await (await browser.newContext()).newPage();
});
/**
 * Press a button of the page's heading. Toasts sit over those buttons
 * and stay while the tab is at the back, so the button itself is clicked.
 * @param name The button's name.
 */
function press(name: string) {
	return admin
		.getByRole("button", { name, exact: true })
		.dispatchEvent("click");
}
test.afterAll(async () => {
	await admin.close();
	await visitor.context().close();
});

test("the store is on, the extension is switched on, and the blog starts empty", async () => {
	await admin.goto("/online-store");
	await admin.getByRole("switch", { name: "Enable online store" }).click();
	await admin.getByRole("button", { name: "Save settings" }).click();
	await expect(admin.getByText("Online store settings saved")).toBeVisible();
	// before the extension runs, the store has no such address
	expect((await visitor.goto(`${STORE}/blogs`))!.status()).toBe(404);

	await enableGlobally(admin, "Blogger");
	await admin.goto("/extensions");
	const ext = admin.getByRole("row").filter({ hasText: "Blogger" });
	await ext.getByLabel("Blogger enabled").click();
	await expect(ext.getByLabel("Blogger enabled")).toBeChecked();

	expect((await visitor.goto(`${STORE}/blogs`))!.status()).toBe(200);
	await expect(visitor.getByRole("heading", { name: "Blog" })).toBeVisible();
	await expect(visitor.getByText("No posts yet.")).toBeVisible();
	// no post is live: the store's menu has no Blog link yet
	await visitor.goto(STORE);
	await expect(visitor.getByRole("link", { name: "Blog" })).toHaveCount(0);
});

test("write a post with a thumbnail, a picture in the body and a tag; a draft answers 404", async () => {
	await admin.getByRole("link", { name: "Blog", exact: true }).click();
	await expect(admin).toHaveURL(/\/extensions\/blogger\/posts$/);
	await expect(
		admin.getByText("No posts yet. Write your first one."),
	).toBeVisible();
	await admin.getByRole("button", { name: "New post" }).click();

	// a post needs a title
	await admin.getByRole("button", { name: "Save draft" }).click();
	await expect(admin.getByText("Give the post a title.").first()).toBeVisible();

	await admin.getByLabel("Title").fill(TITLE);
	// the link is made from the title until one is typed
	await expect(admin.getByLabel("Link")).toHaveAttribute("placeholder", SLUG);
	const body = admin.getByRole("textbox", { name: "Body" });
	await body.click();
	await admin.keyboard.type("Good coffee does not need an expensive machine.");
	await admin.keyboard.press("Enter");
	await admin.keyboard.type("onetwo");
	for (let i = 0; i < 3; i++) await admin.keyboard.press("ArrowLeft");
	// the app's own editor uploads the picture: the text keeps its path, never its data
	const chooser = admin.waitForEvent("filechooser");
	await admin.getByRole("button", { name: "Insert picture" }).click();
	await (await chooser).setFiles(TINY_PNG);
	const picture = body.locator("img");
	await expect(picture).toHaveAttribute("src", /^\/uploads\/\d+\/extensions\//);
	// it lands where the caret was: the paragraph is split around it
	const figure = body.locator("figure");
	const around = () =>
		figure.evaluate((el) => [
			el.previousSibling?.textContent,
			el.nextSibling?.textContent,
		]);
	expect(await around()).toEqual(["one", "two"]);
	// the picture tools: its width, its side, its place, its description and a caption
	await picture.click();
	await admin.getByLabel("Width").fill("50");
	await expect(picture).toHaveAttribute("style", /width: 50%/);
	await admin.getByRole("button", { name: "Picture in the middle" }).click();
	await expect(figure).toHaveAttribute("style", /text-align: center/);
	await admin.getByRole("button", { name: "Move picture up" }).click();
	expect(await around()).toEqual([
		"Good coffee does not need an expensive machine.",
		"one",
	]);
	await admin
		.getByLabel("Describe the picture (alt text)")
		.fill("A coffee grinder");
	await admin.getByRole("button", { name: "Add caption" }).click();
	await expect(body.locator("figcaption")).toHaveText("Caption");

	await admin.locator('[data-slot="cover-file"]').setInputFiles(TINY_PNG);
	await expect(admin.getByRole("button", { name: "Replace" })).toBeVisible();
	await admin.locator('[data-slot="tag-input"]').fill("Coffee");
	await admin.keyboard.press("Enter");
	await expect(admin.locator('[data-tag="Coffee"]')).toBeVisible();
	await admin.locator("#blg-summary").fill(SUMMARY);
	await admin.getByRole("button", { name: "Save draft" }).click();
	await expect(admin.getByText("Draft saved.").last()).toBeVisible();

	// nobody reads a draft: not its page, not the list, not the sitemap
	expect((await visitor.goto(`${STORE}/blogs/${SLUG}`))!.status()).toBe(404);
	await visitor.goto(`${STORE}/blogs`);
	await expect(visitor.getByText(TITLE)).toHaveCount(0);
	expect(
		await (await visitor.request.get(`${STORE}/sitemap.xml`)).text(),
	).not.toContain("/blogs");
});

test("publish: the post is on the store with its head tags, picture, tag, menu link and sitemap entry", async () => {
	// one click: published, dated this moment
	// the draft's toasts sit over the page's buttons in a tab at the back: click the button itself
	await admin
		.getByRole("button", { name: "Publish now" })
		.dispatchEvent("click");
	await expect(admin.getByText("Post published.").last()).toBeVisible();

	const res = await visitor.goto(`${STORE}/blogs/${SLUG}`);
	expect(res!.status()).toBe(200);
	await expect(visitor).toHaveTitle(`${TITLE} · Main Shop`);
	await expect(
		visitor.getByRole("heading", { name: TITLE, level: 1 }),
	).toBeVisible();
	await expect(
		visitor.getByText("Good coffee does not need an expensive machine."),
	).toBeVisible();
	await expect(visitor.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		SUMMARY,
	);
	await expect(visitor.locator('meta[property="og:image"]')).toHaveAttribute(
		"content",
		/\/uploads\/\d+\/extensions\//,
	);
	// the picture in the body really loads on the store's host, with its alt text and caption
	const picture = visitor.locator(".blg-body img");
	await expect(picture).toHaveAttribute("alt", "A coffee grinder");
	// the width and the side picked in the editor hold on the store
	await expect(picture).toHaveAttribute("style", /width: 50%/);
	await expect(visitor.locator(".blg-body figure")).toHaveAttribute(
		"style",
		/text-align: center/,
	);
	// a live post has nothing to publish now
	await expect(admin.getByRole("button", { name: "Publish now" })).toBeHidden();
	await expect
		.poll(() =>
			picture.evaluate(
				(img: HTMLImageElement) => img.complete && img.naturalWidth,
			),
		)
		.toBeGreaterThan(0);
	await expect(visitor.locator(".blg-body figcaption")).toHaveText("Caption");
	await expect
		.poll(() =>
			visitor
				.locator(".blg-cover")
				.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth),
		)
		.toBeGreaterThan(0);
	// the post's own back link leads to the blog, not to the shop
	await expect(
		visitor.getByRole("link", { name: "Back to blog" }),
	).toHaveAttribute("href", "/blogs");
	// share links, with the post's own address
	await expect(visitor.getByRole("link", { name: "Facebook" })).toHaveAttribute(
		"href",
		new RegExp(`sharer\\.php\\?u=.*blogs%2F${SLUG}`),
	);
	// the theme's own frame is around it
	await expect(
		visitor.getByRole("button", { name: "Open cart" }),
	).toBeVisible();

	// the tag leads to its own list; an unknown tag is not there
	await visitor.getByRole("link", { name: "Coffee", exact: true }).click();
	await expect(visitor).toHaveURL(`${STORE}/blogs/tag/coffee`);
	await expect(
		visitor.getByRole("heading", { name: "Posts tagged Coffee" }),
	).toBeVisible();
	await expect(visitor.getByText(TITLE)).toBeVisible();
	expect((await visitor.goto(`${STORE}/blogs/tag/nothing`))!.status()).toBe(
		404,
	);

	// the list, the menu link and the sitemap
	await visitor.goto(STORE);
	await visitor.getByRole("link", { name: "Blog" }).first().click();
	await expect(visitor).toHaveURL(`${STORE}/blogs`);
	await visitor.getByRole("link", { name: new RegExp(TITLE) }).click();
	await expect(visitor).toHaveURL(`${STORE}/blogs/${SLUG}`);
	const sitemap = await (
		await visitor.request.get(`${STORE}/sitemap.xml`)
	).text();
	expect(sitemap).toContain(`<loc>${STORE}/blogs</loc>`);
	expect(sitemap).toContain(`<loc>${STORE}/blogs/${SLUG}</loc>`);
});

test("the server refuses picture data in a body and a link another post uses; a script is cleaned away", async () => {
	const post = (data: Record<string, unknown>) =>
		admin.request.post("/ext/blogger/posts", { data });
	const base64 = await post({
		title: "Data picture",
		status: "draft",
		body: '<p>x</p><img src="data:image/png;base64,iVBORw0KGgo=">',
	});
	expect(base64.status()).toBe(422);
	expect((await base64.json()).errors.body).toContain("picture");
	const taken = await post({ title: "Again", slug: SLUG, status: "draft" });
	expect((await taken.json()).errors.slug).toBe(
		"Another post already uses this link.",
	);
	const cleaned = await post({
		title: `Clean ${run}`,
		status: "published",
		body: '<p onclick="x()">Safe text</p><script>window.hacked = 1</script>',
	});
	expect(cleaned.status()).toBe(200);
	expect((await cleaned.json()).body).toBe("<p>Safe text</p>");
	await visitor.goto(`${STORE}/blogs/clean-${run}`);
	await expect(visitor.getByText("Safe text")).toBeVisible();
	expect(await visitor.evaluate(() => "hacked" in window)).toBe(false);
});

test("the list filters by status and tag; back to draft hides the post; delete removes it", async () => {
	await press("Back");
	const row = admin.locator(`[data-post="${SLUG}"]`);
	await expect(row.getByText("Published", { exact: true })).toBeVisible();
	await expect(row.getByText("Coffee", { exact: true })).toBeVisible();
	await admin.getByRole("button", { name: /^Drafts/ }).click();
	await expect(row).toHaveCount(0);
	await admin.getByRole("button", { name: /^All/ }).click();
	await admin.getByLabel("Tag").selectOption({ label: "Coffee" });
	// the post with no tag is filtered out
	await expect(row).toBeVisible();
	await expect(admin.locator(`[data-post="clean-${run}"]`)).toHaveCount(0);

	await row.getByRole("button", { name: `Edit ${TITLE}` }).click();
	await expect(admin.getByLabel("Title")).toHaveValue(TITLE);
	await admin.locator('[data-status="draft"]').click();
	await press("Save draft");
	await expect(admin.getByText("Draft saved.").last()).toBeVisible();
	expect((await visitor.goto(`${STORE}/blogs/${SLUG}`))!.status()).toBe(404);

	await press("Back");
	await row.getByRole("button", { name: `Delete ${TITLE}` }).click();
	await admin.getByRole("button", { name: "Delete", exact: true }).click();
	await expect(admin.getByText("Post deleted.").last()).toBeVisible();
	await expect(row).toHaveCount(0);
});
