/**
 * The "Blog" page, named in the manifest's `pages`.
 * It has two views: the list of posts (list.tsx) and the form of one
 * post (form.tsx). This file only holds the page's state and switches
 * between them.
 * JSX here is plain DOM.
 */
import type { PageScript } from "@extensions/types";
import { showForm } from "./form.tsx";
import { showList } from "./list.tsx";
import { PAGE_CSS } from "./style.ts";
import type { State } from "./utils.ts";

/**
 * Leave the open view and show another one.
 * @param s The page state.
 * @param show Draws the next view.
 */
function go(s: State, show: (s: State) => void | Promise<void>) {
	s.leave?.();
	s.leave = null;
	// the old view goes at once: the next one may load before it draws
	s.root.replaceChildren();
	show(s);
}

const mount: PageScript = (el, api) => {
	const style = (<style>{PAGE_CSS}</style>) as HTMLElement;
	const root = (<div class="blg-page" />) as HTMLElement;
	const s: State = {
		api,
		root,
		posts: [],
		tags: [],
		blogUrl: "",
		filter: { status: "all", tag: "", q: "" },
		openList: () => go(s, showList),
		openForm: (id) => go(s, (state) => showForm(state, id)),
		leave: null,
	};
	el.replaceChildren(style, root);
	// the page is open to managers too, so the link also shows for a cashier
	if (api.user.role === "cashier") {
		root.replaceChildren(<p class="blg-empty">{api.t("error.forbidden")}</p>);
		return;
	}
	s.openList();
	return () => s.leave?.();
};

export default mount;
