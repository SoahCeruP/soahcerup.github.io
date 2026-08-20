// ---------------------------------------------------------------
// nav toggle (mobile)
// ---------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  initTerminal();
  initFilters();
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
// tag filter bar on the writeups page
// ---------------------------------------------------------------
function initFilters() {
  const bar = document.querySelector('.filter-bar');
  const cards = document.querySelectorAll('[data-tags]');
  if (!bar || !cards.length) return;

  bar.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    bar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    const filter = pill.dataset.filter;
    cards.forEach(card => {
      const tags = card.dataset.tags.split(',');
      const show = filter === 'all' || tags.includes(filter);
      card.style.display = show ? '' : 'none';
    });
  });
}
