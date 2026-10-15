/**
 * One post of the list: its thumbnail, title and address, its tags,
 * its state, its date and the two buttons.
 * The JSX here is plain DOM.
 */
import type { Meta } from "../posts.ts";
import type { Shown } from "../utils.ts";
import { Icon } from "./icons.tsx";

/**
 * One row of the post list.
 * @param props.post The post.
 * @param props.shown Its state, as the pill shows it.
 * @param props.status The pill's text.
 * @param props.date The date's text.
 * @param props.labels The names of the two buttons, for screen readers.
 * @param props.onedit Run to open the post.
 * @param props.ondelete Run to delete it.
 * @returns The row element.
 */
export function PostRow({
	post,
	shown,
	status,
	date,
	labels,
	onedit,
	ondelete,
}: {
	post: Meta;
	shown: Shown;
	status: string;
	date: string;
	labels: { edit: string; delete: string };
	onedit: () => void;
	ondelete: () => void;
}) {
	return (
		<li class="blg-row" data-post={post.slug}>
			<button type="button" class="blg-post" onclick={onedit}>
				{post.cover ? (
					<img class="blg-thumb" src={post.cover} alt="" loading="lazy" />
				) : (
					<span class="blg-thumb" />
				)}
				<span class="blg-post-text">
					<span class="blg-post-title">{post.title}</span>
					<span class="blg-post-slug">/blogs/{post.slug}</span>
				</span>
			</button>
			<div class="blg-chips">
				{post.tags.map((tag) => (
					<span class="blg-chip">{tag}</span>
				))}
			</div>
			<div>
				<span class={`blg-pill blg-pill-${shown}`}>{status}</span>
			</div>
			<span class="blg-date">{date}</span>
			<div class="blg-row-actions">
				<button
					type="button"
					class="blg-icon-btn"
					aria-label={labels.edit}
					title={labels.edit}
					onclick={onedit}
				>
					<Icon name="pencil" size={15} />
				</button>
				<button
					type="button"
					class="blg-icon-btn"
					aria-label={labels.delete}
					title={labels.delete}
					onclick={ondelete}
				>
					<Icon name="trash" size={15} />
				</button>
			</div>
		</li>
	);
}
