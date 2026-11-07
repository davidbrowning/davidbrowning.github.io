// learn-bash: a browser port of the learn-bash terminal game.
// engine.js = fake filesystem, shell, commands, tmux and a tiny vim.
'use strict';

const USER = 'agent', HOST = 'bearclaw', IP = '127.0.1.1';
const HOME = '/home/' + USER, M = HOME + '/mission/mission';
const SAVE_KEY = 'learn-bash.v1', FS_VERSION = 3;

// ---------- small helpers ----------
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const stripTags = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
class FSErr extends Error {}
class AbortErr extends Error {}
const basename = p => p.split('/').filter(Boolean).pop() || '/';
const dirname = p => { const a = p.split('/').filter(Boolean); a.pop(); return '/' + a.join('/'); };
const globRe = (pat, i) => new RegExp('^' + pat.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', i ? 'i' : '');
const now = () => Date.now();
const D = (o = USER) => ({ t: 'd', c: {}, o, m: now() });
const F = (d = '', o = USER, x = false) => ({ t: 'f', d, o, x, m: now() });

// fold -s: wrap at spaces, hard-break long words
function fold(text, w) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      if ((line + word).length <= w) { line += word; continue; }
      if (line.trim()) out.push(line.replace(/\s+$/, ''));
      line = /^\s+$/.test(word) ? '' : word;
      while (line.length > w) { out.push(line.slice(0, w)); line = line.slice(w); }
    }
    out.push(line.replace(/\s+$/, ''));
  }
  return out;
}

// the game's message() box: +----+, text centered inside | |
function box(text, cols) {
  const w = Math.max(28, Math.min(80, cols - 2));
  const bar = '+' + '-'.repeat(w) + '+';
  const rows = fold(String(text).replace(/\\n/g, ' ').trim(), w - 4).map(l => {
    const s = Math.floor((w - l.length) / 2);
    return '|' + ' '.repeat(s) + l + ' '.repeat(Math.max(0, w - s - l.length)) + '|';
  });
  return [bar, ...rows, bar].join('\n') + '\n';
}

// ---------- filesystem ----------
const FS = {
  root: null,
  norm(p, cwd) {
    if (p == null || p === '') p = '.';
    if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
    if (!p.startsWith('/')) p = cwd + '/' + p;
    const out = [];
    for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); }
    return '/' + out.join('/');
  },
  res(abs, follow = true, depth = 0) {
    if (depth > 16) throw new FSErr('Too many levels of symbolic links');
    let node = FS.root, real = '';
    const parts = abs.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      if (node.t !== 'd') throw new FSErr('Not a directory');
      if (node.lock) throw new FSErr('Permission denied');
      let ch = node.c[parts[i]];
      if (!ch) return null;
      let r = real + '/' + parts[i];
      if (ch.t === 'l' && (follow || i < parts.length - 1)) {
        const t = FS.res(FS.norm(ch.to, real || '/'), true, depth + 1);
        if (!t) return null;
        ch = t.node; r = t.real;
      }
      node = ch; real = r;
    }
    return { node, real: real || '/' };
  },
  get(abs, follow = true) { const r = FS.res(abs, follow); return r && r.node; },
  parent(abs, sys) {
    const d = FS.get(dirname(abs));
    if (!d) throw new FSErr('No such file or directory');
    if (d.t !== 'd') throw new FSErr('Not a directory');
    if (!sys && (d.lock || d.o !== USER)) throw new FSErr('Permission denied');
    return d;
  },
  put(abs, node, sys) { FS.parent(abs, sys).c[basename(abs)] = node; return node; },
  del(abs, sys) { delete FS.parent(abs, sys).c[basename(abs)]; },
  mkp(abs, o) { let n = FS.root; for (const p of abs.split('/').filter(Boolean)) { if (!n.c[p]) n.c[p] = D(o); n = n.c[p]; } return n; },
  text(n) { return n.d != null && !n.pic && !n.gf ? n.d : n.pic ? PICS[n.pic] : n.gf ? GAME_FILES[n.gf] : (n.d || ''); },
  write(abs, data, append, sys) {
    let n = FS.get(abs);
    if (n && n.t === 'd') throw new FSErr('Is a directory');
    if (n && !sys && n.o !== USER) throw new FSErr('Permission denied');
    if (!n) n = FS.put(abs, F(), sys);
    n.d = (append ? FS.text(n) : '') + data;
    delete n.pic; delete n.gf; delete n.src; delete n.url; n.m = now();
  },
  async read(n, name) {
    if (n.src) {
      if (n.cache == null) {
        try { const r = await fetch(n.src); n.cache = r.ok ? (await r.text()).replace(/\n?$/, '\n') : ''; }
        catch { n.cache = '(the file is stuck on the server. are you offline?)\n'; }
      }
      return n.cache;
    }
    if (n.url) return `this is a web page, not a text file.\ntry: open ${name || 'it'}\n`;
    return FS.text(n);
  },
  size(n) { return n.t === 'd' ? 4096 : n.t === 'l' ? n.to.length : n.src ? 2048 : n.url ? 512 : FS.text(n).length; },
};
const clone = n => JSON.parse(JSON.stringify(n, (k, v) => k === 'cache' ? undefined : v));

// ---------- the machine ----------
function seed() {
  FS.root = D('root');
  for (const d of ['bin', 'etc', 'tmp', 'usr/bin', 'usr/local/bin', 'usr/local/share', 'usr/games', 'var/log']) FS.mkp('/' + d, 'root');
  FS.root.c.tmp.o = USER;
  const sys = (p, d) => { FS.mkp(dirname(p), 'root'); FS.put(p, F(d, 'root'), true); };
  sys('/etc/hostname', HOST + '\n');
  sys('/etc/hosts', `127.0.0.1\tlocalhost\n${IP}\t${HOST}\n185.199.108.153\tdavidbrowning.github.io dave\n`);
  sys('/etc/motd', 'Welcome to bearclaw.\n');
  for (const c of Object.keys(CMDS)) if (!BUILTINS.has(c)) FS.put('/usr/bin/' + c, { ...F('\x7fELF... (machine code. try: man ' + c + ')\n', 'root', true) }, true);
  for (const f of ['defaults.vim', 'vimrc', 'syntax/syntax.vim', 'syntax/sh.vim', 'syntax/c.vim', 'syntax/python.vim', 'syntax/markdown.vim',
    'colors/default.vim', 'colors/desert.vim', 'colors/elflord.vim', 'doc/help.txt', 'doc/usr_01.txt', 'doc/usr_02.txt', 'doc/vimtutor.txt',
    'ftplugin/sh.vim', 'ftplugin/c.vim', 'indent/sh.vim', 'plugin/netrwPlugin.vim', 'autoload/netrw.vim', 'tutor/tutor', 'tutor/tutor.es', 'tutor/tutor.fr'])
    sys('/usr/share/vim/vim91/' + f, '" vim runtime file\n');
  sys('/etc/vim/vimrc', '" system vimrc\n');
  sys('/usr/share/man/man1/vim.1.gz', '');
  sys('/usr/share/applications/vim.desktop', '');
  sys('/usr/games/README', 'the classic BSD games: https://github.com/vattam/BSDGames\ndave\'s games live in /home/dave/games\n');

  // dave's home: easter eggs that open other parts of the site
  FS.mkp('/home/dave', 'dave');
  const web = (p, url) => { FS.mkp(dirname(p), 'dave'); FS.put(p, { t: 'f', url, o: 'dave', m: now() }, true); };
  FS.put('/home/dave/readme.txt', F(`As you may have guessed, there's nothing real about this shell.
It's a tribute to Torvalds and the GNU community.

Many of the files in my home directory refer to real projects.
"open filename.ext" will bring you to the ones I like best.
`, 'dave'), true);
  FS.put('/home/dave/.plan', F('plan: teach my kids the shell. then teach everyone else.\nthings I learned along the way: open /home/dave/tools/til.html\n', 'dave'), true);
  web('/home/dave/resume.html', 'portfolio/index.html');
  web('/home/dave/resume.pdf', 'resume_for_site.pdf');
  web('/home/dave/programmer.html', 'gears/index.html');
  web('/home/dave/davesh.html', 'davesh.html');
  web('/home/dave/games/marbles.html', 'html/marbles/parts/1.html');
  web('/home/dave/games/breakout.html', 'html/breakout.html');
  web('/home/dave/games/conway.html', 'sandbox/index.html');
  web('/home/dave/games/gameloop.html', 'html/gameloop.html');
  web('/home/dave/games/simon.java', 'https://www.youtube.com/watch?v=kYVj_BY9k5M');
  web('/home/dave/tools/recipes.html', 'recipes/index.html');
  web('/home/dave/tools/vim.html', 'vim.html');
  web('/home/dave/tools/k8s-notes.html', 'k8s/index.html');
  web('/home/dave/tools/til.html', 'html/til.html');
  web('/home/dave/tools/sardine-cams.html', 'All_udot_sardine_cams.html');
  web('/home/dave/tools/encouragement.html', 'html/encouragement.html');
  web('/home/dave/tools/oscilloscope.rs', 'https://github.com/davidbrowning/oscilloscope');

  // franz: locked, but locate can still see what's inside
  FS.mkp('/home/franz', 'franz').lock = true;
  FS.root.c.home.c.franz.c['plans.txt'] = F('step 1: hide\nstep 2: ???\nstep 3: steal the computer\n', 'franz');
  FS.mkp('/usr/local/franz/bin', 'franz');
  FS.put('/usr/local/franz/bin/bomb.sh', F('#!/bin/bash\necho "muahahaha"\n', 'franz', true), true);

  // the agent's home
  FS.mkp(HOME, USER);
  FS.put(HOME + '/.bashrc', F(`# ~/.bashrc
alias ll='ls -la'
alias dad=~/.dad.sh
alias mission=~/.mission.sh
alias start=~/.start.sh
`));
  FS.put(HOME + '/.dads-note', F('You found a hidden file! Dad hides things in files that start with a dot.\nDave has one too: cat /home/dave/.plan\n'));
  FS.mkp(HOME + '/recipes-json', USER);
  for (const r of RECIPES) FS.put(HOME + '/recipes-json/' + r, { t: 'f', src: 'recipes/json/' + r, o: USER, m: now() });

  const base = HOME + '/mission';
  FS.mkp(base + '/00-type-the-word/pics', USER);
  for (const p of Object.keys(PICS)) FS.put(base + '/00-type-the-word/pics/' + p, { t: 'f', pic: p, o: USER, m: now() });
  FS.mkp(base + '/then-press-enter', USER);
  FS.put(base + '/then-press-enter/bashcrawl.tgz', F('(bashcrawl lives here. mission 06 is still being ported.)\n'));
  for (let i = 1; i <= 10; i++) FS.mkp(M + '/' + String(i).padStart(2, '0'), USER);
  FS.put(M + '/cd-to-01-then-type-start', F());
  FS.put(M + '/01/bob', { t: 'f', gf: 'bob', o: USER, m: now() });
  FS.put(M + '/01/carpet', { t: 'f', gf: 'carpet', o: USER, m: now() });
  FS.put(M + '/01/type-start-then-press-enter', F());
  FS.put(M + '/02/dude-wheres-my-carpet', F());
  FS.put(M + '/02/type-start-then-enter-to-start-a-mission', F());
  FS.put(M + '/04/light-status.sh', { t: 'f', gf: 'light-status.sh', prog: 'light', x: true, o: USER, m: now() });
  for (let i = 0; i < 9; i++) for (const s of ['closet', 'cupboard', 'rug', 'drawers'])
    FS.mkp(`${M}/04/hallway/door${i}/${s}`, USER).c.button = F('OFF\n');
  // easter egg: the original game's sourdough recipe, moved up to mission 04
  FS.put(M + '/04/hallway/door7/rug/note', F(`A sticky note, stuck to the bottom of the rug:

  "sourdough is in the oven. recipe is in ~/recipes-json
   try:  cat ~/recipes-json/Sourdoughbread.json | jq .ingredients
   the whole cookbook:  open /home/dave/tools/recipes.html   -mom"
`));
  FS.mkp(M + '/04/door', USER).lock = true;
  FS.put(M + '/05/prisoner', { t: 'f', gf: 'prisoner', o: USER, m: now() });
}

