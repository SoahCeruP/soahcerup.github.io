# soahcerup@notes

A static site for CTF machine writeups, security research, and news. Black-and-purple,
terminal-themed. You write Markdown, GitHub builds and publishes it — no server, no database,
no build tools required on your machine unless you want to preview locally.

## How it works

```
content/writeups/*.md   ← one Markdown file per machine writeup
content/blog/*.md       ← one Markdown file per blog/news post
templates/*.html        ← page layouts (edit these to change design/structure)
css/, js/                ← styling and the terminal-typing / filter behavior
scripts/build.js        ← reads content/, renders templates/, writes dist/
dist/                   ← generated output (gitignored — never edit by hand)
```

On every push to `main`, a GitHub Actions workflow (`.github/workflows/deploy.yml`) runs
`npm run build` and publishes the `dist/` folder to GitHub Pages automatically. You never need to
run the build yourself unless you want to preview locally first.

## Adding a new writeup

Create a new file in `content/writeups/`, e.g. `content/writeups/my-new-box.md`:

```markdown
---
title: My New Box — SSRF to root
date: 2026-08-20
platform: HTB · Linux
difficulty: medium
tags: [web, ssrf, privesc]
excerpt: One sentence summary shown on the card and in the page description.
---

Your writeup content here, in normal Markdown. Use `## headings`, code fences,
> blockquotes, and lists as needed — it'll come out styled to match the rest of the site.
```

- `difficulty` must be one of: `easy`, `medium`, `hard`, `insane`.
- `tags` power the filter buttons on the writeups page — reuse existing tags where they fit so
  the filters stay meaningful, introduce new ones freely otherwise.
- The filename (minus `.md`) becomes the page URL, e.g. `my-new-box.html`. Set an explicit `slug:`
  field in the frontmatter if you want the URL to differ from the filename.

Commit and push — the site rebuilds and republishes on its own.

## Adding a new blog/news post

Same idea, in `content/blog/`:

```markdown
---
title: A post title
date: 2026-08-20
kicker: news
excerpt: One sentence summary.
---

Post content in Markdown.
```

`kicker` is the small label shown on the card (`news`, `research`, `opinion`, or anything you like).

## Previewing locally (optional)

```
npm install
npm run build     # writes dist/
npm run serve     # serves dist/ at http://localhost:3000
```

## Editing the design

- Colors, fonts, spacing: all defined as CSS custom properties at the top of `css/style.css`.
- Page structure/layout: edit the files in `templates/`. Tokens like `{{TITLE}}` and `{{CONTENT}}`
  are filled in by the build script — don't rename them unless you update `scripts/build.js` to match.
- The `about.html` template has no tokens; edit it directly, it's copied through as-is.

## Security notes

This site has no comments, no user accounts, and no form submissions — there's nothing for a
visitor to send the server, because there is no server beyond GitHub Pages hosting static files.
That's deliberate. A few things that keep it that way:

- **Markdown, not raw HTML.** The build renders content with `html: false`, so anything that looks
  like a `<script>` tag typed into a `.md` file is displayed as literal text, not executed. This
  matters less when you're the only author, but it's a free safeguard against a copy-pasted
  code snippet accidentally becoming live markup.
- **Pinned, minimal dependencies.** Only two npm packages (`gray-matter`, `markdown-it`) are used
  to build the site, and `npm ci` in the GitHub Actions workflow installs exactly the versions
  locked in `package-lock.json` — nothing floats to a newer, unreviewed version on its own.
- **No secrets involved.** The build needs no API keys, tokens, or credentials, so there's nothing
  sensitive sitting in the repo or in GitHub Actions to leak.
- **If you ever add anything interactive later** (a contact form, comments, analytics, a search
  box that calls an API) — that's the point where you'd need to think about input validation,
  rate limiting, and where the data goes. Until then, the attack surface is essentially "can
  someone edit files in my GitHub repo," which is already covered by your GitHub account security.

## Publishing on GitHub Pages

1. Push this repo to GitHub.
2. In **Settings → Pages**, set Source to **GitHub Actions** (not "Deploy from a branch").
3. Push to `main` — the workflow builds and deploys automatically. Check the **Actions** tab if a
   deploy doesn't show up; build errors (like a missing frontmatter field) show up there with a
   clear message pointing at the file that needs fixing.
