/**
 * The form view of the Blog page: one post.
 * Left: the title, the link name and the body (the app's own editor,
 * `api.richText`). Right: the status, the thumbnail, the tags, the
 * summary and how the post looks in a search result.
 * JSX here is plain DOM. The smaller pieces live in components/.
 */
import type { Api } from "@extensions/types";
import { Icon } from "./components/icons.tsx";
import { TagInput } from "./components/TagInput.tsx";
import {
	isLive,
	slugify,
	SUMMARY_MAX,
	TITLE_MAX,
	type Post,
	type Status,
} from "./posts.ts";
import {
	fromLocalInput,
	json,
	Refused,
	toLocalInput,
	type State,
} from "./utils.ts";

/** How many characters of a summary a search result shows. */
const SEARCH_DESC = 160;

/** The fields that can show an error under them. */
const FIELDS = ["title", "slug", "body", "cover", "summary", "published_at"];

/** What the form sends: a post without what the server works out. */
type Draft = Pick<
	Post,
	"title" | "slug" | "summary" | "cover" | "body" | "tags" | "status"
> & { published_at: string | null };

/** Everything the form holds. */
type Form = {
	s: State;
	api: Api;
	/** The post's id, or null while it is new. */
	id: number | null;
	draft: Draft;
	/** True once the person typed a link name: the title no longer sets it. */
	slugTyped: boolean;
	editor: ReturnType<Api["richText"]>;
	title: HTMLInputElement;
	slug: HTMLInputElement;
	summary: HTMLTextAreaElement;
	date: HTMLInputElement;
	count: HTMLElement;
	status: HTMLElement;
	cover: HTMLElement;
	file: HTMLInputElement;
	preview: HTMLElement;
	save: HTMLButtonElement;
	/** Publish now: one click sets the post live with the date of this moment. */
	now: HTMLButtonElement;
	view: HTMLButtonElement;
	/** Field name → the element its error is drawn in. */
	errors: Record<string, HTMLElement>;
};

/**
 * A new, empty post.
 * @returns The draft.
 */
function blank(): Draft {
	return {
		title: "",
		slug: "",
		summary: "",
		cover: null,
		body: "",
		tags: [],
		status: "draft",
		published_at: null,
	};
}

/**
 * The link name the post will get.
 * @param f The form.
 * @returns What the person typed, else the title as a slug.
 */
function slugOf(f: Form): string {
	return f.draft.slug.trim() || slugify(f.draft.title);
}

/**
 * Draw the two status buttons.
 * @param f The form.
 */
function renderStatus(f: Form) {
	f.status.replaceChildren(
		...(["draft", "published"] as Status[]).map((status) => (
			<button
				type="button"
				data-status={status}
				aria-pressed={f.draft.status === status ? "true" : "false"}
				onclick={() => setStatus(f, status)}
			>
				{f.api.t(`status.${status}`)}
			</button>
		)),
	);
	f.save.textContent = f.api.t(
		f.draft.status === "published" ? "action.publish" : "action.save_draft",
	);
}

/**
 * Pick draft or published.
 * @param f The form.
 * @param status The picked status.
 */
function setStatus(f: Form, status: Status) {
	f.draft.status = status;
	renderStatus(f);
}

/**
 * Draw the thumbnail: the picture with Replace and Remove, or the
 * box to pick one.
 * @param f The form.
 */
function renderCover(f: Form) {
	const { api } = f;
	const pick = () => f.file.click();
	if (!f.draft.cover)
		return f.cover.replaceChildren(
			<button type="button" class="blg-cover blg-cover-none" onclick={pick}>
				<Icon name="image" size={22} />
				{api.t("cover.add")}
			</button>,
		);
	const replace = api.ui.button(api.t("cover.replace"), {
		variant: "outline",
		size: "sm",
	});
	replace.prepend(<Icon name="upload" size={14} />);
	replace.onclick = pick;
	const remove = api.ui.button(api.t("cover.remove"), {
		variant: "outline",
		size: "sm",
	});
	remove.prepend(<Icon name="trash" size={14} />);
	remove.onclick = () => setCover(f, null);
	f.cover.replaceChildren(
		<img class="blg-cover" src={f.draft.cover} alt="" />,
		<div class="blg-cover-actions">{[replace, remove]}</div>,
	);
}

/**
 * Keep a thumbnail, or none.
 * @param f The form.
 * @param url The picture's path, or null.
 */
function setCover(f: Form, url: string | null) {
	f.draft.cover = url;
	renderCover(f);
}

/**
 * Upload the picked file as the thumbnail.
 * @param f The form.
 */
async function uploadCover(f: Form) {
	const picked = f.file.files?.[0];
	f.file.value = "";
	if (!picked) return;
	const result = await f.api.upload(picked);
	if ("error" in result) return f.api.toast(result.error, "error");
	setCover(f, result.url);
}

/**
 * Draw the summary's counter and the search preview.
 * @param f The form.
 */
