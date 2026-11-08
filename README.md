# Sellrika extensions

Our own extensions for [Sellrika](https://github.com/sellrika/sellrika).
Each folder with an `extension.json` is one extension.

| Extension | What it does |
|---|---|
| `blogger` | A blog for the shop's online store: posts with pictures and tags, at `/blogs`. |

## Work on an extension

This repo lives inside the app, as its `custom-extensions/` folder.

```sh
git clone git@github.com:sellrika/sellrika.git
cd sellrika
git clone git@github.com:sellrika/extensions.git custom-extensions
bun install
bun run dev
```

The app loads every extension of this folder like a built-in one.
An edit shows after a reload. No zip is needed.

1. Open **Admin › Global Extensions** and switch the extension on for all shops.
2. Open **Settings › Extensions** and enable it for your shop.

| Command (run in the app's folder) | What it does |
|---|---|
| `bun run make:extension <key> --custom` | A new extension in `custom-extensions/<key>/` |
| `bun run build:extension <key>` | Its zip, in `custom-extensions/<key>/dist/` |
| `bun check` | Type check, with the app's types |
| `bun test --path-ignore-patterns='**/e2e/**' ./custom-extensions` | The unit tests of this repo |
| `bun run build && bunx playwright test --project=<spec>` | One browser test of `e2e/`, like `y-blogger` |

Import the types from the app: `import type { Routes } from "@extensions/types"`.

## Use an extension on your own Sellrika

A GitHub Action builds every extension on each push to `main`.

1. Open **Admin › Global Extensions**.
2. Choose **Import from URL** and paste the link of the zip:
   - The newest build: `https://github.com/sellrika/extensions/releases/download/latest/<key>.zip`
   - One fixed version: `https://github.com/sellrika/extensions/releases/download/<key>-v<version>/<key>-<version>.zip`
3. Switch it on for all shops. Each shop then enables it under **Settings › Extensions**.

For the blog: `https://github.com/sellrika/extensions/releases/download/latest/blogger.zip`

## Release a change

Raise `version` in the extension's `extension.json`, then merge to `main`.
A version is released once. The `latest` link always holds the newest build.

Keep `app_version` right: the Sellrika versions the extension runs on, like `">=1.1.4"`.
Sellrika refuses a zip with no `app_version`, or one that does not fit the running app.
Raise it when the extension starts to use something new of the app.

Set `update_url` to `https://github.com/sellrika/extensions/releases/download/latest/<key>.json`.
The build writes that file on every release. Sellrika reads it every 6 hours.
When it names a newer version, **Admin › Global Extensions** shows an update badge and an **Update** button.
A Sellrika that runs an older version with no `update_url` (Blogger 1.1.7 or older) never sees it.
Import a version that has `update_url` once by link. From then on, updates show on their own.