// ---------- persistence ----------
const State = {
  done: new Set(), hist: [],
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (s && s.v === FS_VERSION && s.fs) { FS.root = s.fs; this.done = new Set(s.done || []); this.hist = s.hist || []; return s.cwd || HOME; }
    } catch {}
    seed(); return HOME;
  },
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: FS_VERSION, fs: FS.root, done: [...this.done], hist: this.hist.slice(-200), cwd: Term.active && Term.active.sh.cwd },
        (k, v) => k === 'cache' ? undefined : v));
    } catch {}
  },
  reset() { try { localStorage.removeItem(SAVE_KEY); } catch {} },
};

// ---------- shell parsing ----------
function readVar(line, i, env) {
  let j = i + 1, name;
  if (line[j] === '{') { const e = line.indexOf('}', j); name = line.slice(j + 1, e < 0 ? line.length : e); j = e < 0 ? line.length : e + 1; }
  else if (line[j] === '?') { name = '?'; j++; }
  else { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(j)); if (!m) return { v: '$', i: j }; name = m[0]; j += name.length; }
  return { v: env[name] ?? '', i: j };
}
function tokenize(line, env) {
  const toks = []; let i = 0, cur = null;
  const push = () => { if (cur) { toks.push(cur); cur = null; } };
  const w = () => cur || (cur = { v: '', q: false, g: false });
  while (i < line.length) {
    const c = line[i];
    if (c === ' ' || c === '\t') { push(); i++; continue; }
    if (c === '#' && !cur) break;
    if (c === '|' && line[i + 1] === '|') { push(); toks.push({ op: '||' }); i += 2; continue; }
    if (c === '|') { push(); toks.push({ op: '|' }); i++; continue; }
    if (c === '&' && line[i + 1] === '&') { push(); toks.push({ op: '&&' }); i += 2; continue; }
    if (c === ';') { push(); toks.push({ op: ';' }); i++; continue; }
    if (c === '>' || ((c === '1' || c === '2') && line[i + 1] === '>' && !cur)) {
      let fd = 1; if (c !== '>') { fd = +c; i++; }
      i++; let app = false; if (line[i] === '>') { app = true; i++; }
      push(); toks.push({ op: '>', fd, app }); continue;
    }
    if (c === '<') { push(); toks.push({ op: '<' }); i++; continue; }
    if (c === '\\') { w().v += line[i + 1] ?? ''; cur.q = true; i += 2; continue; }
    if (c === "'") { const j = line.indexOf("'", i + 1); const e = j < 0 ? line.length : j; w().v += line.slice(i + 1, e); cur.q = true; i = e + 1; continue; }
    if (c === '"') {
      i++; w(); cur.q = true;
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\' && '"\\$'.includes(line[i + 1])) { cur.v += line[i + 1]; i += 2; continue; }
        if (line[i] === '$') { const r = readVar(line, i, env); cur.v += r.v; i = r.i; continue; }
        cur.v += line[i++];
      }
      i++; continue;
    }
    if (c === '$') { const r = readVar(line, i, env); w().v += r.v; i = r.i; continue; }
    if (c === '~' && !cur && (i + 1 >= line.length || line[i + 1] === '/' || line[i + 1] === ' ')) { w().v += HOME; i++; continue; }
    if (c === '*' || c === '?' || c === '[') w().g = true;
    w().v += c; i++;
  }
  push(); return toks;
}
function parse(toks) {
  const list = []; let pipe = [], cmd = { words: [], redir: [] }, op = null;
  const endCmd = () => { if (cmd.words.length || cmd.redir.length) pipe.push(cmd); cmd = { words: [], redir: [] }; };
  const endPipe = next => { endCmd(); if (pipe.length) list.push({ pipe, op }); pipe = []; op = next; };
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (!t.op) { cmd.words.push(t); continue; }
    if (t.op === '|') { endCmd(); continue; }
    if (t.op === ';' || t.op === '&&' || t.op === '||') { endPipe(t.op); continue; }
    const f = toks[++k];
    if (!f || f.op) throw new Error("syntax error near unexpected token `newline'");
    cmd.redir.push({ ...t, file: f.v });
  }
  endPipe(null); return list;
}
function parseOpts(args) {
  const f = new Set(), rest = []; let end = false;
  for (const a of args) {
    if (!end && a === '--') { end = true; continue; }
    if (!end && a.length > 1 && a[0] === '-' && a[1] !== '-' && !/^-\d+$/.test(a)) for (const c of a.slice(1)) f.add(c);
    else if (!end && a.startsWith('--')) f.add(a);
    else rest.push(a);
  }
  return { f, rest };
}

