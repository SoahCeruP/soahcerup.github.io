#!/usr/bin/env node
/**
 * soahcerup@mind — static site build script
 *
 * Reads Markdown files from content/writeups and content/blog,
 * renders them through the HTML templates in templates/, and
 * writes plain static HTML into dist/.
 *
 * This is the ONLY code that runs. The deployed site (dist/) is
 * pure static HTML/CSS/JS — no server, no database, no user input
 * processed at runtime, so there is nothing for a visitor to attack.
 * Keep it that way: don't add forms, comments, or server-side code
 * without thinking through the security implications first.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const DIST_DIR = path.join(ROOT, 'dist');

// html: false is deliberate — raw HTML in a content file is rendered as
// literal text, not executed. Content files should only ever contain
// Markdown, never <script> or other tags, even though you're the only
// author. It costs nothing and removes a whole class of mistakes.
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'];

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date)) throw new Error(`Invalid date: ${d}`);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function readEntries(subdir, requiredFields) {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const filepath = path.join(dir, filename);
      const raw = fs.readFileSync(filepath, 'utf8');
      const { data, content } = matter(raw);

      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          throw new Error(`${subdir}/${filename}: missing required frontmatter field "${field}"`);
        }
      }

      const slug = data.slug ? slugify(data.slug) : slugify(filename.replace(/\.md$/, ''));

      return {
        ...data,
        slug,
        dateDisplay: formatDate(data.date),
        dateSort: new Date(data.date).getTime(),
        html: md.render(content),
        sourceFile: `${subdir}/${filename}`,
      };
    })
    .sort((a, b) => b.dateSort - a.dateSort);
}

function loadWriteups() {
  return readEntries('writeups', ['title', 'date', 'platform', 'difficulty', 'tags', 'excerpt'])
    .map(w => {
      if (!DIFFICULTIES.includes(w.difficulty)) {
        throw new Error(`writeups/${w.sourceFile}: difficulty must be one of ${DIFFICULTIES.join(', ')}, got "${w.difficulty}"`);
      }
      if (!Array.isArray(w.tags) || w.tags.length === 0) {
        throw new Error(`writeups/${w.sourceFile}: tags must be a non-empty array`);
      }
      return w;
    });
}

function loadBlogPosts() {
  return readEntries('blog', ['title', 'date', 'kicker', 'excerpt']);
}

function render(templateName, tokens) {
  let html = fs.readFileSync(path.join(TEMPLATES_DIR, templateName), 'utf8');
  for (const [key, value] of Object.entries(tokens)) {
    html = html.split(`{{${key}}}`).join(value);
  }
  const leftover = html.match(/{{[A-Z_]+}}/);
  if (leftover) {
    throw new Error(`${templateName}: unresolved token ${leftover[0]}`);
  }
  return html;
}

function writeupCard(w) {
  const tags = w.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  return `        <article class="card" data-tags="${w.tags.map(escapeHtml).join(',')}">
          <div class="card-meta">
            <span>${escapeHtml(w.platform)}</span>
            <span class="badge ${w.difficulty}">${w.difficulty}</span>
          </div>
          <h3><a href="${w.slug}.html">${escapeHtml(w.title)}</a></h3>
          <p>${escapeHtml(w.excerpt)}</p>
          <div class="tags">${tags}</div>
        </article>`;
}

function blogCard(p) {
  return `        <article class="card post">
          <div class="card-meta"><span class="kicker">${escapeHtml(p.kicker)}</span><span>${p.dateDisplay}</span></div>
          <h3><a href="${p.slug}.html">${escapeHtml(p.title)}</a></h3>
          <p>${escapeHtml(p.excerpt)}</p>
        </article>`;
}

function build() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const writeups = loadWriteups();
  const blogPosts = loadBlogPosts();

  const buildDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

  // ---- static assets ----
  fs.cpSync(path.join(ROOT, 'css'), path.join(DIST_DIR, 'css'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'js'), path.join(DIST_DIR, 'js'), { recursive: true });
  fs.copyFileSync(path.join(TEMPLATES_DIR, 'about.html'), path.join(DIST_DIR, 'about.html'));
  fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '');

  // ---- individual writeup pages ----
  for (const w of writeups) {
    const html = render('post-writeup.html', {
      TITLE: escapeHtml(w.title),
      EXCERPT: escapeHtml(w.excerpt),
      SLUG: w.slug,
      PLATFORM: escapeHtml(w.platform),
      DIFFICULTY_CLASS: w.difficulty,
      DIFFICULTY_LABEL: w.difficulty,
      DATE_DISPLAY: w.dateDisplay,
      TAGS_META: escapeHtml(w.tags.join(' · ')),
      CONTENT: w.html,
      BUILD_DATE: buildDate,
    });
    fs.writeFileSync(path.join(DIST_DIR, `${w.slug}.html`), html);
  }

  // ---- individual blog pages ----
  for (const p of blogPosts) {
    const html = render('post-blog.html', {
      TITLE: escapeHtml(p.title),
      EXCERPT: escapeHtml(p.excerpt),
      SLUG: p.slug,
      KICKER: escapeHtml(p.kicker),
      DATE_DISPLAY: p.dateDisplay,
      CONTENT: p.html,
      BUILD_DATE: buildDate,
    });
    fs.writeFileSync(path.join(DIST_DIR, `${p.slug}.html`), html);
  }

  // ---- writeups.html listing ----
  const allTags = [...new Set(writeups.flatMap(w => w.tags))].sort();
  const filterPills = allTags
    .map(t => `        <button class="filter-pill" data-filter="${escapeHtml(t)}">${escapeHtml(t)}</button>`)
    .join('\n');
  fs.writeFileSync(
    path.join(DIST_DIR, 'writeups.html'),
    render('writeups.html', {
      FILTER_PILLS: filterPills,
      WRITEUP_CARDS: writeups.map(writeupCard).join('\n'),
      BUILD_DATE: buildDate,
    })
  );

  // ---- blog.html listing ----
  fs.writeFileSync(
    path.join(DIST_DIR, 'blog.html'),
    render('blog.html', {
      BLOG_CARDS: blogPosts.map(blogCard).join('\n'),
      BUILD_DATE: buildDate,
    })
  );

  // ---- index.html ----
  fs.writeFileSync(
    path.join(DIST_DIR, 'index.html'),
    render('index.html', {
      LATEST_WRITEUPS: writeups.slice(0, 3).map(writeupCard).join('\n'),
      LATEST_BLOG: blogPosts.slice(0, 3).map(blogCard).join('\n'),
      BUILD_DATE: buildDate,
    })
  );

  console.log(`Built ${writeups.length} writeup(s) and ${blogPosts.length} blog post(s) into dist/`);
}

try {
  build();
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
