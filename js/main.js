// ---------------------------------------------------------------
// nav toggle (mobile) & initialization
// ---------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  initTerminal();
  initFilters();
  initViewSwitcher();
});

// ---------------------------------------------------------------
// hero terminal typing sequence
// each "line" types out, then the next appears. Nav links (in
// the final line) are real <a> tags present in the DOM from the
// start, just visually revealed with the typed text.
// ---------------------------------------------------------------
function initTerminal() {
  const el = document.getElementById('terminal-body');
  if (!el) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = Array.from(el.querySelectorAll('[data-type]'));

  if (reduceMotion) {
    lines.forEach(l => (l.style.opacity = '1'));
    return;
  }

  lines.forEach(l => (l.style.opacity = '0'));

  let i = 0;
  const revealNext = () => {
    if (i >= lines.length) return;
    const line = lines[i];
    line.style.opacity = '1';
    const text = line.querySelector('.typed-text');
    if (text) {
      const full = text.textContent;
      text.textContent = '';
      let c = 0;
      const speed = 18;
      const typer = setInterval(() => {
        text.textContent = full.slice(0, c);
        c++;
        if (c > full.length) {
          clearInterval(typer);
          i++;
          setTimeout(revealNext, 220);
        }
      }, speed);
    } else {
      i++;
      setTimeout(revealNext, 260);
    }
  };
  revealNext();
}

// ---------------------------------------------------------------
// combined search bar & tag filter on the writeups/blog page
// ---------------------------------------------------------------
function initFilters() {
  const bar = document.querySelector('.filter-bar');
  const cards = document.querySelectorAll('[data-tags]');
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');

  if (!cards.length) return;

  let activeFilter = 'all';
  let activeSearchQuery = '';

  // Combined logic for search input and filter pills
  const applyFilters = () => {
    cards.forEach(card => {
      const tags = card.dataset.tags ? card.dataset.tags.split(',') : [];
      const matchesFilter = activeFilter === 'all' || tags.includes(activeFilter);

      const cardText = card.textContent.toLowerCase();
      const matchesSearch = activeSearchQuery === '' || cardText.includes(activeSearchQuery);

      card.style.display = matchesFilter && matchesSearch ? '' : 'none';
    });
  };

  // Filter Pills Click Event
  if (bar) {
    bar.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;

      bar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      activeFilter = pill.dataset.filter;
      applyFilters();
    });
  }

  // Search Input Handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeSearchQuery = e.target.value.toLowerCase().trim();
      if (clearBtn) {
        clearBtn.hidden = activeSearchQuery === '';
      }
      applyFilters();
    });
  }

  // Clear Search Button Handler
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        activeSearchQuery = '';
        clearBtn.hidden = true;
        applyFilters();
        searchInput.focus();
      }
    });
  }
}

// ---------------------------------------------------------------
// grid vs. list view switcher
// ---------------------------------------------------------------
function initViewSwitcher() {
  const gridBtn = document.getElementById('grid-view-btn');
  const listBtn = document.getElementById('list-view-btn');
  const container = document.getElementById('posts-container') || document.querySelector('.grid');

  if (!container || (!gridBtn && !listBtn)) return;

  const setView = (view) => {
    if (view === 'list') {
      container.classList.remove('grid');
      container.classList.add('list-view');
      listBtn?.classList.add('active');
      gridBtn?.classList.remove('active');
      localStorage.setItem('preferred-view', 'list');
    } else {
      container.classList.remove('list-view');
      container.classList.add('grid');
      gridBtn?.classList.add('active');
      listBtn?.classList.remove('active');
      localStorage.setItem('preferred-view', 'grid');
    }
  };

  // Load saved preference or default to grid
  const savedView = localStorage.getItem('preferred-view') || 'grid';
  setView(savedView);

  gridBtn?.addEventListener('click', () => setView('grid'));
  listBtn?.addEventListener('click', () => setView('list'));
}
