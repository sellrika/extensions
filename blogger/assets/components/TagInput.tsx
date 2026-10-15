/**
 * The tag box of the form: the post's tags as chips, a text box to add
 * one (Enter or a comma), and the tags used before to pick from.
 * The JSX here is plain DOM.
 */
import { cleanTags, slugify, TAGS_MAX } from "../posts.ts";
import { Icon } from "./icons.tsx";

/** What the tag box holds and draws into. */
type Model = {
	tags: string[];
	suggestions: string[];
	labels: { add: string; remove: string; used: string };
	onchange: (tags: string[]) => void;
	chips: HTMLElement;
	input: HTMLInputElement;
	suggest: HTMLElement;
};

/**
 * Keep a new list of tags, draw it and tell the form.
 * @param m The tag box.
 * @param tags The new tags.
 */
function setTags(m: Model, tags: string[]) {
	m.tags = cleanTags(tags);
	draw(m);
	m.onchange(m.tags);
}

/**
 * Add what the text box holds as a tag.
 * @param m The tag box.
 */
function addTyped(m: Model) {
	const typed = m.input.value;
	m.input.value = "";
	if (typed.trim()) setTags(m, [...m.tags, ...typed.split(",")]);
}

/**
 * A key in the text box: Enter or a comma adds the tag, Backspace in
 * an empty box takes the last one away.
 * @param m The tag box.
 * @param e The key event.
 */
function onKey(m: Model, e: KeyboardEvent) {
	if (e.key === "Enter" || e.key === ",") {
		e.preventDefault();
		addTyped(m);
	} else if (e.key === "Backspace" && !m.input.value && m.tags.length)
		setTags(m, m.tags.slice(0, -1));
}

/**
 * Draw the chips and the tags to pick from.
 * @param m The tag box.
 */
function draw(m: Model) {
	m.chips.replaceChildren(
		...m.tags.map((tag) => (
			<span class="blg-chip blg-chip-on" data-tag={tag}>
				{tag}
				<button
					type="button"
					aria-label={`${m.labels.remove} ${tag}`}
					onclick={() =>
						setTags(
							m,
							m.tags.filter((one) => one !== tag),
						)
					}
				>
					<Icon name="x" size={12} />
				</button>
			</span>
		)),
	);
	const has = new Set(m.tags.map(slugify));
	const open = m.suggestions.filter((tag) => !has.has(slugify(tag)));
	m.input.disabled = m.tags.length >= TAGS_MAX;
	m.suggest.hidden = !open.length || m.tags.length >= TAGS_MAX;
	m.suggest.replaceChildren(
		<span class="blg-note">{m.labels.used}</span>,
		...open.slice(0, 8).map((tag) => (
			<button
				type="button"
				class="blg-chip blg-chip-add"
				onclick={() => setTags(m, [...m.tags, tag])}
			>
				<Icon name="plus" size={11} />
				{tag}
			</button>
		)),
	);
}

/**
 * The tag box.
 * @param props.tags The post's tags.
 * @param props.suggestions The tags other posts use.
 * @param props.labels The placeholder, the remove button's name and the
 * line before the suggestions.
 * @param props.onchange Called with the tags after every change.
 * @returns The box element.
 */
export function TagInput(props: {
	tags: string[];
	suggestions: string[];
	labels: { add: string; remove: string; used: string };
	onchange: (tags: string[]) => void;
}) {
	const m = { ...props } as Model;
	m.chips = (<span style="display:contents" />) as HTMLElement;
	m.input = (
		<input
			type="text"
			id="blg-tags"
			placeholder={props.labels.add}
			aria-label={props.labels.add}
			data-slot="tag-input"
			onkeydown={(e: KeyboardEvent) => onKey(m, e)}
			onblur={() => addTyped(m)}
		/>
	) as HTMLInputElement;
	m.suggest = (<div class="blg-suggest" />) as HTMLElement;
	draw(m);
	return (
		<div style="display:flex;flex-direction:column;gap:.6rem">
			<label class="blg-taginput" for="blg-tags">
				{m.chips}
				{m.input}
			</label>
			{m.suggest}
		</div>
	);
}
