/**
 * The stylesheet of the Blog page.
 * The page brings its own, so it looks the same from an uploaded zip.
 * Colours are the app's own variables: light and dark both fit.
 */
export const PAGE_CSS = `
.blg-card{background:var(--card);border:1px solid var(--border);border-radius:calc(var(--radius) + 6px);padding:1.25rem 1.5rem}
.blg-bar{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:space-between;margin:0 0 1rem}
.blg-bar-end{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}
.blg-bar-end select{width:auto;min-width:9rem}
.blg-bar-end .blg-search{width:16rem;max-width:100%}
.blg-tabs{display:inline-flex;gap:2px;padding:3px;border-radius:9px;background:var(--muted)}
.blg-tab{display:inline-flex;gap:.45rem;align-items:center;border-radius:7px;padding:.35rem .85rem;font-size:.82rem;font-weight:500;color:var(--muted-foreground)}
.blg-tab[aria-pressed="true"]{background:var(--background);color:var(--foreground);box-shadow:0 1px 2px rgb(0 0 0 / .08)}
.blg-tab-count{font-weight:400;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.blg-rows{list-style:none;margin:0;padding:0}
.blg-head,.blg-row{display:grid;grid-template-columns:minmax(0,1fr) 15rem 7.5rem 8rem 4.75rem;gap:1rem;align-items:center}
.blg-head{padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.75rem;font-weight:500;color:var(--muted-foreground)}
.blg-row{padding:.7rem 0;border-bottom:1px solid var(--border)}
.blg-row:last-child{border-bottom:0}
.blg-post{display:flex;gap:.85rem;align-items:center;min-width:0;text-align:left}
.blg-post:hover .blg-post-title{text-decoration:underline}
.blg-thumb{flex:none;width:72px;height:48px;border-radius:6px;background:var(--muted);object-fit:cover;display:block}
.blg-post-text{min-width:0}
.blg-post-title{display:block;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.blg-post-slug{display:block;font-size:.75rem;color:var(--muted-foreground);font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.blg-chips{display:flex;flex-wrap:wrap;gap:.35rem}
.blg-chip{display:inline-flex;align-items:center;gap:.25rem;border-radius:999px;padding:.12rem .6rem;font-size:.75rem;background:var(--muted);color:var(--muted-foreground)}
.blg-chip-on{background:color-mix(in srgb,var(--primary) 18%,transparent);color:var(--foreground);font-weight:500}
.blg-chip-add{background:none;border:1px solid var(--border)}
.blg-chip-add:hover{background:var(--muted)}
.blg-chip button{display:inline-flex;opacity:.7}
.blg-chip button:hover{opacity:1}
.blg-pill{display:inline-flex;align-items:center;gap:.4rem;border-radius:999px;padding:.12rem .6rem;font-size:.75rem;font-weight:500;background:var(--muted);color:var(--muted-foreground)}
.blg-pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.blg-pill-published{background:color-mix(in srgb,#22c55e 16%,transparent);color:#16a34a}
.blg-pill-scheduled{background:color-mix(in srgb,#3b82f6 16%,transparent);color:#3b82f6}
.blg-date{font-size:.82rem;color:var(--muted-foreground)}
.blg-row-actions{display:flex;justify-content:flex-end;gap:.15rem}
.blg-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;border-radius:7px;color:var(--muted-foreground)}
.blg-icon-btn:hover{background:var(--muted);color:var(--foreground)}
.blg-empty{padding:2.5rem 0;text-align:center;color:var(--muted-foreground)}
.blg-form{display:grid;grid-template-columns:minmax(0,1fr) 22rem;gap:1.25rem;align-items:start}
.blg-main,.blg-side{display:flex;flex-direction:column;gap:1.25rem;min-width:0}
.blg-main{gap:1.1rem}
.blg-side .blg-card{display:flex;flex-direction:column;gap:.85rem;padding:1.1rem 1.25rem}
.blg-card-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.blg-card-title{font-weight:600}
.blg-note{font-size:.75rem;color:var(--muted-foreground)}
.blg-title-input{font-size:1.1rem;font-weight:600;height:2.75rem}
.blg-slug{display:flex;align-items:center;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.blg-slug-base{flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 0 0 .75rem;font-size:.8rem;color:var(--muted-foreground);font-family:ui-monospace,monospace}
.blg-slug input{border:0;box-shadow:none;border-radius:0;padding-left:.15rem;font-family:ui-monospace,monospace;font-size:.8rem}
.blg-editor .rich-html{min-height:26rem}
.blg-editor .rich-html img{max-width:100%;height:auto;border-radius:.5rem;cursor:pointer}
.blg-editor .rich-html figure{margin:1rem 0;text-align:center}
.blg-editor .rich-html figcaption{font-size:.8rem;color:var(--muted-foreground);font-style:italic;margin-top:.35rem}
.blg-seg{display:grid;grid-template-columns:1fr 1fr;gap:2px;padding:3px;border-radius:9px;background:var(--muted)}
.blg-seg button{border-radius:7px;padding:.4rem;font-size:.82rem;font-weight:500;color:var(--muted-foreground)}
.blg-seg button[aria-pressed="true"]{background:var(--background);color:var(--foreground);box-shadow:0 1px 2px rgb(0 0 0 / .08)}
.blg-cover{display:block;width:100%;aspect-ratio:1200/630;border-radius:10px;background:var(--muted);object-fit:cover}
.blg-cover-none{display:flex;flex-direction:column;gap:.4rem;align-items:center;justify-content:center;border:1px dashed var(--border);background:none;color:var(--muted-foreground);font-size:.82rem;cursor:pointer}
.blg-cover-none:hover{background:var(--muted)}
.blg-cover-actions{display:flex;gap:.5rem}
.blg-cover-actions button{flex:1}
.blg-taginput{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;border:1px solid var(--border);border-radius:var(--radius);padding:.4rem;cursor:text}
.blg-taginput input{flex:1;min-width:6rem;border:0;outline:0;background:none;font-size:.82rem;padding:.15rem .25rem}
.blg-suggest{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}
.blg-preview-url{font-size:.75rem;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.blg-preview-title{font-size:.95rem;line-height:1.3;color:#3b82f6}
.blg-preview-desc{font-size:.78rem;line-height:1.5;color:var(--muted-foreground)}
.blg-actions{display:flex;gap:.6rem;align-items:center}
.blg-actions a,.blg-actions button{display:inline-flex;gap:.4rem;align-items:center}
.blg-top{display:flex;justify-content:flex-end;margin:0 0 1rem}
@media (max-width:1100px){.blg-form{grid-template-columns:minmax(0,1fr)}.blg-head{display:none}.blg-row{grid-template-columns:minmax(0,1fr) auto;row-gap:.5rem}.blg-row .blg-chips,.blg-row .blg-date{display:none}}
`;