// ---------- the shell ----------
class Shell {
  constructor(pane, cwd) { this.pane = pane; this.cwd = cwd; this.oldpwd = cwd; this.status = 0; this.job = null; }
  get env() { return { HOME, USER, HOSTNAME: HOST, PWD: this.cwd, SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin:/usr/games', TMUX: Term.tmux ? '/tmp/tmux-1000/default,1,0' : '', '?': String(this.status) }; }
  abs(p) { return FS.norm(p, this.cwd); }
  short(p) { return p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p; }
  promptHtml() { return `<span class="pu">${USER}@${HOST}</span>:<span class="pp">${esc(this.short(this.cwd))}</span>$ `; }
  // look up a path, printing the usual error if it isn't there
  stat(p, cmd, io, follow = true) {
    try { const n = FS.get(this.abs(p), follow); if (n) return n; io.err(`${cmd}: ${p}: No such file or directory\n`); }
    catch (e) { if (!(e instanceof FSErr)) throw e; io.err(`${cmd}: ${p}: ${e.message}\n`); }
    return null;
  }
  safe(p, follow = true) { try { return FS.get(this.abs(p), follow); } catch { return null; } }
  get signal() { return this.job.ac.signal; }
  sleep(ms) {
    return new Promise((res, rej) => {
      const sig = this.signal; if (sig.aborted) return rej(new AbortErr());
      const t = setTimeout(res, ms);
      sig.addEventListener('abort', () => { clearTimeout(t); rej(new AbortErr()); }, { once: true });
    });
  }
  read(prompt) {
    const sig = this.signal; if (sig.aborted) return Promise.reject(new AbortErr());
    return new Promise((res, rej) => {
      this.pane.requestLine(prompt, res);
      sig.addEventListener('abort', () => rej(new AbortErr()), { once: true });
    });
  }
  abort() { if (this.job) { this.pane.write('^C\n'); this.job.ac.abort(); } }
  glob(word) {
    const i = word.lastIndexOf('/');
    const dirPart = word.slice(0, i + 1), pat = word.slice(i + 1);
    const dn = this.safe(dirPart || '.');
    if (!dn || dn.t !== 'd' || dn.lock || !/[*?[]/.test(pat)) return [word];
    const re = globRe(pat);
    const hits = Object.keys(dn.c).filter(n => re.test(n) && (pat.startsWith('.') || !n.startsWith('.'))).sort();
    return hits.length ? hits.map(n => dirPart + n) : [word];
  }
  async run(line) {
    const top = !this.job;
    if (top) this.job = { ac: new AbortController() };
    try {
      for (const { pipe, op } of parse(tokenize(line, this.env))) {
        if (op === '&&' && this.status !== 0) continue;
        if (op === '||' && this.status === 0) continue;
        this.status = await this.runPipe(pipe);
      }
    } finally { if (top) this.job = null; }
  }
  async runPipe(cmds) {
    let stdin = null, st = 0;
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      const argv = c.words.flatMap(w => w.g && !w.q ? this.glob(w.v) : [w.v]);
      const out = c.redir.find(r => r.op === '>' && r.fd === 1), er = c.redir.find(r => r.op === '>' && r.fd === 2);
      const inp = c.redir.find(r => r.op === '<');
      if (inp) { const n = this.stat(inp.file, 'bash', this.termIO()); if (!n) return 1; stdin = await FS.read(n); }
      const toTerm = i === cmds.length - 1 && !out;
      let buf = '';
      const io = {
        stdin, tty: toTerm,
        out: toTerm ? s => this.pane.write(s) : s => { buf += s; },
        html: toTerm ? h => this.pane.writeHtml(h) : h => { buf += stripTags(h); },
        status: toTerm ? h => this.pane.status(h) : () => {},
        err: er ? (er.file === '/dev/null' ? () => {} : s => { buf += s; }) : s => this.pane.write(s, 'err'),
      };
      st = await this.exec(argv, io);
      if (out && out.file !== '/dev/null') {
        try { FS.write(this.abs(out.file), buf, out.app); }
        catch (e) { if (!(e instanceof FSErr)) throw e; this.pane.write(`bash: ${out.file}: ${e.message}\n`, 'err'); st = 1; }
        buf = '';
      }
      stdin = buf;
    }
    return st;
  }
  termIO() { return { stdin: null, tty: true, out: s => this.pane.write(s), html: h => this.pane.writeHtml(h), status: h => this.pane.status(h), err: s => this.pane.write(s, 'err') }; }
  async exec(argv, io) {
    if (!argv.length) return 0;
    let [cmd, ...args] = argv;
    if (ALIASES[cmd]) { const a = ALIASES[cmd].split(' '); cmd = a[0]; args = [...a.slice(1), ...args]; }
    if (args.includes('--help') && MAN[cmd]) { io.out(MAN[cmd]); return 0; }
    if (cmd.includes('/')) return this.runFile(cmd, args, io);
    const f = CMDS[cmd];
    if (!f) {
      io.err(`${cmd}: command not found\n`);
      if (/^(dir|cls|type|copy|del)$/.test(cmd)) io.out("(that's a windows command. this is linux! type dad for help)\n");
      return 127;
    }
    try { const r = await f.call(this, args, io); return r ?? 0; }
    catch (e) { if (e instanceof FSErr) { io.err(`${cmd}: ${e.message}\n`); return 1; } throw e; }
  }
  async runFile(p, args, io) {
    const n = this.stat(p, 'bash', io);
    if (!n) return 127;
    if (n.t === 'd') { io.err(`bash: ${p}: Is a directory\n`); return 126; }
    if (!n.x) { io.err(`bash: ${p}: Permission denied\n`); return 126; }
    if (n.prog === 'light') { const r = await lightStatus(dirname(this.abs(p))); io.html(r.html + '\n'); return r.locked; }
    const text = FS.text(n);
    if (!text.startsWith('#!')) { io.err(`bash: ${p}: cannot execute binary file\n`); return 126; }
    for (const line of text.split('\n').slice(1)) if (line.trim()) await this.run(line.replace(/\$(\d)/g, (_, d) => args[d - 1] ?? ''));
    return this.status;
  }
}

async function lightStatus(dir) {
  const spots = [[0, 'closet'], [1, 'cupboard'], [2, 'drawers'], [3, 'rug'], [4, 'closet'], [5, 'cupboard'], [6, 'drawers'], [7, 'rug'], [8, 'closet']];
  let locked = 0, html = '|';
  for (const [i, s] of spots) {
    let on = false;
    try { const n = FS.get(`${dir}/hallway/door${i}/${s}/button`); on = !!n && n.t === 'f' && (await FS.read(n)).replace(/\n+$/, '') === 'ON'; } catch {}
    if (!on) locked = 1;
    html += `<span class="${on ? 'g' : 'r'}">█</span>|`;
  }
  return { locked, html };
}

// ---------- commands ----------
const fmtDate = t => { const d = new Date(t); const mo = d.toLocaleString('en-US', { month: 'short' }); return `${mo} ${String(d.getDate()).padStart(2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const modeStr = n => n.t === 'l' ? 'lrwxrwxrwx' : n.t === 'd' ? (n.lock ? 'd---------' : 'drwxrwxr-x') : n.x ? '-rwxrwxr-x' : '-rw-rw-r--';
function nameHtml(name, n, target, classify) {
  const t = target || n;
  const cls = n.t === 'l' ? 'c-ln' : t && t.t === 'd' ? 'c-dir' : t && t.x ? 'c-ex' : '';
  const suf = !classify ? '' : n.t === 'l' ? '@' : t && t.t === 'd' ? '/' : t && t.x ? '*' : '';
  return (cls ? `<span class="${cls}">${esc(name)}</span>` : esc(name)) + suf;
}
function columns(items, cols) { // items: [{text, html}]
  if (!items.length) return '';
  const w = Math.max(...items.map(i => i.text.length)) + 2;
  const nc = Math.max(1, Math.floor(cols / w)), nr = Math.ceil(items.length / nc);
  const rows = [];
  for (let r = 0; r < nr; r++) {
    let line = '';
    for (let c = 0; c < nc; c++) { const it = items[c * nr + r]; if (!it) continue; const last = !items[(c + 1) * nr + r]; line += it.html + (last ? '' : ' '.repeat(w - it.text.length)); }
    rows.push(line);
  }
  return rows.join('\n') + '\n';
}
const COW = `        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
`;
function cowsay(text, nowrap) {
  text = text.replace(/\t/g, '    ');
  const lines = nowrap ? text.replace(/\n+$/, '').split('\n') : fold(text.replace(/\s+/g, ' ').trim(), 40);
  const w = Math.max(...lines.map(l => l.length));
  let s = ' ' + '_'.repeat(w + 2) + '\n';
  if (lines.length === 1) s += `< ${lines[0]} >\n`;
  else lines.forEach((l, i) => { const [a, b] = i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|']; s += `${a} ${l.padEnd(w)} ${b}\n`; });
  return s + ' ' + '-'.repeat(w + 2) + '\n' + COW;
}
const lines = t => { const a = t.split('\n'); if (a[a.length - 1] === '') a.pop(); return a; };
async function inputs(sh, rest, io, cmd) { // stdin or files
  if (!rest.length) return [{ name: null, text: io.stdin || '' }];
  const out = [];
  for (const p of rest) {
    const n = sh.stat(p, cmd, io); if (!n) continue;
    if (n.t === 'd') { io.err(`${cmd}: ${p}: Is a directory\n`); continue; }
    out.push({ name: p, text: await FS.read(n, p) });
  }
  return out;
}
function numArg(args, def) { // -n 5, -5, -n5
  let n = def; const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-n') n = parseInt(args[++i], 10);
    else if (/^-n\d+$/.test(a)) n = parseInt(a.slice(2), 10);
    else if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10);
    else rest.push(a);
  }
  return { n: isNaN(n) ? def : n, rest };
}
function openUrl(url) { try { window.open(url, '_blank', 'noopener'); } catch {} }

const ALIASES = { ll: 'ls -la', la: 'ls -A', l: 'ls -CF', vi: 'vim', more: 'less' };
const BUILTINS = new Set(['cd', 'pwd', 'echo', 'history', 'exit', 'help', 'start', 'mission', 'dad', 'reset-game', 'clear']);

const CMDS = {
  async ls(args, io) {
    const { f, rest } = parseOpts(args);
    const all = f.has('a'), almost = f.has('A'), long = f.has('l'), cls = f.has('F'), one = f.has('1');
    const targets = rest.length ? rest : ['.'];
    let st = 0; const files = [], dirs = [];
    for (const t of targets) {
      let n, target;
      try {
        n = FS.get(this.abs(t), false);
        if (!n) { io.err(`ls: cannot access '${t}': No such file or directory\n`); st = 2; continue; }
        target = n.t === 'l' ? FS.get(this.abs(t)) : n;
      } catch (e) { io.err(`ls: cannot access '${t}': ${e.message}\n`); st = 2; continue; }
      if (target && target.t === 'd' && !(long && n.t === 'l' && !t.endsWith('/')) && !f.has('d')) dirs.push([t, target]);
      else files.push({ name: t, n, target });
    }
    const render = entries => {
      if (long) {
        let s = '';
        for (const e of entries) {
          const link = e.n.t === 'l' ? ' -> ' + esc(e.n.to) : '';
          const sz = String(FS.size(e.n)).padStart(5);
          s += `${modeStr(e.n)} 1 ${(e.n.o || USER).padEnd(5)} ${(e.n.o || USER).padEnd(5)} ${sz} ${fmtDate(e.n.m || now())} ${nameHtml(e.name, e.n, e.target, cls)}${link}\n`;
        }
        return s;
      }
      const items = entries.map(e => ({ text: e.name + (cls && (e.n.t === 'l' || (e.target && (e.target.t === 'd' || e.target.x))) ? '.' : ''), html: nameHtml(e.name, e.n, e.target, cls) }));
      if (!io.tty || one) return items.map(i => i.html).join('\n') + (items.length ? '\n' : '');
      return columns(items, this.pane.cols());
    };
    if (files.length) io.html(render(files));
    dirs.forEach(([t, d], idx) => {
      if (targets.length > 1) io.out((files.length || idx ? '\n' : '') + t + ':\n');
      if (d.lock) { io.err(`ls: cannot open directory '${t}': Permission denied\n`); st = 2; return; }
      const names = Object.keys(d.c).filter(n => all || almost || !n.startsWith('.'))
        .sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''), 'en', { sensitivity: 'base' }));
      const dirAbs = this.abs(t);
      const entries = names.map(name => { const n = d.c[name]; let target = n; if (n.t === 'l') { try { target = FS.get(dirAbs + '/' + name); } catch { target = null; } } return { name, n, target }; });
      if (all) entries.unshift({ name: '.', n: d, target: d }, { name: '..', n: D(), target: D() });
      if (long) io.out(`total ${entries.length * 4}\n`);
      io.html(render(entries));
    });
    return st;
  },
  cd(args, io) {
    let t = args[0];
    if (!t || t === '~') t = HOME;
    if (t === '-') { t = this.oldpwd; io.out(t + '\n'); }
    const abs = this.abs(t);
    let n;
    try { n = FS.get(abs); } catch (e) { io.err(`bash: cd: ${t}: ${e.message}\n`); return 1; }
    if (!n) { io.err(`bash: cd: ${t}: No such file or directory\n`); return 1; }
    if (n.t !== 'd') { io.err(`bash: cd: ${t}: Not a directory\n`); return 1; }
    if (n.lock) { io.err(`bash: cd: ${t}: Permission denied\n`); return 1; }
    this.oldpwd = this.cwd; this.cwd = abs;
  },
  async cat(args, io) {
    const { rest } = parseOpts(args);
    if (!rest.length) { io.out(io.stdin || ''); return 0; }
    let st = 0;
    for (const p of rest) {
      const n = this.stat(p, 'cat', io);
      if (!n) { st = 1; continue; }
      if (n.t === 'd') { io.err(`cat: ${p}: Is a directory\n`); st = 1; continue; }
      io.out(await FS.read(n, p));
    }
    return st;
  },
  cp(args, io) { return copyMove.call(this, args, io, false); },
  mv(args, io) { return copyMove.call(this, args, io, true); },
  mkdir(args, io) {
    const { f, rest } = parseOpts(args);
    if (!rest.length) { io.err('mkdir: missing operand\n'); return 1; }
    let st = 0;
    for (const p of rest) {
      const abs = this.abs(p);
      try {
        if (f.has('p')) { let cur = ''; for (const part of abs.split('/').filter(Boolean)) { cur += '/' + part; const n = FS.get(cur); if (!n) FS.put(cur, D()); else if (n.t !== 'd') throw new FSErr('Not a directory'); } continue; }
        if (FS.get(abs, false)) { io.err(`mkdir: cannot create directory ‘${p}’: File exists\n`); st = 1; continue; }
        FS.put(abs, D());
      } catch (e) { if (!(e instanceof FSErr)) throw e; io.err(`mkdir: cannot create directory ‘${p}’: ${e.message}\n`); st = 1; }
    }
    return st;
  },
  rmdir(args, io) {
    let st = 0;
    for (const p of parseOpts(args).rest) {
      const n = this.stat(p, 'rmdir', io, false);
      if (!n) { st = 1; continue; }
      if (n.t !== 'd') { io.err(`rmdir: failed to remove '${p}': Not a directory\n`); st = 1; continue; }
      if (Object.keys(n.c).length) { io.err(`rmdir: failed to remove '${p}': Directory not empty\n`); st = 1; continue; }
      try { FS.del(this.abs(p)); } catch (e) { io.err(`rmdir: failed to remove '${p}': ${e.message}\n`); st = 1; }
    }
    return st;
  },
  rm(args, io) {
    const { f, rest } = parseOpts(args);
    const r = f.has('r') || f.has('R'), force = f.has('f');
    if (!rest.length) { if (!force) io.err('rm: missing operand\n'); return force ? 0 : 1; }
    let st = 0;
    for (const p of rest) {
      const abs = this.abs(p);
      if (abs === '/' || abs === '/home' || abs === HOME || /^\/(usr|etc|bin|var|tmp)$/.test(abs)) { io.err(`rm: it is dangerous to operate recursively on '${p}'\nrm: nice try, franz.\n`); st = 1; continue; }
      let n; try { n = FS.get(abs, false); } catch (e) { io.err(`rm: cannot remove '${p}': ${e.message}\n`); st = 1; continue; }
      if (!n) { if (!force) { io.err(`rm: cannot remove '${p}': No such file or directory\n`); st = 1; } continue; }
      if (n.t === 'd' && !r) { io.err(`rm: cannot remove '${p}': Is a directory\n`); st = 1; continue; }
      try { FS.del(abs); } catch (e) { io.err(`rm: cannot remove '${p}': ${e.message}\n`); st = 1; }
    }
    return st;
  },
  touch(args, io) {
    let st = 0;
    for (const p of parseOpts(args).rest) {
      try { const n = FS.get(this.abs(p)); if (n) n.m = now(); else FS.put(this.abs(p), F()); }
      catch (e) { io.err(`touch: cannot touch '${p}': ${e.message}\n`); st = 1; }
    }
    return st;
  },
  echo(args, io) {
    let nl = true, e = false;
    while (args[0] === '-n' || args[0] === '-e') { if (args[0] === '-n') nl = false; else e = true; args = args.slice(1); }
    let s = args.join(' ');
    if (e) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    io.out(s + (nl ? '\n' : ''));
  },
  hostname(args, io) { io.out((args[0] === '-I' ? IP + ' ' : HOST) + '\n'); },
  whoami(args, io) { io.out(USER + '\n'); },
  async ping(args, io) {
    let count = Infinity; const pos = [];
    for (let i = 0; i < args.length; i++) { if (args[i] === '-c') count = parseInt(args[++i], 10) || 1; else if (!args[i].startsWith('-')) pos.push(args[i]); }
    const host = pos[0];
    if (!host) { io.err('ping: usage error: Destination address required\n'); return 1; }
    if (host === 'franz') { io.err('ping: franz: Name or service not known\n'); io.out("(he's hiding. good guess though.)\n"); return 2; }
    const H = { [HOST]: [HOST, IP], [IP]: [IP, IP], localhost: ['localhost', '127.0.0.1'], '127.0.0.1': ['127.0.0.1', '127.0.0.1'],
      dave: ['davidbrowning.github.io', '185.199.108.153'], 'davidbrowning.github.io': ['davidbrowning.github.io', '185.199.108.153'] };
    const hit = H[host];
    if (!hit) { io.err(`ping: ${host}: Name or service not known\n`); return 2; }
    const [disp, ip] = hit, local = ip.startsWith('127');
    io.out(`PING ${host} (${ip}) 56(84) bytes of data.\n`);
    let n = 0; const t0 = now();
    const stats = () => {
      io.out(`\n--- ${host} ping statistics ---\n${n} packets transmitted, ${n} received, 0% packet loss, time ${now() - t0}ms\n`);
      if (disp === 'davidbrowning.github.io') io.out("\n(dave's computer answered. he left his home directory open: ls /home/dave)\n");
    };
    try {
      while (n < count) {
        n++;
        const ms = local ? (0.02 + Math.random() * 0.05).toFixed(3) : (18 + Math.random() * 9).toFixed(1);
        io.out(`64 bytes from ${disp === ip ? ip : disp + ' (' + ip + ')'}: icmp_seq=${n} ttl=64 time=${ms} ms\n`);
        if (n < count) await this.sleep(1000);
      }
    } catch (e) { if (e instanceof AbortErr) stats(); throw e; }
    stats();
  },
  dad(args, io) { io.out(GAME_FILES.dad); },
  clear() { this.pane.clear(); },
  history(args, io) { State.hist.forEach((h, i) => io.out(`${String(i + 1).padStart(5)}  ${h}\n`)); },
  help(args, io) {
    io.out(box('this is a pretend linux computer in your browser. type dad (or press Help!) for help with commands. to begin the game: cd mission, then ls', this.pane.cols()));
    io.out('\ncommands: ' + Object.keys(CMDS).filter(c => !c.startsWith('_')).sort().join(' ') + '\n');
  },
  man(args, io) {
    const c = args[0];
    if (!c) { io.out('What manual page do you want?\nFor example, try \'man man\'.\n'); return 1; }
    if (!MAN[c]) { io.err(`No manual entry for ${c}\n`); return 16; }
    io.out(MAN[c]);
  },
  async find(args, io) {
    let i = 0; const paths = [];
    while (i < args.length && !args[i].startsWith('-')) paths.push(args[i++]);
    if (!paths.length) paths.push('.');
    const preds = [], execs = []; let maxd = Infinity, mind = 0;
    while (i < args.length) {
      const a = args[i++];
      if (a === '-name' || a === '-iname') { const re = globRe(args[i++] || '', a === '-iname'); preds.push((n, name) => re.test(name)); }
      else if (a === '-type') { const t = args[i++]; preds.push(n => n.t === t); }
      else if (a === '-maxdepth') maxd = +args[i++];
      else if (a === '-mindepth') mind = +args[i++];
      else if (a === '-readable') preds.push(n => !n.lock);
      else if (a === '-print') {}
      else if (a === '-exec') {
        const cmd = []; while (i < args.length && args[i] !== ';' && args[i] !== '+') cmd.push(args[i++]);
        if (i >= args.length) { io.err("find: missing argument to `-exec'\n"); return 1; }
        i++; execs.push(cmd);
      } else { io.err(`find: unknown predicate \`${a}'\n`); return 1; }
    }
    let st = 0;
    const visit = async (node, shown, depth) => {
      if (depth >= mind && preds.every(p => p(node, depth ? basename(shown) : basename(shown)))) {
        if (execs.length) for (const cmd of execs) await this.exec(cmd.map(x => x.replaceAll('{}', shown)), io);
        else io.out(shown + '\n');
      }
      if (node.t === 'd' && depth < maxd) {
        if (node.lock) { io.err(`find: ‘${shown}’: Permission denied\n`); st = 1; return; }
        for (const k of Object.keys(node.c).sort()) await visit(node.c[k], shown.replace(/\/$/, '') + '/' + k, depth + 1);
      }
    };
    for (const p of paths) {
      let n; try { n = FS.get(this.abs(p)); } catch (e) { io.err(`find: ‘${p}’: ${e.message}\n`); st = 1; continue; }
      if (!n) { io.err(`find: ‘${p}’: No such file or directory\n`); st = 1; continue; }
      await visit(n, p, 0);
    }
    return st;
  },
  locate(args, io) {
    const { f, rest } = parseOpts(args); const ci = f.has('i');
    const q = rest[0];
    if (!q) { io.err('locate: no pattern to search for specified\n'); return 1; }
    const needle = ci ? q.toLowerCase() : q, out = [];
    const walk = (n, p) => {
      if (n.t !== 'd') return;
      for (const k of Object.keys(n.c).sort()) { const cp = (p === '/' ? '' : p) + '/' + k; if ((ci ? cp.toLowerCase() : cp).includes(needle)) out.push(cp); walk(n.c[k], cp); }
    };
    walk(FS.root, '/');
    io.out(out.join('\n') + (out.length ? '\n' : ''));
    return out.length ? 0 : 1;
  },
  ln(args, io) {
    const { f, rest } = parseOpts(args);
    if (!f.has('s')) { io.err("ln: hard links aren't allowed on this machine. try ln -s\n"); return 1; }
    const [target, name] = rest;
    if (!target) { io.err('ln: missing file operand\n'); return 1; }
    const shown = name || basename(target), abs = this.abs(shown);
    try {
      const ex = FS.get(abs, false);
      if (ex) { if (!f.has('f')) { io.err(`ln: failed to create symbolic link '${shown}': File exists\n`); return 1; } FS.del(abs); }
      FS.put(abs, { t: 'l', to: target, o: USER, m: now() });
    } catch (e) { if (!(e instanceof FSErr)) throw e; io.err(`ln: failed to create symbolic link '${shown}': ${e.message}\n`); return 1; }
  },
  cowsay(args, io) {
    const { f, rest } = parseOpts(args);
    const text = rest.length ? rest.join(' ') : (io.stdin || '');
    io.out(cowsay(text || 'moo', f.has('n')));
  },
  async grep(args, io) {
    const { f, rest } = parseOpts(args);
    const pat = rest.shift();
    if (pat == null) { io.err("Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n"); return 2; }
    let re; try { re = new RegExp(pat, f.has('i') ? 'i' : ''); } catch { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f.has('i') ? 'i' : ''); }
    const srcs = await inputs(this, rest, io, 'grep');
    let total = 0;
    for (const { name, text } of srcs) {
      let c = 0; const pre = srcs.length > 1 ? name + ':' : '';
      lines(text).forEach((l, i) => { if (re.test(l) !== f.has('v')) { c++; if (!f.has('c')) io.out(pre + (f.has('n') ? (i + 1) + ':' : '') + l + '\n'); } });
      if (f.has('c')) io.out(pre + c + '\n');
      total += c;
    }
    return total ? 0 : 1;
  },
  async wc(args, io) {
    const { f, rest } = parseOpts(args);
    const pick = f.size ? f : new Set(['l', 'w', 'c']);
    for (const { name, text } of await inputs(this, rest, io, 'wc')) {
      const v = []; if (pick.has('l')) v.push((text.match(/\n/g) || []).length); if (pick.has('w')) v.push(text.split(/\s+/).filter(Boolean).length); if (pick.has('c')) v.push(text.length);
      io.out(v.map(x => String(x).padStart(name || v.length > 1 ? 7 : 0)).join(' ').trimStart() + (name ? ' ' + name : '') + '\n');
    }
  },
  async head(args, io) { const { n, rest } = numArg(args, 10); for (const { text } of await inputs(this, rest, io, 'head')) io.out(lines(text).slice(0, n).map(l => l + '\n').join('')); },
  async tail(args, io) { const { n, rest } = numArg(args, 10); for (const { text } of await inputs(this, rest, io, 'tail')) io.out(lines(text).slice(-n).map(l => l + '\n').join('')); },
  async sort(args, io) {
    const { f, rest } = parseOpts(args);
    let all = []; for (const { text } of await inputs(this, rest, io, 'sort')) all = all.concat(lines(text));
    all.sort(f.has('n') ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => a.localeCompare(b));
    if (f.has('r')) all.reverse();
    io.out(all.map(l => l + '\n').join(''));
  },
  async uniq(args, io) {
    const { f, rest } = parseOpts(args);
    const [{ text } = { text: '' }] = await inputs(this, rest, io, 'uniq');
    const out = [];
    for (const l of lines(text)) { if (out.length && out[out.length - 1][0] === l) out[out.length - 1][1]++; else out.push([l, 1]); }
    io.out(out.map(([l, c]) => (f.has('c') ? String(c).padStart(7) + ' ' : '') + l + '\n').join(''));
  },
  async less(args, io) { return CMDS.cat.call(this, args, io); },
  chmod(args, io) {
    const [mode, ...files] = args;
    if (!mode || !files.length) { io.err('chmod: missing operand\n'); return 1; }
    let st = 0;
    for (const p of files) {
      const n = this.stat(p, 'chmod', io); if (!n) { st = 1; continue; }
      if (n.o !== USER) { io.err(`chmod: changing permissions of '${p}': Operation not permitted\n`); st = 1; continue; }
      let m;
      if (/^[0-7]{3,4}$/.test(mode)) { const u = +mode.slice(-3, -2); if (n.t === 'd') n.lock = !(u & 1); else n.x = !!(u & 1); }
      else if ((m = /^[ugoa]*([+\-=])([rwx]+)$/.exec(mode))) {
        const add = m[1] !== '-';
        if (n.t === 'd') { if (/[rx]/.test(m[2])) n.lock = !add; } else if (m[2].includes('x')) n.x = add;
      } else { io.err(`chmod: invalid mode: ‘${mode}’\n`); return 1; }
    }
    return st;
  },
  stat(args, io) {
    let fmt = null; const files = [];
    for (let i = 0; i < args.length; i++) { if (args[i] === '-c' || args[i] === '--format') fmt = args[++i]; else files.push(args[i]); }
    if (!files.length) { io.err('stat: missing operand\n'); return 1; }
    for (const p of files) {
      const n = this.stat(p, 'stat', io, false); if (!n) return 1;
      if (fmt) { io.out(fmt.replace(/%U/g, n.o || USER).replace(/%n/g, p).replace(/%s/g, FS.size(n)).replace(/%A/g, modeStr(n)) + '\n'); continue; }
      io.out(`  File: ${p}${n.t === 'l' ? ' -> ' + n.to : ''}\n  Size: ${FS.size(n)}\t\t${n.t === 'd' ? 'directory' : n.t === 'l' ? 'symbolic link' : 'regular file'}\nAccess: (${modeStr(n)})  Uid: ( 1000/ ${n.o || USER})\nModify: ${new Date(n.m || now()).toString()}\n`);
    }
  },
  async jq(args, io) {
    const filter = args.find(a => a.startsWith('.')) || '.';
    const files = args.filter(a => a !== filter && !a.startsWith('-'));
    const [{ text } = { text: '' }] = await inputs(this, files, io, 'jq');
    let v; try { v = JSON.parse(text); } catch { io.err('jq: error: input is not JSON\n'); return 2; }
    for (const k of filter.split('.').filter(Boolean)) { const m = /^(\w+)(\[\])?$/.exec(k); v = v == null ? null : v[m ? m[1] : k]; }
    io.out((typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v, null, 2) ?? 'null') + '\n');
  },
  which(args, io) { let st = 0; for (const c of args) { if (CMDS[c] && !BUILTINS.has(c)) io.out('/usr/bin/' + c + '\n'); else st = 1; } return st; },
  date(args, io) { io.out(new Date().toString().replace(/ \(.*\)$/, '') + '\n'); },
  uname(args, io) { io.out(args.includes('-a') ? `Linux ${HOST} 6.8.0-bearclaw #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\n` : 'Linux\n'); },
  finger(args, io) {
    const who = args[0];
    if (who === 'dave') io.out(`Login: dave\t\t\tName: Dave Browning
Directory: /home/dave\t\tShell: /bin/bash

Normally, whoami would tell you which user you logged in as; however, this is my website.
So hi! My name is Dave Browning.
I am an aspiring linux geek. I have been playing with computers since 2013.
I have worked as a sysadmin, software engineer, SRE, and platform engineer.
I like making computers sing.

Plan:
` + FS.text(FS.get('/home/dave/.plan') || F()));
    else if (who === 'franz') io.out('Login: franz\t\t\tName: [REDACTED]\nDirectory: /home/franz\t\tShell: /bin/evil\nNo Plan. (he would never write it down... would he?)\n');
    else if (who === USER) io.out(`Login: ${USER}\t\t\tName: you\nDirectory: ${HOME}\t\tShell: /bin/bash\nPlan: find franz.\n`);
    else { io.err(`finger: ${who || ''}: no such user.\n`); return 1; }
  },
  open(args, io) {
    const p = args[0];
    if (!p) { io.err('usage: open FILE   (try: ls /home/dave)\n'); return 1; }
    let n = this.safe(p);
    if (!n) { // like the old site: open a file by name from anywhere
      const hits = [];
      const walk = (d, path) => { for (const [k, c] of Object.entries(d.c)) { const cp = path + '/' + k; if (c.t === 'd') walk(c, cp); else if (k === p && c.url) hits.push(c); } };
      walk(FS.get('/home/dave'), '/home/dave');
      n = hits[0];
    }
    if (!n) { io.err(`open: ${p}: No such file or directory\n`); return 1; }
    if (n.src) { io.out(`opening ${p}...\n`); openUrl(n.src); return 0; }
    if (!n.url) { io.err(`open: ${p} isn't a web page. try: cat ${p}\n`); return 1; }
    io.out(`opening ${p}...\n`); openUrl(n.url);
  },
  startx(args, io) { io.out('starting the X server...\nfranz can\'t follow you into the GUI.\n'); openUrl('gears/index.html'); },
  sudo(args, io) { io.err(`[sudo] password for ${USER}: \n${USER} is not in the sudoers file.  This incident will be reported (to dad).\n`); return 1; },
  games(args, io) { io.out('the classic BSD games: https://github.com/vattam/BSDGames\ndad\'s games: ls /home/dave/games  (then: open marbles.html)\n'); },
  exit() { Term.exitPane(this.pane); },
  tmux(args, io) {
    if (args[0] === 'kill-server') { Term.tmuxOff(); return 0; }
    if (args[0] === 'ls') { io.out(Term.tmux ? `0: 1 windows (created ${new Date().toDateString()}) (attached)\n` : 'no server running on /tmp/tmux-1000/default\n'); return 0; }
    if (Term.tmux) { io.err('sessions should be nested with care, unset $TMUX to force\n'); return 1; }
    Term.tmuxOn();
  },
  async vim(args, io) {
    const p = args.find(a => !a.startsWith('-') && !a.startsWith('+'));
    let text = '', abs = null;
    if (p) {
      abs = this.abs(p);
      let n; try { n = FS.get(abs); } catch (e) { io.err(`vim: ${p}: ${e.message}\n`); return 1; }
      if (n && n.t === 'd') { io.err(`"${p}" is a directory\n`); return 1; }
      if (n) text = await FS.read(n, p);
    }
    await new Vim(this.pane, abs, p, text).done;
  },
  async vimtutor(args, io) {
    io.out("this computer's vimtutor is a little one. dad's full vim page: open /home/dave/tools/vim.html\n");
    await this.sleep(1200);
    await new Vim(this.pane, HOME + '/vimtutor.txt', 'vimtutor.txt', VIMTUTOR).done;
  },
  nano(args, io) { io.err("nano: dad uninstalled nano. real agents use vim. (try: vimtutor)\n"); return 127; },
  emacs(args, io) { io.err('emacs: a fine operating system, lacking only a decent editor. try vim.\n'); return 127; },
  bash(args, io) { return args[0] ? this.runFile(args[0].includes('/') ? args[0] : './' + args[0], args.slice(1), io) : 0; },
  'reset-game': async function (args, io) {
    const a = (await this.read('erase all progress and start over? (y/n) ')).trim();
    if (a === 'y') { State.reset(); State.wipe = true; location.reload(); }
  },
  async start(args, io) { return startMission(this, io, args); },
  async mission(args, io) { return missionIntro(this, io); },
};
CMDS.pwd = function (args, io) { io.out(this.cwd + '\n'); };
CMDS.sh = CMDS.bash;

