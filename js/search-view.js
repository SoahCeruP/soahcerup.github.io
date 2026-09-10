/**
 * search-view.js
 * Adds live search and grid/list view toggle to writeups and blog pages.
 *
 * Drop this file into js/ and add <script src="../js/search-view.js"></script>
 * (or <script src="js/search-view.js"></script> from dist/) to the writeups
 * and blog templates, just before </body>.
 *
 * Depends on the markup produced by the existing build templates:
 *   - Cards live inside a container with id="cards-container"
 *   - Each card has class="card" (or whatever class the template uses — see CARD_SELECTOR)
 *   - Searchable text is inside elements with data-search on the card, OR we
 *     fall back to reading the card's full textContent.
 *   - The existing tag-filter buttons stay untouched; search narrows the
 *     already-filtered set.
 */

(function () {
  'use strict';

  /* ─── tunables ─────────────────────────────────────────────────────────── */
  const CARD_SELECTOR   = '.card';          // selector for each post card
  const CONTAINER_ID    = 'cards-container'; // id of the cards wrapper
  const TOOLBAR_HOOK_ID = 'toolbar-hook';   // id of the element the toolbar is inserted before
  const LS_VIEW_KEY     = 'sv-view';        // localStorage key for preferred view
  /* ──────────────────────────────────────────────────────────────────────── */

  function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return; // not a listing page

    injectStyles();
    buildToolbar(container);
    applyStoredView(container);
    hookExistingFilter(container);
  }

  /* ── styles injected once ───────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('sv-styles')) return;
    const s = document.createElement('style');
    s.id = 'sv-styles';
    s.textContent = `
/* ── search + view toolbar ─────────────────────────── */
#sv-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0 1.25rem;
  flex-wrap: wrap;
}

#sv-search-wrap {
  position: relative;
  flex: 1 1 220px;
}

#sv-search {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-secondary, #1a0f2e);
  border: 1px solid var(--border, #4a2070);
  color: var(--text-primary, #e0d0ff);
  font-family: var(--font-mono, 'Courier New', monospace);
  font-size: 0.85rem;
  padding: 0.45rem 2.2rem 0.45rem 0.75rem;
  border-radius: 3px;
  outline: none;
  transition: border-color 0.15s;
}

#sv-search:focus {
  border-color: var(--accent, #9b59b6);
}

#sv-search::placeholder {
  color: var(--text-muted, #7a6a9a);
  font-style: italic;
}

#sv-search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted, #7a6a9a);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  display: none;
}

#sv-search-clear:hover { color: var(--accent, #9b59b6); }

#sv-count {
  font-family: var(--font-mono, 'Courier New', monospace);
  font-size: 0.78rem;
  color: var(--text-muted, #7a6a9a);
  white-space: nowrap;
}

#sv-view-btns {
  display: flex;
  gap: 0.35rem;
}