function renderPreview(f: Form) {
	const { api, draft } = f;
	f.count.textContent = `${draft.summary.length} / ${SUMMARY_MAX}`;
	const address = `${f.s.blogUrl}/${slugOf(f)}`.replace(/^https?:\/\//, "");
	const text = draft.summary || api.t("preview.no_summary");
	f.preview.replaceChildren(
		<div class="blg-preview-url">{address}</div>,
		<div class="blg-preview-title">
			{draft.title || api.t("preview.no_title")} · {api.shop.name}
		</div>,
		<div class="blg-preview-desc">
			{text.length > SEARCH_DESC ? `${text.slice(0, SEARCH_DESC)}…` : text}
		</div>,
	);
}

/**
 * The title changed: it also names the link until one is typed.
 * @param f The form.
 */
function onTitle(f: Form) {
	f.draft.title = f.title.value;
	if (!f.slugTyped) f.slug.placeholder = slugify(f.draft.title);
	renderPreview(f);
}

/**
 * The link name changed.
 * @param f The form.
 */
function onSlug(f: Form) {
	f.draft.slug = f.slug.value;
	f.slugTyped = !!f.slug.value.trim();
	renderPreview(f);
}

/**
 * The summary changed.
 * @param f The form.
 */
function onSummary(f: Form) {
	f.draft.summary = f.summary.value;
	renderPreview(f);
}

/**
 * Draw the errors of the last save under their fields.
 * @param f The form.
 * @param fields Field name → message. Empty clears them.
 */
function renderErrors(f: Form, fields: Record<string, string>) {
	for (const name of FIELDS) {
		const box = f.errors[name]!;
		box.replaceChildren(fields[name] ? f.api.ui.error(fields[name]) : "");
	}
}

/**
 * Save the post. A new one becomes an edit of itself afterwards.
 * @param f The form.
 */
async function submit(f: Form) {
	const { api } = f;
	f.save.disabled = true;
	f.now.disabled = true;
	renderErrors(f, {});
	try {
		const saved = await json<Post>(
			api,
			f.id === null ? "/posts" : `/posts/${f.id}`,
			{
				method: f.id === null ? "POST" : "PUT",
				body: {
					...f.draft,
					slug: slugOf(f),
					body: f.editor.value(),
					published_at: fromLocalInput(f.date.value),
				},
			},
		);
		f.id = saved.id;
		fill(f, saved);
		api.toast(
			api.t(saved.status === "published" ? "saved.published" : "saved.draft"),
		);
	} catch (error) {
		if (error instanceof Refused) renderErrors(f, error.fields);
		api.toast((error as Error).message, "error");
	}
	f.save.disabled = false;
	f.now.disabled = false;
}

/**
 * Publish the post at once: published, dated this moment, saved.
 * It also brings a scheduled post forward.
 * @param f The form.
 */
function publishNow(f: Form) {
	f.draft.status = "published";
	f.date.value = toLocalInput(new Date().toISOString());
	renderStatus(f);
	return submit(f);
}

/**
 * Put a saved post into the form's fields.
 * @param f The form.
 * @param post The post.
 */
function fill(f: Form, post: Post) {
	f.draft = {
		title: post.title,
		slug: post.slug,
		summary: post.summary,
		cover: post.cover,
		body: post.body,
		tags: post.tags,
		status: post.status,
		published_at: post.published_at,
	};
	f.slugTyped = true;
	f.title.value = post.title;
	f.slug.value = post.slug;
	f.summary.value = post.summary;
	f.date.value = toLocalInput(post.published_at);
	if (f.editor.value() !== post.body) f.editor.set(post.body);
	f.view.hidden = post.status !== "published";
	// a post that is live already has nothing to publish now
	f.now.hidden = isLive(post, new Date());
	renderStatus(f);
	renderCover(f);
	renderPreview(f);
}

/**
 * One card of the right column.
 * @param props.title The card's title.
 * @param props.note A small text at the right of the title.
 * @param props.children What the card holds.
 * @returns The card element.
 */
function SideCard({
	title,
	note,
	children,
}: {
	title: string;
	note?: HTMLElement | string;
	children?: unknown;
}) {
	return (
		<section class="blg-card">
			<div class="blg-card-head">
				<span class="blg-card-title">{title}</span>
				{note ? <span class="blg-note">{note}</span> : null}
			</div>
			{children as HTMLElement[]}
		</section>
	);
}

/**
 * Build the form's elements and wire them to the form.
 * @param s The page state.
 * @returns The form, not yet on the page.
 */
function build(s: State): Form {
	const { api } = s;
	const errors: Record<string, HTMLElement> = {};
	for (const name of FIELDS) errors[name] = (<div />) as HTMLElement;
	const f = {
		s,
		api,
		id: null,
		draft: blank(),
		slugTyped: false,
		errors,
		title: api.ui.input({
			id: "blg-title",
			maxlength: TITLE_MAX,
			placeholder: api.t("field.title_placeholder"),
		}),
		slug: api.ui.input({ id: "blg-slug", "aria-label": api.t("field.slug") }),
		summary: api.ui.textarea({
			id: "blg-summary",
			rows: 4,
			maxlength: SUMMARY_MAX,
		}),
		date: api.ui.input({ id: "blg-date", type: "datetime-local" }),
		count: (<span />) as HTMLElement,
		status: (<div class="blg-seg" />) as HTMLElement,
		cover: (
			<div style="display:flex;flex-direction:column;gap:.75rem" />
		) as HTMLElement,
		file: (
			<input type="file" accept="image/*" hidden data-slot="cover-file" />
		) as HTMLInputElement,
		preview: (
			<div style="display:flex;flex-direction:column;gap:.3rem" />
		) as HTMLElement,
		save: api.ui.button(api.t("action.save_draft")),
		now: api.ui.button(api.t("action.publish_now"), { variant: "outline" }),
		view: api.ui.button(api.t("action.view_post"), { variant: "outline" }),
	} as unknown as Form;
	f.editor = api.richText({ label: api.t("field.body") });
	f.title.classList.add("blg-title-input");
	f.view.prepend(<Icon name="external" size={15} />);
	f.view.hidden = true;
	f.title.oninput = () => onTitle(f);
	f.slug.oninput = () => onSlug(f);
	f.summary.oninput = () => onSummary(f);
	f.file.onchange = () => uploadCover(f);
	f.save.onclick = () => submit(f);
	f.now.onclick = () => publishNow(f);
	f.view.onclick = () =>
		window.open(`${s.blogUrl}/${slugOf(f)}`, "_blank", "noopener");
	return f;
}

/**
 * The form's two columns.
 * @param f The form.
 * @returns The element.
 */
function layout(f: Form) {
	const { api } = f;
	const base = `${f.s.blogUrl.replace(/^https?:\/\//, "")}/`;
	return (
		<div class="blg-form">
			<div class="blg-card blg-main">
				{api.ui.field(api.ui.label(api.t("field.title"), "blg-title"), f.title)}
				{f.errors.title}
				{api.ui.field(
					api.ui.label(api.t("field.slug"), "blg-slug"),
					(
						<div class="blg-slug">
							<span class="blg-slug-base">{base}</span>
							{f.slug}
						</div>
					) as HTMLElement,
					api.t("field.slug_hint"),
				)}
				{f.errors.slug}
				<div class="blg-editor">
					{api.ui.field(api.ui.label(api.t("field.body")), f.editor.el)}
				</div>
				{f.errors.body}
			</div>
			<div class="blg-side">
				<SideCard title={api.t("card.status")}>
					{f.status}
					{api.ui.field(
						api.ui.label(api.t("field.date"), "blg-date"),
						f.date,
						api.t("field.date_hint"),
					)}
					{f.errors.published_at}
				</SideCard>
				<SideCard title={api.t("card.cover")} note="1200 × 630">
					{f.cover}
					{f.file}
					{api.ui.hint(api.t("cover.hint"))}
					{f.errors.cover}
				</SideCard>
				<SideCard title={api.t("card.tags")}>
					<TagInput
						tags={f.draft.tags}
						suggestions={f.s.tags}
						labels={{
							add: api.t("tags.add"),
							remove: api.t("tags.remove"),
							used: api.t("tags.used"),
						}}
						onchange={(tags: string[]) => {
							f.draft.tags = tags;
						}}
					/>
				</SideCard>
				<SideCard title={api.t("card.summary")} note={f.count}>
					{f.summary}
					{api.ui.hint(api.t("summary.hint"))}
					{f.errors.summary}
				</SideCard>
				<SideCard title={api.t("card.preview")}>{f.preview}</SideCard>
			</div>
		</div>
	);
}

/**
 * Show the form for a post, or for a new one.
 * @param s The page state.
 * @param id The post to open, or null for a new one.
 */
export async function showForm(s: State, id: number | null) {
	const { api } = s;
	const f = build(s);
	const back = api.ui.button(api.t("action.back"), { variant: "ghost" });
	back.prepend(<Icon name="left" size={15} />);
	back.onclick = () => s.openList();
	const actions = (
		<div class="blg-actions">{[back, f.view, f.now, f.save]}</div>
	);
	if (api.actions) api.actions.replaceChildren(actions);
	s.leave = () => {
		f.editor.destroy();
		actions.remove();
	};
	if (id !== null)
		try {
			const post = await json<Post>(api, `/posts/${id}`);
			f.id = post.id;
			fill(f, post);
		} catch (error) {
			api.toast((error as Error).message, "error");
			return s.openList();
		}
	else {
		renderStatus(f);
		renderCover(f);
		renderPreview(f);
	}
	// the tag box is built from the loaded post, so the layout comes last
	s.root.replaceChildren(
		api.actions ? "" : <div class="blg-top">{actions}</div>,
		layout(f),
	);
}