function copyMove(args, io, move) {
  const name = move ? 'mv' : 'cp';
  const { f, rest } = parseOpts(args);
  if (rest.length < 2) { io.err(`${name}: missing ${rest.length ? 'destination file operand after \'' + rest[0] + '\'' : 'file operand'}\n`); return 1; }
  const dest = rest.pop(), dAbs = this.abs(dest);
  const dn = this.safe(dest);
  const intoDir = dn && dn.t === 'd';
  if (rest.length > 1 && !intoDir) { io.err(`${name}: target '${dest}' is not a directory\n`); return 1; }
  let st = 0;
  for (const src of rest) {
    const sAbs = this.abs(src);
    const n = this.stat(src, name, io, !move);
    if (!n) { st = 1; continue; }
    if (n.t === 'd' && !move && !(f.has('r') || f.has('R'))) { io.err(`cp: -r not specified; omitting directory '${src}'\n`); st = 1; continue; }
    const target = intoDir ? dAbs + '/' + basename(sAbs) : dAbs;
    if (target === sAbs) { io.err(`${name}: '${src}' and '${dest}' are the same file\n`); st = 1; continue; }
    if (move && n.t === 'd' && (target + '/').startsWith(sAbs + '/')) { io.err(`mv: cannot move '${src}' to a subdirectory of itself\n`); st = 1; continue; }
    try {
      const ex = this.safe(target);
      if (ex && ex.t === 'd' && n.t !== 'd') { io.err(`${name}: cannot overwrite directory '${target}' with non-directory\n`); st = 1; continue; }
      if (move) { FS.del(sAbs); FS.put(target, n); }
      else { const c = clone(n); c.o = USER; c.m = now(); FS.put(target, c); }
    } catch (e) { if (!(e instanceof FSErr)) throw e; io.err(`${name}: cannot ${move ? 'move' : 'create'} '${src}': ${e.message}\n`); st = 1; }
  }
  return st;
}

