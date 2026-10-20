/**
 * The few icons the Blog page shows (Lucide, ISC licence).
 * They draw in the text colour.
 * The JSX here is plain DOM.
 */

/**
 * The inner shapes of each icon, on a 24 × 24 grid.
 */
const PATHS = {
	plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
	x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
	pencil:
		'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
	trash:
		'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
	external:
		'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
	upload:
		'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
	image:
		'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
};
export type IconName = keyof typeof PATHS;

/**
 * Draw an icon.
 * @param props.name Which icon.
 * @param props.size Its width and height in pixels.
 * @returns The icon in a span.
 */
export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
	const span = (<span style="display:inline-flex;flex:none" />) as HTMLElement;
	span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
	return span;
}
