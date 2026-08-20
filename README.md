# root@night

A static site for CTF machine writeups, security research, and news. Black-and-purple, terminal-themed, no build step.

## Structure

```
index.html      home page (terminal hero + latest writeups/blog)
writeups.html   full writeup listing with tag filters
blog.html       blog / news listing
post.html       single post template — duplicate this for each new writeup or post
about.html      about page
css/style.css   design system (all colors/type as CSS variables at the top)
js/main.js      terminal typing effect, tag filters, mobile nav
```

## Editing content

- **New writeup or post**: duplicate `post.html`, update the title, meta, and prose content, then add a matching `<article class="card">` to `index.html` and/or `writeups.html` / `blog.html`.
- **Difficulty badges**: use classes `badge easy` / `badge medium` / `badge hard` / `badge insane`.
- **Tag filters** (writeups.html): each card needs `data-tags="tag-one,tag-two"` matching a `data-filter` value in the `.filter-bar` buttons.
- **Colors/fonts**: all defined as CSS custom properties at the top of `css/style.css` — change once, applies everywhere.
- **Socials**: update the links in the `<footer class="site-footer">` block on every page.

## Publishing on GitHub Pages

1. Push this content to your repo (root, or a `/docs` folder — your choice).
2. In the repo settings, enable **Pages** and point it at that branch/folder.
3. That's it — no build step, it's plain HTML/CSS/JS.

## Notes

- Fonts (Space Grotesk, Inter, JetBrains Mono) load from Google Fonts via the `<link>` tags in each page's `<head>`. Swap for self-hosted fonts if you'd rather not depend on that.
- All placeholder content (writeup titles, bio, social links) is meant to be replaced with your own.