const VIMTUTOR = `===============================================================
=    W e l c o m e   t o   t h e   V I M   T u t o r          =
===============================================================

Move the cursor with  h (left)  j (down)  k (up)  l (right)

  1. Press  i  to go into INSERT mode, then type something.
  2. Press  Esc  to go back.
  3. Press  x  to delete the letter under the cursor.
  4. Press  dd  to delete a whole line.
  5. Type  :q!  and press Enter to quit without saving.
     Type  :wq  and press Enter to save and quit.

The hardest part of vim is quitting. You've got this.
(dad's vim cheat sheet: quit, then  open /home/dave/tools/vim.html)
`;

const MAN = {
  ls: 'LS(1)\n\nNAME\n    ls - list directory contents\n\nOPTIONS\n    -a   show hidden files (the ones that start with .)\n    -l   long listing: permissions, owner, size, date\n    -F   add / to directories, * to programs, @ to links\n',
  cd: 'cd: cd [dir]\n    Change the shell working directory.\n    cd ..  goes up one.   cd  (alone) takes you home.   cd -  goes back.\n',
  pwd: 'PWD(1)\n\nNAME\n    pwd - print name of current/working directory\n',
  cat: 'CAT(1)\n\nNAME\n    cat - concatenate files and print on the standard output\n\nEXAMPLE\n    cat bob     spill bob\'s guts\n',
  cp: 'CP(1)\n\nNAME\n    cp - copy files and directories\n\nEXAMPLE\n    cp carpet ../02\n    cp -r dir newdir\n',
  mv: 'MV(1)\n\nNAME\n    mv - move (rename) files\n\nEXAMPLES\n    mv carpet magic_carpet\n    mv animal* ./zoo/\n',
  mkdir: 'MKDIR(1)\n\nNAME\n    mkdir - make directories\n\nOPTIONS\n    -p   make parent directories as needed\n',
  rmdir: 'RMDIR(1)\n\nNAME\n    rmdir - remove empty directories\n',
  rm: 'RM(1)\n\nNAME\n    rm - remove files or directories\n\nOPTIONS\n    -r   remove directories and their contents\n    -f   never ask, ignore missing files\n\n    careful: there is no trash can. (unless you make one.)\n',
  touch: 'TOUCH(1)\n\nNAME\n    touch - make an empty file (or update its time)\n',
  echo: 'ECHO(1)\n\nNAME\n    echo - display a line of text\n\nEXAMPLE\n    echo ON > button     put the word ON in a file called button\n',
  hostname: 'HOSTNAME(1)\n\nNAME\n    hostname - show the system\'s host name\n\nOPTIONS\n    -I   show the address\n',
  ping: 'PING(8)\n\nNAME\n    ping - send ICMP ECHO_REQUEST to network hosts\n\n    ping keeps going until you press Ctrl+c\n\nOPTIONS\n    -c N   stop after N pings\n',
  find: `FIND(1)

NAME
    find - search for files in a directory hierarchy

SYNOPSIS
    find [starting-point...] [expression]

OPTIONS
    -name pattern     file name matches pattern (case sensitive)
    -iname pattern    like -name, but case insensitive
    -type d|f|l       directory, file, or link
    -maxdepth N       don't go more than N levels down
    -exec cmd {} \\;   run cmd on each thing found ({} is the file)

EXAMPLES
    find . -name button
        Find every file called button below the current directory.

    find . -iname BuTTon
        Same, but upper/lower case doesn't matter.

    find . -iname button -exec cat {} \\;
        Find every button and print what's inside it.

    find / -type d -name bin 2>/dev/null
        Find every directory called bin, and throw away the
        Permission denied errors.
`,
  locate: 'LOCATE(1)\n\nNAME\n    locate - find files by name, super fast, anywhere on the system\n\nOPTIONS\n    -i   ignore case\n',
  ln: 'LN(1)\n\nNAME\n    ln - make links between files\n\nEXAMPLE\n    ln -snf ../04 portal    make a portal (soft link) called portal to ../04\n',
  grep: 'GREP(1)\n\nNAME\n    grep - print lines that match patterns\n\nOPTIONS\n    -i   ignore case   -n   line numbers   -c   count   -v   lines that DON\'T match\n',
  wc: 'WC(1)\n\nNAME\n    wc - print newline, word, and byte counts\n\nOPTIONS\n    -l   lines   -w   words   -c   bytes\n',
  head: 'HEAD(1)\n\nNAME\n    head - output the first part of files\n\n    head -n 5 file\n',
  tail: 'TAIL(1)\n\nNAME\n    tail - output the last part of files\n\n    tail -n 1 file\n',
  cowsay: 'COWSAY(1)\n\nNAME\n    cowsay - configurable speaking cow\n\nOPTIONS\n    -n   keep the text exactly as it is (good for pictures)\n',
  vim: 'VIM(1)\n\nNAME\n    vim - Vi IMproved, a programmer\'s text editor\n\n    i      insert mode        Esc   back to normal mode\n    h j k l  move             x     delete a letter    dd  delete a line\n    :w   save   :q   quit   :wq  save and quit   :q!  quit without saving\n\n    try: vimtutor\n',
  chmod: 'CHMOD(1)\n\nNAME\n    chmod - change file mode bits\n\nEXAMPLE\n    chmod +x my-script.sh    let it run\n',
  tmux: 'TMUX(1)\n\nNAME\n    tmux - terminal multiplexer\n\n    Ctrl+b then %       split left/right\n    Ctrl+b then "       split top/bottom\n    Ctrl+b then arrow   move between splits\n    Ctrl+b then x       close a split  (or type exit)\n',
  dad: 'DAD(1)\n\nNAME\n    dad - prints dad\'s notes about your terminal friends\n',
  start: 'START(1)\n\nNAME\n    start - start the mission for the directory you are in\n\n    cd ~/mission/mission/01 && start\n',
  man: 'MAN(1)\n\nNAME\n    man - an interface to the system reference manuals\n',
  open: 'OPEN(1)\n\nNAME\n    open - open a web page in a new tab\n\n    try: ls /home/dave\n',
};

