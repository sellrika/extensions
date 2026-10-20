/**
 * The list view of the Blog page: the tabs, the tag and search filters
 * and one row per post.
 * JSX here is plain DOM. The smaller pieces live in components/.
 */
import { slugify, type Meta } from "./posts.ts";
import { Icon } from "./components/icons.tsx";
import { PostRow } from "./components/PostRow.tsx";
import {
	dateText,
	json,
	shownOf,
	type Filter,
	type ListAnswer,
	type State,
} from "./utils.ts";

/** The tabs of the list, in order. */
const TABS = ["all", "published", "draft"] as const;

/** What the list view draws into. */
type View = { s: State; tabs: HTMLElement; rows: HTMLElement };

/**
 * Does a post pass the filters?
 * @param post The post.
 * @param filter The filters.
 * @returns True when the list shows it.
 */
function passes(post: Meta, filter: Filter): boolean {
	if (filter.status !== "all" && post.status !== filter.status) return false;
	if (filter.tag && !post.tags.some((tag) => slugify(tag) === filter.tag))
		return false;
	const q = filter.q.trim().toLowerCase();
	return !q || `${post.title} ${post.slug}`.toLowerCase().includes(q);
}

/**
 * How many posts a tab holds.
 * @param s The page state.
 * @param tab The tab.
 * @returns The count.
 */
function countOf(s: State, tab: (typeof TABS)[number]): number {
	if (tab === "all") return s.posts.length;
	let n = 0;
	for (const post of s.posts) if (post.status === tab) n++;
	return n;
}

/**
 * Open a tab.
 * @param v The list view.
 * @param tab The tab.
 */
function setTab(v: View, tab: Filter["status"]) {
	v.s.filter.status = tab;
	renderTabs(v);
	renderRows(v);
}

/**
 * Draw the tabs with their counts.
 * @param v The list view.
 */
function renderTabs(v: View) {
	v.tabs.replaceChildren(
		...TABS.map((tab) => (
			<button
				type="button"
				class="blg-tab"
				aria-pressed={v.s.filter.status === tab ? "true" : "false"}
				onclick={() => setTab(v, tab)}
			>
				{v.s.api.t(`tab.${tab}`)}
				<span class="blg-tab-count">{countOf(v.s, tab)}</span>
			</button>
		)),
	);
}

/**
 * Ask before a post is deleted, then delete it.
 * @param v The list view.
 * @param post The post.
 */
function askDelete(v: View, post: Meta) {
	const { api } = v.s;
	const cancel = api.ui.button(api.t("action.cancel"), { variant: "outline" });
	const confirm = api.ui.button(api.t("action.delete"), {
		variant: "destructive",
	});
	const box = api.dialog({
		title: api.t("delete.title"),
		description: api.t("delete.text", { title: post.title }),
		footer: [cancel, confirm],
		size: "sm",
	});
	cancel.onclick = () => box.close();
	confirm.onclick = () => runDelete(v, post, box.close);
}

/**
 * Delete a post and draw the list again.
 * @param v The list view.
 * @param post The post.
 * @param close Closes the dialog.
 */
async function runDelete(v: View, post: Meta, close: () => void) {
	const { api } = v.s;
	try {
		await json(api, `/posts/${post.id}`, { method: "DELETE" });
		v.s.posts = v.s.posts.filter((one) => one.id !== post.id);
		api.toast(api.t("delete.done"));
		renderTabs(v);
		renderRows(v);
	} catch (error) {
		api.toast((error as Error).message, "error");
	}
	close();
}

/**
 * Draw the rows that pass the filters.
 * @param v The list view.
 */
function renderRows(v: View) {
	const { api, filter, posts } = v.s;
	const rows = posts.filter((post) => passes(post, filter));
	if (!rows.length)
		return v.rows.replaceChildren(
			<li class="blg-empty">
				{api.t(posts.length ? "list.none" : "list.empty")}
			</li>,
		);
	v.rows.replaceChildren(
		...rows.map(function row(post) {
			const shown = shownOf(post);
			return (
				<PostRow
					post={post}
					shown={shown}
					status={api.t(`status.${shown}`)}
					date={dateText(post.published_at, api.locale)}
					labels={{
						edit: api.t("action.edit_post", { title: post.title }),
						delete: api.t("action.delete_post", { title: post.title }),
					}}
					onedit={() => v.s.openForm(post.id)}
					ondelete={() => askDelete(v, post)}
				/>
			);
		}),
	);
}

/**
 * The header buttons of the list: View blog and New post.
 * @param s The page state.
 * @returns The buttons in one element.
 */
function listActions(s: State) {
	const { api } = s;
	const view = api.ui.button(api.t("action.view_blog"), { variant: "outline" });
	view.prepend(<Icon name="external" size={15} />);
	view.onclick = () => window.open(s.blogUrl, "_blank", "noopener");
	const add = api.ui.button(api.t("action.new_post"));
	add.prepend(<Icon name="plus" size={15} />);
	add.onclick = () => s.openForm(null);
	return <div class="blg-actions">{[view, add]}</div>;
}

/**
 * Show the list: load the posts, then draw the filters and the rows.
 * @param s The page state.
 */
export async function showList(s: State) {
	const { api } = s;
	const actions = listActions(s);
	if (api.actions) api.actions.replaceChildren(actions);
	s.leave = () => actions.remove();
	try {
		const found = await json<ListAnswer>(api, "/posts");
		s.posts = found.posts;
		s.tags = found.tags;
		s.blogUrl = found.blog_url;
	} catch (error) {
		api.toast((error as Error).message, "error");
	}
	const tagBox = api.ui.select(
		[
			{ value: "", label: api.t("filter.all_tags") },
			...s.tags.map((tag) => ({ value: slugify(tag), label: tag })),
		],
		{ "aria-label": api.t("filter.tag"), value: s.filter.tag },
	);
	const search = api.ui.searchInput({
		placeholder: api.t("filter.search"),
		"aria-label": api.t("filter.search"),
		value: s.filter.q,
	});
	search.classList.add("blg-search");
	const v: View = {
		s,
		tabs: (<div class="blg-tabs" />) as HTMLElement,
		rows: (<ul class="blg-rows" />) as HTMLElement,
	};
	tagBox.onchange = () => {
		s.filter.tag = tagBox.value;
		renderRows(v);
	};
	search.input.oninput = () => {
		s.filter.q = search.input.value;
		renderRows(v);
	};
	renderTabs(v);
	renderRows(v);
	s.root.replaceChildren(
		api.actions ? "" : <div class="blg-top">{actions}</div>,
		<div class="blg-list">
			<div class="blg-bar">
				{v.tabs}
				<div class="blg-bar-end">
					{tagBox}
					{search}
				</div>
			</div>
			<div class="blg-head">
				<span>{api.t("col.post")}</span>
				<span>{api.t("col.tags")}</span>
				<span>{api.t("col.status")}</span>
				<span>{api.t("col.date")}</span>
				<span />
			</div>
			{v.rows}
		</div>,
	);
}
