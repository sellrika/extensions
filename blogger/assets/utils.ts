/**
 * What the Blog page's scripts share: the page's state, a fetch that
 * throws, and the small helpers for dates and status.
 */
import type { Api } from "@extensions/types";
import { isLive, type Meta, type Status } from "./posts.ts";

/** What a post shows as its state: a published post with a later date is scheduled. */
export type Shown = Status | "scheduled";

/** The filters of the list. */
export type Filter = { status: "all" | Status; tag: string; q: string };

/**
 * Everything the page holds.
 */
export type State = {
	/** The extension api of this page. */
	api: Api;
	/** The element the open view is drawn in. */
	root: HTMLElement;
	/** Every post of the shop, without its body. */
	posts: Meta[];
	/** The tags in use, most used first. */
	tags: string[];
	/** The address of the blog on the shop's store. */
	blogUrl: string;
	/** What the list is narrowed to. */
	filter: Filter;
	/** Opens the list. */
	openList: () => void;
	/** Opens the form for a post, or for a new one (null). */
	openForm: (id: number | null) => void;
	/** Run when the open view goes. */
	leave: (() => void) | null;
};

/** What `GET /posts` answers. */
export type ListAnswer = { posts: Meta[]; tags: string[]; blog_url: string };

/** A refused request: the message, and the errors by field when it is a form. */
export class Refused extends Error {
	constructor(
		message: string,
		public fields: Record<string, string> = {},
	) {
		super(message);
	}
}

/**
 * Call one of the extension's routes and read its JSON.
 * @param api The extension api.
 * @param path The route's path.
 * @param init The method and the body, when it is not a read.
 * @returns The answer.
 * @throws `Refused` when the route answers with an error.
 */
export async function json<T>(
	api: Api,
	path: string,
	init?: { method: string; body?: unknown },
): Promise<T> {
	const res = await api.fetch(path, {
		method: init?.method ?? "GET",
		headers: { "content-type": "application/json" },
		body: init?.body === undefined ? undefined : JSON.stringify(init.body),
	});
	const data = await res.json().catch(() => null);
	if (res.ok) return data as T;
	const fields = (data?.errors ?? {}) as Record<string, string>;
	throw new Refused(
		data?.error ?? Object.values(fields)[0] ?? api.t("error.failed"),
		fields,
	);
}

/**
 * What a post shows as its state.
 * @param post The post's list entry.
 * @returns `draft`, `scheduled` or `published`.
 */
export function shownOf(post: Meta): Shown {
	if (post.status === "draft") return "draft";
	return isLive(post, new Date()) ? "published" : "scheduled";
}

/**
 * A post's date as the list shows it.
 * @param iso The ISO time, or null.
 * @param locale The page's language.
 * @returns The date, or a dash for none.
 */
export function dateText(iso: string | null, locale: string): string {
	if (!iso) return "—";
	return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
		new Date(iso),
	);
}

/**
 * An ISO time as a `datetime-local` input wants it, in the browser's zone.
 * @param iso The ISO time, or null.
 * @returns `YYYY-MM-DDTHH:mm`, or "" for none.
 */
export function toLocalInput(iso: string | null): string {
	if (!iso) return "";
	const at = new Date(iso);
	const local = new Date(at.getTime() - at.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

/**
 * The value of a `datetime-local` input as an ISO time.
 * @param value The input's value.
 * @returns The ISO time in UTC, or null for an empty or broken value.
 */
export function fromLocalInput(value: string): string | null {
	const at = new Date(value);
	return value && !Number.isNaN(at.getTime()) ? at.toISOString() : null;
}