// ---------- the terminal UI ----------
class Pane {
  constructor(cwd) {
    const mk = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
    this.el = mk('div', 'pane'); this.out = mk('div', 'out'); this.line = mk('div', 'line');
    this.ps = mk('span', 'ps'); this.typed = mk('span', 'typed'); this.cur = mk('span', 'cursor');
    this.line.append(this.ps, this.typed, this.cur); this.out.append(this.line); this.el.append(this.out);
    this.buf = ''; this.mode = 'busy'; this.reader = null; this.vim = null; this.atBOL = true; this.statusEl = null; this.hi = null; this.alive = true;
    this.sh = new Shell(this, cwd);
    this.el.addEventListener('mousedown', () => Term.focus(this));
    this.el.addEventListener('click', () => { if (!String(window.getSelection())) Term.kbd.focus({ preventScroll: true }); });
  }
  cols() { return Math.max(20, Math.floor((this.out.clientWidth - 22) / Term.cw)); }
  append(node, text) { this.statusEl = null; this.out.insertBefore(node, this.line); this.atBOL = text.endsWith('\n'); this.trim(); this.scroll(); }
  write(t, cls) { if (!t) return; const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = t; this.append(s, t); }
  writeHtml(h) { if (!h) return; const s = document.createElement('span'); s.innerHTML = h; this.append(s, s.textContent); }
  status(h) { if (!this.statusEl) { const s = document.createElement('span'); this.out.insertBefore(s, this.line); this.statusEl = s; this.atBOL = false; } this.statusEl.innerHTML = h; this.scroll(); }
  trim() { while (this.out.childNodes.length > 3000) this.out.removeChild(this.out.firstChild); }
  scroll() { this.out.scrollTop = this.out.scrollHeight; }
  clear() { while (this.out.firstChild !== this.line) this.out.removeChild(this.out.firstChild); this.atBOL = true; }
  render() { this.typed.textContent = this.buf; this.line.style.display = this.mode === 'busy' ? 'none' : ''; this.scroll(); }
  prompt() { if (!this.alive) return; if (!this.atBOL) this.write('\n'); this.mode = 'prompt'; this.ps.innerHTML = this.sh.promptHtml(); this.hi = null; this.render(); }
  requestLine(text, resolve) { if (!this.atBOL && this.statusEl) this.write('\n'); this.reader = resolve; this.mode = 'read'; this.ps.textContent = text; this.buf = ''; this.render(); }
  char(ch) { if (this.mode === 'busy') return; this.buf += ch; this.render(); }
  key(k) {
    if (this.mode === 'busy') return;
    if (k === 'Enter') return this.submit();
    if (k === 'Backspace') { this.buf = this.buf.slice(0, -1); return this.render(); }
    if (k === 'Tab') return this.complete();
    if (this.mode !== 'prompt') return;
    const H = State.hist;
    if (k === 'ArrowUp' && H.length) { this.hi = this.hi == null ? H.length - 1 : Math.max(0, this.hi - 1); this.buf = H[this.hi]; this.render(); }
    if (k === 'ArrowDown' && this.hi != null) { this.hi++; if (this.hi >= H.length) { this.hi = null; this.buf = ''; } else this.buf = H[this.hi]; this.render(); }
  }
  async submit() {
    const line = this.buf; this.buf = '';
    this.writeHtml((this.mode === 'read' ? esc(this.ps.textContent) : this.ps.innerHTML) + esc(line) + '\n');
    if (this.mode === 'read') { const r = this.reader; this.reader = null; this.mode = 'busy'; this.render(); r(line); return; }
    if (line.trim()) { if (State.hist[State.hist.length - 1] !== line) State.hist.push(line); }
    this.mode = 'busy'; this.render();
    try { await this.sh.run(line); }
    catch (e) { if (!(e instanceof AbortErr)) { this.write(`bash: ${e.message}\n`, 'err'); console.error(e); } }
    State.save();
    this.prompt();
  }
  interrupt() {
    if (this.vim) return;
    if (this.mode === 'prompt') { this.writeHtml(this.ps.innerHTML + esc(this.buf) + '^C\n'); this.buf = ''; this.render(); return; }
    if (this.mode === 'read') { this.buf = ''; this.write(this.ps.textContent + '\n'); }
    this.reader = null; this.mode = 'busy'; this.render();
    this.sh.abort();
  }
  complete() {
    const m = /(^|\s)(\S*)$/.exec(this.buf); const word = m[2];
    const before = this.buf.slice(0, this.buf.length - word.length);
    let cands;
    if (this.mode === 'prompt' && !before.trim() && !word.includes('/')) cands = [...Object.keys(CMDS), ...Object.keys(ALIASES)].filter(c => c.startsWith(word)).sort().map(c => c + ' ');
    else {
      const i = word.lastIndexOf('/'); const dirPart = word.slice(0, i + 1), base = word.slice(i + 1);
      const dn = this.sh.safe((dirPart.startsWith('~') ? HOME + dirPart.slice(1) : dirPart) || '.');
      if (!dn || dn.t !== 'd' || dn.lock) return;
      cands = Object.keys(dn.c).filter(n => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.'))).sort().map(n => {
        let node = dn.c[n]; if (node.t === 'l') node = this.sh.safe((dirPart.startsWith('~') ? HOME + dirPart.slice(1) : dirPart) + n);
        return dirPart + n + (node && node.t === 'd' ? '/' : ' ');
      });
    }
    if (!cands.length) return;
    let pre = cands[0]; for (const c of cands) while (!c.startsWith(pre)) pre = pre.slice(0, -1);
    if (pre.length > word.length) { this.buf = before + pre; return this.render(); }
    if (cands.length > 1) {
      this.writeHtml(this.ps.innerHTML + esc(this.buf) + '\n');
      this.write(columns(cands.map(c => { const t = c.trim().replace(/\/$/, '').split('/').pop() + (c.endsWith('/') ? '/' : ''); return { text: t, html: esc(t) }; }), this.cols()));
      this.render();
    }
  }
}