.sv-view-btn {
  background: var(--bg-secondary, #1a0f2e);
  border: 1px solid var(--border, #4a2070);
  color: var(--text-muted, #7a6a9a);
  border-radius: 3px;
  padding: 0.35rem 0.55rem;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}

.sv-view-btn:hover,
.sv-view-btn.active {
  border-color: var(--accent, #9b59b6);
  color: var(--accent, #9b59b6);
}

/* ── no-results message ─────────────────────────────── */
#sv-no-results {
  display: none;
  font-family: var(--font-mono, 'Courier New', monospace);
  font-size: 0.85rem;
  color: var(--text-muted, #7a6a9a);
  padding: 1.5rem 0;
}

/* ── grid view ──────────────────────────────────────── */
#cards-container.sv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

#cards-container.sv-grid .card {
  height: 100%;
  box-sizing: border-box;
}

/* ── list view ──────────────────────────────────────── */
#cards-container.sv-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

#cards-container.sv-list .card {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1rem;
}

#cards-container.sv-list .card-meta {
  flex-shrink: 0;
  min-width: 120px;
}

/* search highlight */
.sv-highlight {
  background: rgba(155, 89, 182, 0.28);
  border-radius: 2px;
  padding: 0 1px;
}
    `;
    document.head.appendChild(s);
  }

  /* ── toolbar DOM ────────────────────────────────────────────────────────── */
  function buildToolbar(container) {
    const toolbar = document.createElement('div');
    toolbar.id = 'sv-toolbar';

    /* search box */
    const wrap = document.createElement('div');
    wrap.id = 'sv-search-wrap';

    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'sv-search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'search titles, tags, excerpts…';
    input.setAttribute('aria-label', 'Search posts');

    const clearBtn = document.createElement('button');
    clearBtn.id = 'sv-search-clear';
    clearBtn.title = 'Clear search';
    clearBtn.textContent = '✕';

    wrap.appendChild(input);
    wrap.appendChild(clearBtn);

    /* count */
    const count = document.createElement('span');
    count.id = 'sv-count';

    /* view toggle */
    const viewBtns = document.createElement('div');
    viewBtns.id = 'sv-view-btns';
    viewBtns.setAttribute('role', 'group');
    viewBtns.setAttribute('aria-label', 'View mode');

    const gridBtn = document.createElement('button');
    gridBtn.className = 'sv-view-btn';
    gridBtn.dataset.view = 'grid';
    gridBtn.title = 'Grid view';
    gridBtn.setAttribute('aria-pressed', 'false');
    gridBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
        <rect x="0" y="0" width="6" height="6"/><rect x="8" y="0" width="6" height="6"/>
        <rect x="0" y="8" width="6" height="6"/><rect x="8" y="8" width="6" height="6"/>
      </svg>`;

    const listBtn = document.createElement('button');
    listBtn.className = 'sv-view-btn';
    listBtn.dataset.view = 'list';
    listBtn.title = 'List view';
    listBtn.setAttribute('aria-pressed', 'false');
    listBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
        <rect x="0" y="0" width="14" height="2.5"/><rect x="0" y="5.5" width="14" height="2.5"/>
        <rect x="0" y="11" width="14" height="2.5"/>
      </svg>`;

    viewBtns.appendChild(gridBtn);
    viewBtns.appendChild(listBtn);

    toolbar.appendChild(wrap);
    toolbar.appendChild(count);
    toolbar.appendChild(viewBtns);

    /* no-results message */
    const noResults = document.createElement('p');
    noResults.id = 'sv-no-results';
    noResults.textContent = 'no results — try a different query or clear the search.';

    /* insert toolbar before the cards container */
    container.parentNode.insertBefore(toolbar, container);
    container.parentNode.insertBefore(noResults, container);

    /* ── wire events ── */
    input.addEventListener('input', () => {
      clearBtn.style.display = input.value ? 'block' : 'none';
      filterCards(container, input.value);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      filterCards(container, '');
      input.focus();
    });

    [gridBtn, listBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        setView(container, btn.dataset.view);
      });
    });

    updateCount(container);
  }

  /* ── view switching ─────────────────────────────────────────────────────── */
  function setView(container, view) {
    container.classList.remove('sv-grid', 'sv-list');
    container.classList.add('sv-' + view);

    document.querySelectorAll('.sv-view-btn').forEach(b => {
      const active = b.dataset.view === view;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    try { localStorage.setItem(LS_VIEW_KEY, view); } catch (_) {}
  }

  function applyStoredView(container) {
    let view = 'grid'; // default
    try { view = localStorage.getItem(LS_VIEW_KEY) || 'grid'; } catch (_) {}
    setView(container, view);
  }

  /* ── search / filter ────────────────────────────────────────────────────── */
  function getCardText(card) {
    // collect all meaningful text: title, excerpt, tags, platform, difficulty
    return card.textContent.toLowerCase();
  }

  function filterCards(container, query) {
    const q = query.trim().toLowerCase();
    const cards = container.querySelectorAll(CARD_SELECTOR);
    let visible = 0;

    cards.forEach(card => {
      // respect whatever tag-filter is currently active
      if (card.dataset.svTagHidden === 'true') {
        card.style.display = 'none';
        return;
      }

      const match = !q || getCardText(card).includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;

      // highlight
      clearHighlights(card);
      if (q && match) highlightIn(card, q);
    });

    updateCount(container, visible, !!q);
    const noResults = document.getElementById('sv-no-results');
    if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
  }

  function updateCount(container, visibleOverride, isSearch) {
    const countEl = document.getElementById('sv-count');
    if (!countEl) return;

    const cards = container.querySelectorAll(CARD_SELECTOR);
    const total = cards.length;
    const visible = visibleOverride !== undefined
      ? visibleOverride
      : [...cards].filter(c => c.style.display !== 'none').length;

    if (isSearch && visibleOverride !== undefined) {
      countEl.textContent = `${visible} / ${total}`;
    } else {
      countEl.textContent = `${total} post${total !== 1 ? 's' : ''}`;
    }
  }

  /* ── text highlighting ──────────────────────────────────────────────────── */
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'A', 'BUTTON']);

  function highlightIn(root, query) {
    walkTextNodes(root, node => {
      const idx = node.nodeValue.toLowerCase().indexOf(query);
      if (idx === -1) return;

      const before = document.createTextNode(node.nodeValue.slice(0, idx));
      const mark   = document.createElement('mark');
      mark.className = 'sv-highlight';
      mark.textContent = node.nodeValue.slice(idx, idx + query.length);
      const after  = document.createTextNode(node.nodeValue.slice(idx + query.length));

      node.parentNode.replaceChild(after, node);
      node.parentNode.insertBefore(mark, after);
      node.parentNode.insertBefore(before, mark);
    });
  }

  function clearHighlights(root) {
    root.querySelectorAll('.sv-highlight').forEach(mark => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    root.normalize();
  }

  function walkTextNodes(node, fn) {
    if (node.nodeType === Node.TEXT_NODE) {
      fn(node);
      return;
    }
    if (SKIP_TAGS.has(node.nodeName)) return;
    // iterate over a static copy so replacements don't confuse the iterator
    [...node.childNodes].forEach(child => walkTextNodes(child, fn));
  }

  /* ── keep search in sync with existing tag filter ───────────────────────── */
  function hookExistingFilter(container) {
    // The existing filter buttons call something like filterWriteups() which
    // toggles card visibility. We wrap that so search stays in sync.
    // Strategy: observe mutations on cards' style attribute, then re-apply search.
    const q = () => {
      const input = document.getElementById('sv-search');
      return input ? input.value : '';
    };

    // After a tag filter change, cards that are hidden get display:none.
    // We tag them so our search doesn't accidentally re-show them.
    const observer = new MutationObserver(() => {
      const cards = container.querySelectorAll(CARD_SELECTOR);
      cards.forEach(card => {
        // If hidden by the tag filter (no sv-search involvement), mark it
        // We detect this by checking if OUR search would have shown it
        const query = q().trim().toLowerCase();
        const matchesSearch = !query || getCardText(card).includes(query);
        if (card.style.display === 'none' && matchesSearch) {
          card.dataset.svTagHidden = 'true';
        } else if (card.style.display !== 'none') {
          card.dataset.svTagHidden = 'false';
        }
      });
      // Now re-apply our search on top
      filterCards(container, q());
    });

    observer.observe(container, {
      subtree: true,
      attributeFilter: ['style'],
      attributes: true,
    });
  }

  /* ── boot ────────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
