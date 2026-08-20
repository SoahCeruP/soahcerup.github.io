/* =============================================================
   soahcerup@notes — interactive terminal engine
   Replaces the static hero. Every page uses this same file.
   ============================================================= */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Site data — mirrors what the build script knows.
     In a real build you could inject these via a JSON file;
     here they live as JS so no server is needed.
  ---------------------------------------------------------- */
  const SITE = {
    user: 'soahcerup',
    host: 'notes',

    writeups: [
      {
        slug: 'active',
        title: 'Active',
        platform: 'HackTheBox',
        difficulty: 'easy',
        date: '2025-06-10',
        tags: ['active-directory', 'kerberoasting', 'smb'],
        excerpt: 'Classic AD box — GPP password decryption to foothold, then Kerberoasting the Administrator.',
      },
      {
        slug: 'forest',
        title: 'Forest',
        platform: 'HackTheBox',
        difficulty: 'easy',
        date: '2025-05-28',
        tags: ['active-directory', 'asrep-roasting', 'dcsync'],
        excerpt: 'AS-REP Roasting a service account, then abusing WriteDACL to dump the NTDS.',
      },
      {
        slug: 'return',
        title: 'Return',
        platform: 'HackTheBox',
        difficulty: 'easy',
        date: '2025-05-14',
        tags: ['windows', 'printer-exploit', 'sebackup'],
        excerpt: 'Printer service credential capture → Server Operators group → SeBackupPrivilege escalation.',
      },
      {
        slug: 'monteverde',
        title: 'Monteverde',
        platform: 'HackTheBox',
        difficulty: 'medium',
        date: '2025-04-30',
        tags: ['active-directory', 'azure-ad', 'password-spray'],
        excerpt: 'Password spraying with usernames, Azure AD Connect MSSQL credential extraction.',
      },
      {
        slug: 'cascade',
        title: 'Cascade',
        platform: 'HackTheBox',
        difficulty: 'medium',
        date: '2025-04-12',
        tags: ['active-directory', 'ldap', 'dotnet-reversing'],
        excerpt: 'LDAP enumeration → custom .NET crypto reversing → deleted AD object recovery.',
      },
    ],

    blog: [
      {
        slug: 'ad-mindmap-2025',
        title: 'My Active Directory attack mindmap (2025 edition)',
        kicker: 'methodology',
        date: '2025-06-15',
        excerpt: 'A living cheatsheet of every AD vector I keep reaching for in CTFs and labs.',
      },
      {
        slug: 'bloodhound-custom-queries',
        title: 'BloodHound custom Cypher queries that actually matter',
        kicker: 'tooling',
        date: '2025-05-20',
        excerpt: 'Beyond the defaults — Cypher queries for finding constrained delegation, shadow admins, and GPO abuse paths.',
      },
      {
        slug: 'why-i-write-writeups',
        title: 'Why I write writeups even for easy machines',
        kicker: 'meta',
        date: '2025-04-05',
        excerpt: 'Teaching is the fastest way to find gaps in your own understanding.',
      },
    ],

    about: {
      handle: 'soahcerup',
      bio: 'Security researcher and CTF player. I break things on HackTheBox and TryHackMe, then write up every step so the next person doesn\'t have to guess.',
      status: 'Currently grinding Active Directory chains on HTB Pro Labs.',
      skills: [
        ['Active Directory', 'advanced'],
        ['Linux privesc', 'advanced'],
        ['Windows privesc', 'intermediate'],
        ['Web application testing', 'intermediate'],
        ['Malware analysis', 'beginner'],
        ['Reverse engineering', 'beginner'],
      ],
      links: {
        github: 'https://github.com/Soahcerup',
        discord: 'https://discord.com/users/s0ahcerup',
        email: 'mailto:mmts.cool@gmail.com',
      },
    },
  };

  /* ----------------------------------------------------------
     Filesystem tree the terminal navigates
  ---------------------------------------------------------- */
  const FS = {
    '~': {
      type: 'dir',
      children: ['writeups/', 'blog/', 'about.md', 'status.txt'],
    },
    '~/writeups': {
      type: 'dir',
      children: SITE.writeups.map(w => w.slug + '.md'),
    },
    '~/blog': {
      type: 'dir',
      children: SITE.blog.map(p => p.slug + '.md'),
    },
  };

  /* ----------------------------------------------------------
     Colour / markup helpers
  ---------------------------------------------------------- */
  const c = {
    prompt: (cwd) => {
      const display = cwd === '~' ? '~' : cwd.replace('~/', '');
      return `<span class="p">${SITE.user}@${SITE.host}:<span class="cwd">${display}</span>$</span>`;
    },
    cmd: s => `<span class="out">${esc(s)}</span>`,
    dir: s => `<span class="t-dir">${esc(s)}</span>`,
    file: s => `<span class="t-file">${esc(s)}</span>`,
    link: (href, label) => `<a href="${href}" class="t-link">${esc(label)}</a>`,
    muted: s => `<span class="t-muted">${esc(s)}</span>`,
    comment: s => `<span class="comment">${esc(s)}</span>`,
    err: s => `<span class="t-err">${esc(s)}</span>`,
    ok: s => `<span class="t-ok">${esc(s)}</span>`,
    badge: (diff) => `<span class="badge ${diff}">${diff}</span>`,
    key: s => `<span class="t-key">${esc(s)}</span>`,
    val: s => `<span class="t-val">${esc(s)}</span>`,
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* ----------------------------------------------------------
     Command implementations
     Each returns an array of HTML strings (one per output line).
  ---------------------------------------------------------- */
  const COMMANDS = {

    help(args, state) {
      return [
        c.comment('# available commands'),
        '',
        [c.key('ls') + '                  ', 'list directory contents'].join(' '),
        [c.key('cd') + ' <dir>            ', 'change directory'].join(' '),
        [c.key('cat') + ' <file>          ', 'print file contents'].join(' '),
        [c.key('open') + ' <file>         ', 'open writeup / blog post page'].join(' '),
        [c.key('pwd')  + '                ', 'print working directory'].join(' '),
        [c.key('whoami') + '              ', 'who am i'].join(' '),
        [c.key('clear') + '              ', 'clear the terminal'].join(' '),
        [c.key('history') + '            ', 'show command history'].join(' '),
        '',
        c.muted('tip: tab completes filenames · ↑↓ navigate history'),
      ];
    },

    whoami(args, state) {
      return [
        c.val(SITE.about.handle),
        c.muted(SITE.about.bio),
      ];
    },

    pwd(args, state) {
      return [c.val('/home/' + SITE.user + '/' + state.cwd.replace('~', ''))];
    },

    clear(args, state) {
      state._clear = true;
      return [];
    },

    history(args, state) {
      if (!state.history.length) return [c.muted('(empty)')];
      return state.history.map((cmd, i) =>
        `  ${c.muted(String(i + 1).padStart(3, ' '))}  ${c.cmd(cmd)}`
      );
    },

    ls(args, state) {
      const target = args[0] ? resolvePath(args[0], state.cwd) : state.cwd;
      const node = FS[target];

      if (!node) return [c.err(`ls: cannot access '${args[0]}': no such file or directory`)];

      if (target === '~') {
        return [
          c.dir('writeups/') + '   ' + c.dir('blog/') + '   ' + c.file('about.md') + '   ' + c.file('status.txt'),
        ];
      }

      if (target === '~/writeups') {
        const lines = [c.comment('# ' + SITE.writeups.length + ' writeups')];
        SITE.writeups.forEach(w => {
          lines.push(
            c.file(w.slug + '.md') +
            '  ' + c.badge(w.difficulty) +
            '  ' + c.muted(fmtDate(w.date)) +
            '  ' + c.val(w.title)
          );
        });
        return lines;
      }

      if (target === '~/blog') {
        const lines = [c.comment('# ' + SITE.blog.length + ' posts')];
        SITE.blog.forEach(p => {
          lines.push(
            c.file(p.slug + '.md') +
            '  ' + c.muted(fmtDate(p.date)) +
            '  ' + c.val(p.title)
          );
        });
        return lines;
      }

      return [c.err('ls: nothing here')];
    },

    cd(args, state) {
      if (!args[0] || args[0] === '~') {
        state.cwd = '~';
        return [];
      }
      const target = resolvePath(args[0], state.cwd);
      if (!FS[target]) return [c.err(`cd: no such file or directory: ${args[0]}`)];
      if (FS[target].type !== 'dir') return [c.err(`cd: not a directory: ${args[0]}`)];
      state.cwd = target;
      return [];
    },

    cat(args, state) {
      if (!args[0]) return [c.err('cat: missing operand')];

      const filename = args[0].replace(/\.md$/, '');

      if (args[0] === 'status.txt' || args[0] === '~/status.txt') {
        return [
          c.comment('# status.txt'),
          c.val(SITE.about.status),
        ];
      }

      if (args[0] === 'about.md' || args[0] === '~/about.md') {
        return renderAbout();
      }

      const writeup = SITE.writeups.find(w => w.slug === filename);
      if (writeup) return renderWriteup(writeup);

      const post = SITE.blog.find(p => p.slug === filename);
      if (post) return renderBlogPost(post);

      return [c.err(`cat: ${args[0]}: no such file`)];
    },

    open(args, state) {
      if (!args[0]) return [c.err('open: missing operand')];
      const filename = args[0].replace(/\.md$/, '');

      const writeup = SITE.writeups.find(w => w.slug === filename);
      if (writeup) {
        setTimeout(() => { window.location.href = writeup.slug + '.html'; }, 300);
        return [c.ok('→ opening ' + writeup.title + '…')];
      }

      const post = SITE.blog.find(p => p.slug === filename);
      if (post) {
        setTimeout(() => { window.location.href = post.slug + '.html'; }, 300);
        return [c.ok('→ opening ' + post.title + '…')];
      }

      if (filename === 'about' || args[0] === 'about.md') {
        setTimeout(() => { window.location.href = 'about.html'; }, 300);
        return [c.ok('→ opening about.html…')];
      }

      return [c.err(`open: ${args[0]}: not found`)];
    },
  };

  /* ----------------------------------------------------------
     Renderers for cat output
  ---------------------------------------------------------- */
  function renderWriteup(w) {
    const tags = w.tags.map(t => c.muted('#' + t)).join('  ');
    return [
      '─'.repeat(56),
      c.val('  ' + w.title),
      '',
      `  ${c.key('platform')}    ${c.val(w.platform)}`,
      `  ${c.key('difficulty')}  ${c.badge(w.difficulty)}`,
      `  ${c.key('date')}        ${c.muted(fmtDate(w.date))}`,
      `  ${c.key('tags')}        ${tags}`,
      '',
      '─'.repeat(56),
      '',
      '  ' + c.muted(w.excerpt),
      '',
      '  ' + c.muted('read the full writeup →  ') + c.link(w.slug + '.html', w.slug + '.html'),
      '  ' + c.muted('  or type: ') + c.cmd('open ' + w.slug),
      '',
      '─'.repeat(56),
    ];
  }

  function renderBlogPost(p) {
    return [
      '─'.repeat(56),
      c.val('  ' + p.title),
      '',
      `  ${c.key('kicker')}  ${c.val(p.kicker)}`,
      `  ${c.key('date')}    ${c.muted(fmtDate(p.date))}`,
      '',
      '─'.repeat(56),
      '',
      '  ' + c.muted(p.excerpt),
      '',
      '  ' + c.muted('read the full post →  ') + c.link(p.slug + '.html', p.slug + '.html'),
      '  ' + c.muted('  or type: ') + c.cmd('open ' + p.slug),
      '',
      '─'.repeat(56),
    ];
  }

  function renderAbout() {
    const a = SITE.about;
    const skills = a.skills.map(([name, level]) =>
      `  ${c.key(name.padEnd(24))} ${c.val(level)}`
    );
    return [
      '─'.repeat(56),
      c.val('  about.md — ' + a.handle),
      '─'.repeat(56),
      '',
      '  ' + c.muted(a.bio),
      '',
      `  ${c.key('status')}  ${c.val(a.status)}`,
      '',
      c.comment('  # skills'),
      ...skills,
      '',
      c.comment('  # links'),
      `  ${c.key('github')}   ${c.link(a.links.github, a.links.github)}`,
      `  ${c.key('discord')}  ${c.link(a.links.discord, a.links.discord)}`,
      `  ${c.key('email')}    ${c.link(a.links.email, a.links.email.replace('mailto:', ''))}`,
      '',
      '─'.repeat(56),
    ];
  }

  /* ----------------------------------------------------------
     Path resolution
  ---------------------------------------------------------- */
  function resolvePath(input, cwd) {
    if (input.startsWith('~/') || input === '~') return input === '~' ? '~' : input;
    if (input === '..') {
      if (cwd === '~') return '~';
      return '~';
    }
    if (input === '.') return cwd;
    if (input.endsWith('/')) input = input.slice(0, -1);
    return cwd + '/' + input;
  }

  /* ----------------------------------------------------------
     Tab completion
  ---------------------------------------------------------- */
  function getCompletions(partial, state) {
    const parts = partial.trimStart().split(' ');
    if (parts.length <= 1) {
      const cmds = Object.keys(COMMANDS);
      return cmds.filter(c => c.startsWith(partial.trim())).map(c => c + ' ');
    }

    const cmd = parts[0];
    const arg = parts[parts.length - 1];

    const node = FS[state.cwd];
    const children = node ? node.children : [];
    const allFiles = [
      ...SITE.writeups.map(w => w.slug + '.md'),
      ...SITE.blog.map(p => p.slug + '.md'),
      'about.md', 'status.txt', 'writeups/', 'blog/',
    ];

    const pool = (state.cwd === '~') ? children : allFiles;
    const matches = pool.filter(f => f.startsWith(arg));
    return matches.map(m => parts.slice(0, -1).join(' ') + ' ' + m);
  }

  /* ----------------------------------------------------------
     Terminal DOM class
  ---------------------------------------------------------- */
  class Terminal {
    constructor(el) {
      this.el = el;
      this.outputEl = el.querySelector('.t-output');
      this.inputEl = el.querySelector('.t-input');
      this.cwdEl = el.querySelector('.t-cwd');
      this.promptEl = el.querySelector('.t-prompt-line');

      this.state = {
        cwd: '~',
        history: [],
        historyIdx: -1,
        _clear: false,
      };

      this.tabState = { partial: null, options: [], idx: 0 };

      this._bindKeys();
      this._printWelcome();
      this.inputEl.focus();
    }

    _updatePrompt() {
      if (!this.cwdEl) return;
      const display = this.state.cwd === '~' ? '~' : this.state.cwd.replace('~/', '');
      this.cwdEl.textContent = display;
    }

    _bindKeys() {
      this.el.addEventListener('click', () => this.inputEl.focus());

      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._run(this.inputEl.value);
          this.inputEl.value = '';
          this.tabState = { partial: null, options: [], idx: 0 };
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          this._handleTab();
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const h = this.state.history;
          if (!h.length) return;
          if (this.state.historyIdx === -1) this.state.historyIdx = h.length - 1;
          else if (this.state.historyIdx > 0) this.state.historyIdx--;
          this.inputEl.value = h[this.state.historyIdx];
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const h = this.state.history;
          if (this.state.historyIdx === -1) return;
          if (this.state.historyIdx < h.length - 1) {
            this.state.historyIdx++;
            this.inputEl.value = h[this.state.historyIdx];
          } else {
            this.state.historyIdx = -1;
            this.inputEl.value = '';
          }
          return;
        }

        if (e.key === 'l' && e.ctrlKey) {
          e.preventDefault();
          this._clearOutput();
          return;
        }

        this.tabState = { partial: null, options: [], idx: 0 };
        this.state.historyIdx = -1;
      });
    }

    _handleTab() {
      const val = this.inputEl.value;
      if (this.tabState.partial === null) {
        this.tabState.partial = val;
        this.tabState.options = getCompletions(val, this.state);
        this.tabState.idx = 0;
      }

      const opts = this.tabState.options;
      if (!opts.length) return;

      if (opts.length === 1) {
        this.inputEl.value = opts[0];
        this.tabState = { partial: null, options: [], idx: 0 };
        return;
      }

      this.inputEl.value = opts[this.tabState.idx % opts.length];
      this.tabState.idx++;
    }

    _run(raw) {
      const input = raw.trim();

      this._appendPromptLine(input);

      if (!input) return;

      this.state.history.push(input);
      this.state.historyIdx = -1;

      const parts = input.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      const fn = COMMANDS[cmd];
      if (!fn) {
        this._appendLines([
          c.err(`${cmd}: command not found — try 'help'`),
        ]);
        this._scroll();
        return;
      }

      this.state._clear = false;
      const output = fn(args, this.state);

      if (this.state._clear) {
        this._clearOutput();
        return;
      }

      this._appendLines(output);
      this._updatePrompt();
      this._scroll();
    }

    _appendPromptLine(input) {
      const display = this.state.cwd === '~' ? '~' : this.state.cwd.replace('~/', '');
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.innerHTML =
        `<span class="p">${esc(SITE.user)}@${esc(SITE.host)}:<span class="cwd">${esc(display)}</span>$</span> ` +
        `<span class="out">${esc(input)}</span>`;
      this.outputEl.appendChild(line);
    }

    _appendLines(lines) {
      lines.forEach(html => {
        if (html === '') {
          const blank = document.createElement('div');
          blank.className = 'terminal-line';
          blank.innerHTML = '&nbsp;';
          this.outputEl.appendChild(blank);
          return;
        }
        const div = document.createElement('div');
        div.className = 'terminal-line';
        div.innerHTML = html;
        this.outputEl.appendChild(div);
      });
    }

    _clearOutput() {
      this.outputEl.innerHTML = '';
    }

    _scroll() {
      this.el.scrollTop = this.el.scrollHeight;
    }

    _printWelcome() {
      const lines = [
        c.comment('# soahcerup@notes — interactive terminal'),
        c.comment('# type \'help\' to see available commands'),
        '',
        `${c.key('whoami')}   ${c.val('security researcher · ctf player · writes it all down')}`,
        `${c.key('status')}   ${c.muted(SITE.about.status)}`,
        '',
        c.muted('quick start:') + '  ' + c.cmd('ls') + '  →  ' + c.cmd('ls writeups/') + '  →  ' + c.cmd('cat active.md'),
        '',
      ];
      this._appendLines(lines);
      this._updatePrompt();
    }
  }

  /* ----------------------------------------------------------
     Boot — only init on pages that have a #live-terminal
  ---------------------------------------------------------- */
  function boot() {
    const el = document.getElementById('live-terminal');
    if (el) {
      new Terminal(el);
    }

    // legacy static terminal typing on other pages (about, posts)
    const staticBody = document.getElementById('terminal-body');
    if (staticBody && !el) {
      initStaticTyping(staticBody);
    }

    // mobile nav
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
      toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    }

    // tag filter bar
    initFilters();
  }

  function initStaticTyping(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.querySelectorAll('[data-type]').forEach(l => (l.style.opacity = '1'));
      return;
    }
    const lines = Array.from(el.querySelectorAll('[data-type]'));
    lines.forEach(l => (l.style.opacity = '0'));
    let i = 0;
    const next = () => {
      if (i >= lines.length) return;
      const line = lines[i];
      line.style.opacity = '1';
      const text = line.querySelector('.typed-text');
      if (text) {
        const full = text.textContent;
        text.textContent = '';
        let c = 0;
        const t = setInterval(() => {
          text.textContent = full.slice(0, c++);
          if (c > full.length) { clearInterval(t); i++; setTimeout(next, 220); }
        }, 18);
      } else { i++; setTimeout(next, 260); }
    };
    next();
  }

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
        card.style.display = (filter === 'all' || tags.includes(filter)) ? '' : 'none';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