// a very small vim: normal / insert / command-line modes
class Vim {
  constructor(pane, abs, name, text) {
    this.pane = pane; this.abs = abs; this.name = name;
    this.L = text.replace(/\n$/, '').split('\n'); this.y = 0; this.x = 0; this.mode = 'normal'; this.cmd = ''; this.pend = ''; this.dirty = false;
    this.msg = name ? `"${name}"${text ? ` ${this.L.length}L, ${text.length}B` : ' [New]'}` : '';
    this.el = document.createElement('div'); this.el.className = 'vim'; pane.el.append(this.el); pane.vim = this;
    this.done = new Promise(r => { this.finish = r; });
    this.draw();
  }
  get line() { return this.L[this.y]; }
  clampX(ins) { this.x = Math.max(0, Math.min(this.x, this.line.length - (ins ? 0 : 1))); }
  draw() {
    const rows = Math.max(5, Math.floor(this.el.clientHeight / Term.lh) - 1);
    const top = Math.max(0, Math.min(this.y - Math.floor(rows / 2), this.L.length - rows));
    let h = '';
    for (let r = 0; r < rows; r++) {
      const i = top + r;
      if (i >= this.L.length) { h += '<span class="vt">~</span>\n'; continue; }
      const l = this.L[i];
      if (i === this.y && this.mode !== 'cmd') { const c = l[this.x] || ' '; h += esc(l.slice(0, this.x)) + `<span class="vc">${esc(c)}</span>` + esc(l.slice(this.x + 1)) + '\n'; }
      else h += esc(l) + '\n';
    }
    const st = this.mode === 'cmd' ? ':' + esc(this.cmd) + '<span class="vc"> </span>' : this.mode === 'insert' ? '<b>-- INSERT --</b>' : esc(this.msg);
    this.el.innerHTML = `<div class="vbuf">${h}</div><div class="vst">${st}<span class="vpos">${this.y + 1},${this.x + 1}</span></div>`;
  }
  char(ch) {
    if (this.mode === 'insert') { this.L[this.y] = this.line.slice(0, this.x) + ch + this.line.slice(this.x); this.x++; this.dirty = true; return this.draw(); }
    if (this.mode === 'cmd') { this.cmd += ch; return this.draw(); }
    this.msg = '';
    const p = this.pend; this.pend = '';
    if (p === 'd' && ch === 'd') { this.L.splice(this.y, 1); if (!this.L.length) this.L = ['']; this.y = Math.min(this.y, this.L.length - 1); this.clampX(); this.dirty = true; return this.draw(); }
    if (p === 'g' && ch === 'g') { this.y = 0; this.clampX(); return this.draw(); }
    if (p === 'Z' && ch === 'Z') return this.exec('x');
    switch (ch) {
      case 'h': this.x--; break; case 'l': this.x++; break;
      case 'j': this.y = Math.min(this.L.length - 1, this.y + 1); break; case 'k': this.y = Math.max(0, this.y - 1); break;
      case '0': this.x = 0; break; case '$': this.x = this.line.length; break;
      case 'G': this.y = this.L.length - 1; break;
      case 'i': this.mode = 'insert'; return this.draw();
      case 'a': this.mode = 'insert'; this.x = Math.min(this.x + 1, this.line.length); return this.draw();
      case 'A': this.mode = 'insert'; this.x = this.line.length; return this.draw();
      case 'I': this.mode = 'insert'; this.x = 0; return this.draw();
      case 'o': this.L.splice(this.y + 1, 0, ''); this.y++; this.x = 0; this.mode = 'insert'; this.dirty = true; return this.draw();
      case 'O': this.L.splice(this.y, 0, ''); this.x = 0; this.mode = 'insert'; this.dirty = true; return this.draw();
      case 'x': if (this.line.length) { this.L[this.y] = this.line.slice(0, this.x) + this.line.slice(this.x + 1); this.dirty = true; } break;
      case 'd': case 'g': case 'Z': this.pend = ch; return;
      case ':': this.mode = 'cmd'; this.cmd = ''; return this.draw();
    }
    this.clampX(); this.draw();
  }
  key(k) {
    if (k === 'Escape') { if (this.mode === 'insert') this.x--; this.mode = 'normal'; this.cmd = ''; this.clampX(); return this.draw(); }
    if (this.mode === 'cmd') {
      if (k === 'Enter') return this.exec(this.cmd.trim());
      if (k === 'Backspace') { if (!this.cmd) this.mode = 'normal'; this.cmd = this.cmd.slice(0, -1); }
      return this.draw();
    }
    if (this.mode === 'insert') {
      if (k === 'Enter') { const rest = this.line.slice(this.x); this.L[this.y] = this.line.slice(0, this.x); this.L.splice(++this.y, 0, rest); this.x = 0; this.dirty = true; }
      else if (k === 'Backspace') {
        if (this.x > 0) { this.L[this.y] = this.line.slice(0, this.x - 1) + this.line.slice(this.x); this.x--; }
        else if (this.y > 0) { this.x = this.L[this.y - 1].length; this.L[this.y - 1] += this.line; this.L.splice(this.y--, 1); }
        this.dirty = true;
      } else if (k === 'Tab') return this.char('\t');
      else this.move(k, true);
      return this.draw();
    }
    if (k === 'Enter') { this.y = Math.min(this.L.length - 1, this.y + 1); this.clampX(); return this.draw(); }
    this.move(k, false); this.draw();
  }
  move(k, ins) {
    if (k === 'ArrowLeft') this.x--; if (k === 'ArrowRight') this.x++;
    if (k === 'ArrowUp') this.y = Math.max(0, this.y - 1); if (k === 'ArrowDown') this.y = Math.min(this.L.length - 1, this.y + 1);
    this.clampX(ins);
  }
  exec(c) {
    this.mode = 'normal'; this.cmd = '';
    const m = /^(w|q|wq|x|q!|wq!|w!)(?:\s+(\S+))?$/.exec(c);
    if (!m) { this.msg = `E492: Not an editor command: ${c}`; return this.draw(); }
    const [, op, file] = m;
    if (file) { this.abs = this.pane.sh.abs(file); this.name = file; }
    if (op.startsWith('w') || (op === 'x' && this.dirty)) {
      if (!this.abs) { this.msg = 'E32: No file name'; return this.draw(); }
      try { const text = this.L.join('\n') + '\n'; FS.write(this.abs, text); this.dirty = false; this.msg = `"${this.name}" ${this.L.length}L, ${text.length}B written`; State.save(); }
      catch (e) { this.msg = `"${this.name}" E212: Can't open file for writing (${e.message})`; return this.draw(); }
    }
    if (op === 'q' && this.dirty) { this.msg = 'E37: No write since last change (add ! to override)'; return this.draw(); }
    if (op.includes('q') || op === 'x') return this.close();
    this.draw();
  }
  close() { this.el.remove(); this.pane.vim = null; this.finish(); }
}

