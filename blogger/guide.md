# Blog

The Blogger extension gives the shop's online store a blog.
Posts bring visitors from search engines.

## Where it is

- In the app: **Blog**, in the sidebar under Sales. Managers and admins see it. Cashiers do not.
- On the store: `<store address>/blogs` lists the posts. `<store address>/blogs/<link>` shows one post.

## Write a post

1. Open **Blog** and press **New post**.
2. Type the **Title**.
3. The **Link** is made from the title. Type your own to change it.
4. Write the **Body**. The toolbar has text styles, lists, tables and a picture button.
5. Press **Save draft**. Nobody sees a draft on the store.

## Pictures

- **Thumbnail**: the picture on the blog list and on shared links. Best size: 1200 × 630.
- **Pictures in the body**: press the picture button, or paste or drop a picture. Click a picture to change its width, to put it left, in the middle or right, to move it up or down, to add a description (alt text) or a caption, or to delete it.
- Text you paste keeps its headings, lists and links. It loses the colours and fonts of the page it came from.
- Every picture is uploaded to the shop's own storage.

## Tags

- Type a tag and press Enter. A post has up to 10 tags.
- Tags used before show under the box. Press one to add it.
- On the store, a visitor picks a tag to see only its posts.

## Publish

1. Set **Status** to **Published**.
2. Leave **Publish date** empty to go live now. Pick a later date to schedule the post: it stays hidden until then.
3. Press **Publish**.

**Publish now** does all of this in one click: the post is published with the date of this moment. Use it also to bring a scheduled post forward.

To hide a post again, set **Status** to **Draft** and save.

## What the store does by itself

- A **Blog** link shows in the store's menu once one post is live.
- Live posts are in the store's `sitemap.xml`.
- The 20 newest live posts are in the RSS feed, `<store address>/blogs/feed.xml`. Feed readers and AI search use it to find new posts. The footer of the blog links to it.
- Each post has its own title, description and share picture. The **Summary** is the description.

## Delete a post

Press the bin on its row and confirm. The post and its pictures are removed.

## For AI assistants

- With a manager or admin key, the MCP server has five blog tools: `blogger_list_posts`, `blogger_get_post`, `blogger_create_post`, `blogger_update_post` and `blogger_delete_post`.
- Write a new post as a `draft` first, so a person can check it. Then set `status` to `published`.
- `blogger_update_post` changes only the fields you send. The others keep their value.
- A picture must already be uploaded to the shop. A tool cannot upload one.