const Term = {
  panes: [], active: null, tmux: false, prefix: false, cw: 9, lh: 18,
  init() {
    this.box = document.getElementById('panes'); this.bar = document.getElementById('tmuxbar'); this.kbd = document.getElementById('kbd');
    const probe = document.createElement('span'); probe.className = 'out'; probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;padding:0;';
    probe.textContent = 'M'.repeat(50); document.body.append(probe);
    this.cw = probe.getBoundingClientRect().width / 50 || 9; this.lh = probe.getBoundingClientRect().height || 18; probe.remove();
    const cwd = State.load();
    const p = new Pane(cwd); this.panes = [p]; this.box.append(p.el); this.focus(p);
    this.keys();
    p.write(box(State.done.size ? `welcome back, ${USER}. franz is still out there. missions done: ${[...State.done].sort().join(' ')}` :
      `Welcome to ${HOST}. You are ${USER}. Somewhere on this machine hides the evil fed franz. Type ls then press enter. Stuck? Type dad (or press Help!)`, p.cols()));
    p.prompt();
    setInterval(() => this.drawBar(), 20000);
    addEventListener('pagehide', () => State.save());
    if (window.visualViewport) { const fit = () => { document.getElementById('app').style.height = visualViewport.height + 'px'; this.active && this.active.scroll(); }; visualViewport.addEventListener('resize', fit); fit(); }
    document.getElementById('help').addEventListener('click', () => this.helpButton());
  },
  helpButton() {
    const p = this.active; this.kbd.focus({ preventScroll: true });
    if (p.mode !== 'prompt' || p.vim) { p.write('\n(dad says: finish what you\'re doing first, or press Ctrl+c, then type dad)\n'); return; }
    p.buf = 'dad'; p.submit();
  },
  focus(p) { this.active = p; for (const q of this.panes) q.el.classList.toggle('active', q === p && this.panes.length > 1); },
  layout() { this.box.className = this.dir; for (const p of this.panes) { p.vim && p.vim.draw(); p.scroll(); } },
  split(dir) {
    if (!this.tmux) return;
    if (this.panes.length >= 4) return;
    if (this.panes.length === 1) this.dir = dir;
    const p = new Pane(this.active.sh.cwd);
    const at = this.panes.indexOf(this.active) + 1;
    this.panes.splice(at, 0, p); this.box.insertBefore(p.el, this.active.el.nextSibling);
    this.layout(); this.focus(p); p.prompt(); this.drawBar();
  },
  cycle(k) {
    const i = this.panes.indexOf(this.active), n = this.panes.length;
    const back = k === 'ArrowLeft' || k === 'ArrowUp';
    this.focus(this.panes[(i + (back ? n - 1 : 1)) % n]);
  },
  kill(p = this.active) {
    if (p.vim) p.vim.close();
    if (p.sh.job) p.sh.job.ac.abort();
    if (this.panes.length === 1) { this.tmuxOff(); return; }
    p.alive = false; p.el.remove();
    const i = this.panes.indexOf(p); this.panes.splice(i, 1);
    this.focus(this.panes[Math.max(0, i - 1)]); this.layout(); this.drawBar();
  },
  exitPane(p) {
    if (this.tmux) { setTimeout(() => this.kill(p)); return; }
    p.write("logout\n...just kidding. there's no logging out while franz is still out there.\n");
  },
  tmuxOn() {
    this.tmux = true; this.dir = 'row';
    const p = this.active; p.clear();
    this.bar.hidden = false; this.drawBar(); this.layout();
  },
  tmuxOff() {
    if (!this.tmux) return;
    for (const q of this.panes.slice(1)) { if (q.sh.job) q.sh.job.ac.abort(); q.alive = false; q.el.remove(); }
    this.panes = [this.panes[0]]; this.tmux = false; this.bar.hidden = true;
    const p = this.panes[0]; this.focus(p); this.layout();
    p.write('[exited]\n'); if (p.mode !== 'busy') p.prompt();
  },
  drawBar() {
    if (!this.tmux) return;
    const d = new Date(), t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${String(d.getFullYear()).slice(2)}`;
    this.bar.innerHTML = `<span>[0] 0:bash*${this.prefix ? ' <b>(Ctrl+b)</b>' : ''}</span><span>"${HOST}" ${t}</span>`;
  },
  setPrefix(v) { this.prefix = v; this.drawBar(); },
  char(ch) {
    if (this.prefix) {
      this.setPrefix(false);
      if (ch === '%') this.split('row'); else if (ch === '"') this.split('col');
      else if (ch === 'o') this.cycle(); else if (ch === 'x') this.kill();
      return;
    }
    const p = this.active; (p.vim || p).char(ch);
  },
  special(k) {
    const p = this.active;
    if (this.prefix && k.startsWith('Arrow')) { this.setPrefix(false); return this.cycle(k); }
    this.setPrefix(false);
    (p.vim || p).key(k);
  },
  ctrl(l) {
    const p = this.active;
    if (l === 'c') { if (p.vim) p.vim.key('Escape'); else p.interrupt(); return true; }
    if (l === 'b') { if (this.tmux) this.setPrefix(true); return true; }
    if (l === 'l') { if (!p.vim && p.mode === 'prompt') p.clear(); return true; }
    if (l === 'u') { if (!p.vim) { p.buf = ''; p.render(); } return true; }
    return false;
  },
  keys() {
    const kbd = this.kbd;
    const SPECIAL = ['Enter', 'Backspace', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    kbd.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.ctrlKey && !e.altKey && !e.metaKey) { if (this.ctrl(e.key.toLowerCase())) e.preventDefault(); return; }
      if (SPECIAL.includes(e.key)) { e.preventDefault(); this.special(e.key); }
    });
    kbd.addEventListener('input', () => { const v = kbd.value; kbd.value = ''; for (const ch of v) this.char(ch); });
    document.addEventListener('keydown', e => { if (document.activeElement !== kbd && !e.metaKey && !(e.target.closest && e.target.closest('button'))) { kbd.focus({ preventScroll: true }); } });
    for (const b of document.querySelectorAll('#keybar button')) {
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); kbd.focus({ preventScroll: true });
        const k = b.dataset.k;
        if (k.startsWith('^')) this.ctrl(k[1]); else if (k.length === 1) this.char(k); else this.special(k);
      });
    }
    kbd.focus({ preventScroll: true });
  },
};
