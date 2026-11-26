/* 성경 · 찬송 — 개역개정 / 새찬송가 */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const view = $('#view');
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const pad3 = n => String(n).padStart(3, '0');

const S = {
  krv: null, hymns: [],
  pref: Object.assign({ fs: 18, font: 'serif' }, load('pref', {})),
  last: Object.assign({ b: 0, c: 1, v: 1 }, load('last', {})),      // 마지막으로 읽은 구절
  hymn: load('lastHymn', 1),                                         // 마지막으로 본 찬송가
  recentHymns: load('recentHymns', []),
};
function applyPref() {
  document.documentElement.style.setProperty('--fs', S.pref.fs + 'px');
  document.documentElement.dataset.font = S.pref.font;
}
function setLast(b, c, v) { S.last = { b, c, v: v || 1 }; save('last', S.last); }
function setHymn(n) {
  S.hymn = n; save('lastHymn', n);
  S.recentHymns = [n, ...S.recentHymns.filter(x => x !== n)].slice(0, 3); save('recentHymns', S.recentHymns);
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── 아이콘 ── */
const ic = {
  back: c => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>`,
  search: c => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`,
  down: c => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`,
  next: c => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
  book: c => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5C6 5 9 5 12 7c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z"/><path d="M12 7v12.5"/></svg>`,
  gear: c => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
};

/* ── 책 이름 · 구절 참조 해석 ── */
let bookIndex = null;
const norm = s => s.toLowerCase().replace(/[\s.]/g, '');
function buildBookIndex() {
  bookIndex = new Map();
  S.krv.books.forEach((b, i) => { bookIndex.set(norm(b.name), i); bookIndex.set(norm(b.abbr), i); });
  bookIndex.set('시편', 18); bookIndex.set('느혜미야', 15); bookIndex.set('애가', 24);
}
function findBook(raw) {
  const k = norm(raw);
  if (bookIndex.has(k)) return bookIndex.get(k);
  const hits = S.krv.books.map((b, i) => [b, i]).filter(([b]) => b.name.startsWith(raw.trim()));
  return hits.length === 1 ? hits[0][1] : -1;
}
/** "요 3:16", "요한복음 3장 16절", "창1", "시23", "고전13:4-7" → {b,c,v,v2} */
function parseRef(q) {
  const m = q.trim().match(/^((?:[1-3]\s*)?[가-힣]+)\s*(\d+)?\s*(?:장)?\s*(?:[:.,]\s*|\s+)?(\d+)?\s*(?:절)?\s*(?:[-~]\s*(\d+)\s*절?)?\s*$/);
  if (!m) return null;
  const b = findBook(m[1]); if (b < 0) return null;
  const c = m[2] ? +m[2] : 1; if (c < 1 || c > S.krv.books[b].chapters.length) return null;
  return { b, c, v: m[3] ? +m[3] : 0, v2: m[4] ? +m[4] : 0 };
}
/** 묶인 절(18-19)은 첫 절에 본문, 없는 절은 건너뜀 */
function verses(chap) {
  const out = [];
  chap.forEach((t, i) => {
    if (t === null || t === '') return;
    let j = i + 1; while (chap[j] === null) j++;
    out.push({ n: i + 1, label: j > i + 1 ? `${i + 1}-${j}` : String(i + 1), t });
  });
  return out;
}
function verseText(b, c, v) {
  const ch = S.krv.books[b].chapters[c - 1];
  let i = v - 1; while (i > 0 && ch[i] === null) i--;   // 묶인 절이면 앞 절 본문
  return ch[i] || ch.find(Boolean) || '';
}

/* ── 화면 전환 ── */
let cleanup = [];
function onKeys(prev, next) {
  const h = e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowLeft' && prev) prev(); if (e.key === 'ArrowRight' && next) next();
  };
  document.addEventListener('keydown', h); cleanup.push(() => document.removeEventListener('keydown', h));
}
function route() {
  cleanup.forEach(f => f()); cleanup = [];
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const p = path.split('/').filter(Boolean); const q = new URLSearchParams(qs || '');
  const screen = p[0] || 'home';
  document.body.dataset.screen = screen === 'home' ? 'home' : (screen === 'hymn' && p[1]) ? 'score' : 'paper';
  if (screen === 'home') renderHome();
  else if (screen === 'bible') p[1] !== undefined ? renderReader(+p[1], +p[2] || 1, +q.get('v') || 0, +q.get('v2') || 0) : renderBooks(q.get('t') === 'nt' ? 'nt' : 'ot', q.has('b') ? +q.get('b') : -1);
  else if (screen === 'hymn') p[1] ? renderScore(+p[1]) : renderHymns(q.get('q') || '', q.has('num'));
  else if (screen === 'search') renderSearch(q.get('q') || '', q.get('t') || 'all');
  else if (screen === 'settings') renderSettings();
  else { location.hash = '#/'; return; }
  window.scrollTo(0, 0);
}

/* ── 1. 첫 화면 ── */
const TODAY = ['시 23:1', '요 3:16', '빌 4:13', '롬 8:28', '사 40:31', '잠 3:5', '마 11:28', '시 46:1', '렘 29:11', '고후 5:17', '갈 2:20', '시 119:105', '수 1:9', '사 41:10', '마 6:33', '요 14:6', '롬 12:2', '히 11:1', '살전 5:16', '요일 4:8', '시 1:1', '엡 2:8', '벧전 5:7', '시 27:1', '미 6:8', '마 5:3', '고전 13:4', '요 15:5', '롬 5:8', '애 3:22', '시 121:1'];
function renderHome() {
  const { b, c, v } = S.last;
  const book = S.krv.books[b];
  const t = verseText(b, c, v);
  const size = t.length <= 60 ? 25 : t.length <= 90 ? 21 : t.length <= 130 ? 18 : 15;
  const h = S.hymns[S.hymn - 1];
  const now = new Date(); const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  const tr = parseRef(TODAY[day % TODAY.length]);
  view.innerHTML = `
  <div class="home">
    <div class="home-head">
      <h1>성경 · 찬송</h1>
      <a class="icon-btn" href="#/settings" aria-label="설정">${ic.gear('#CDB48A')}</a>
    </div>
    <a class="search-pill" href="#/search">${ic.search('#E2C285')}<span>구절 · 단어 · 찬송가 번호로 찾기</span></a>
    <div class="hero-wrap" id="hw">
      <div class="hero" id="hero">
        <img class="photo" src="img/hero.jpg" alt="둥근 탁자 위에 펼쳐진 책과 노란 꽃">
        <div class="ink ink-l" aria-hidden="true">
          <span class="h">${esc(book.name)} ${c}:${v}</span><span class="rule"></span>
          <span class="t" style="font-size:${size}px">${esc(t)}</span>
        </div>
        <img class="ink ink-r" aria-hidden="true" alt="" src="hymns/${pad3(S.hymn)}.jpg">
        <a class="pg pg-l" href="#/bible/${b}/${c}?v=${v}" aria-label="성경 — 마지막으로 읽은 ${esc(book.name)} ${c}장 ${v}절 이어 읽기"></a>
        <a class="pg pg-r" href="#/hymn/${S.hymn}" aria-label="찬송가 — 마지막으로 본 ${S.hymn}장 ${esc(h.t)}"></a>
      </div>
    </div>
    <p class="hint">왼쪽 면은 마지막에 읽은 성경, 오른쪽 면은 마지막에 본 찬송가</p>
    <a class="today" href="#/bible/${tr.b}/${tr.c}?v=${tr.v}">
      <span class="label">오늘의 말씀</span>
      <p>${esc(verseText(tr.b, tr.c, tr.v))}</p>
      <span class="ref">${esc(S.krv.books[tr.b].name)} ${tr.c}:${tr.v} ›</span>
    </a>
    <div class="recent">
      <a href="#/bible"><span>성경</span><b>66권 펼치기</b></a>
      <a href="#/hymn"><span>찬송가</span><b>645장 펼치기</b></a>
    </div>
  </div>`;
  const wrap = $('#hw'), hero = $('#hero');
  const fit = () => hero.style.setProperty('--k', wrap.clientWidth / 390);
  fit(); addEventListener('resize', fit); cleanup.push(() => removeEventListener('resize', fit));
}

/* ── 2. 성경 찾기 ── */
function searchHead(title, sub, value, placeholder, back = '#/') {
  return `<div class="dark-head">
    <div class="row">
      <a class="icon-btn back" href="${back}" aria-label="뒤로">${ic.back('#E2C285')}</a>
      <h1>${title}</h1><span class="sub">${sub}</span>
    </div>
    <form class="search-pill" id="sf" role="search">
      ${ic.search('#7A2E1F')}<label class="sr" for="sq">검색</label>
      <input id="sq" type="search" enterkeyhint="search" autocomplete="off" placeholder="${placeholder}" value="${esc(value)}">
    </form>
  </div>`;
}
function renderBooks(tab, sel) {
  const books = S.krv.books;
  const [b0, b1] = tab === 'nt' ? [39, 66] : [0, 39];
  let body;
  if (sel >= 0) {
    const n = books[sel].chapters.length;
    body = `<div class="ch-head"><a class="icon-btn back" href="#/bible?t=${tab}" aria-label="책 목록으로">${ic.back('#7A2E1F')}</a><h2>${esc(books[sel].name)}</h2><span class="count" style="margin-left:auto">${n}장</span></div>
      <div class="books num">${Array.from({ length: n }, (_, i) => `<button data-c="${i + 1}" class="${sel === S.last.b && i + 1 === S.last.c ? 'on' : ''}">${i + 1}</button>`).join('')}</div>`;
  } else {
    body = `<div class="books">${books.slice(b0, b1).map((bk, i) => `<button data-b="${b0 + i}" class="${b0 + i === S.last.b ? 'on' : ''}">${esc(bk.name)}</button>`).join('')}</div>`;
  }
  view.innerHTML = searchHead('성경', '개역개정', '', '요 3:16 · 시편 23 · 사랑 오래') +
    `<div class="dark-head" style="padding-top:0"><div class="chips">
      <a href="#/bible/${S.last.b}/${S.last.c}?v=${S.last.v}">이어 읽기 · ${esc(books[S.last.b].abbr)} ${S.last.c}:${S.last.v}</a>
      <a href="#/search?q=${encodeURIComponent('요 3:16')}">요 3:16</a><a href="#/search?q=${encodeURIComponent('시편 23')}">시편 23</a>
    </div></div>
    <div class="tabs" role="tablist">
      <button role="tab" data-t="ot" aria-selected="${tab === 'ot'}">구약 39</button>
      <button role="tab" data-t="nt" aria-selected="${tab === 'nt'}">신약 27</button>
    </div>${body}`;
  bindSearchForm();
  view.querySelectorAll('[data-t]').forEach(x => x.onclick = () => location.hash = `#/bible?t=${x.dataset.t}`);
  view.querySelectorAll('[data-b]').forEach(x => x.onclick = () => {
    const bi = +x.dataset.b;
    location.hash = books[bi].chapters.length === 1 ? `#/bible/${bi}/1` : `#/bible?t=${tab}&b=${bi}`;
  });
  view.querySelectorAll('[data-c]').forEach(x => x.onclick = () => location.hash = `#/bible/${sel}/${x.dataset.c}`);
}
function bindSearchForm(extra = '') {
  $('#sf').onsubmit = e => {
    e.preventDefault(); const v = $('#sq').value.trim(); if (!v) return;
    location.hash = `#/search?q=${encodeURIComponent(v)}${extra}`;
  };
}

/* ── 3. 성경 읽기 ── */
function renderReader(b, c, hv, hv2) {
  const books = S.krv.books;
  if (!(b >= 0 && b < 66)) b = 0;
  const book = books[b]; if (!(c >= 1 && c <= book.chapters.length)) c = 1;
  setLast(b, c, hv || 1);
  const vs = verses(book.chapters[c - 1]);
  const prev = c > 1 ? [b, c - 1] : b > 0 ? [b - 1, books[b - 1].chapters.length] : null;
  const next = c < book.chapters.length ? [b, c + 1] : b < 65 ? [b + 1, 1] : null;
  const lbl = ([bb, cc]) => bb === b ? `${cc}장` : `${books[bb].abbr} ${cc}`;
  view.innerHTML = `
    <div class="read-head">
      <a class="icon-btn" href="#/bible?t=${b < 39 ? 'ot' : 'nt'}" aria-label="성경 목록으로">${ic.back('#7A2E1F')}</a>
      <button class="read-title" id="pick">${esc(book.name)} ${c}장 ${ic.down('#6B5E4E')}</button>
      <span style="flex:1"></span>
      <a class="icon-btn" href="#/search" aria-label="검색">${ic.search('#7A2E1F')}</a>
    </div>
    <article class="verses">${vs.map(v => `<div class="v" data-v="${v.n}"><span class="n">${v.label}</span><span>${esc(v.t)}</span></div>`).join('')}</article>
    <div class="read-foot">
      <button class="pill" id="prev" ${prev ? '' : 'disabled'}>‹ ${prev ? lbl(prev) : ''}</button>
      <span style="display:flex;gap:6px">
        <button class="round" data-fs="-1" aria-label="글자 작게">가−</button>
        <button class="round" data-fs="1" aria-label="글자 크게" style="font-size:16px">가+</button>
      </span>
      <button class="pill solid" id="next" ${next ? '' : 'disabled'}>${next ? lbl(next) : ''} ›</button>
    </div>`;
  const go = t => t && (location.hash = `#/bible/${t[0]}/${t[1]}`);
  $('#prev').onclick = () => go(prev); $('#next').onclick = () => go(next);
  $('#pick').onclick = () => location.hash = `#/bible?t=${b < 39 ? 'ot' : 'nt'}&b=${b}`;
  view.querySelectorAll('[data-fs]').forEach(x => x.onclick = () => {
    S.pref.fs = Math.min(30, Math.max(14, S.pref.fs + +x.dataset.fs)); save('pref', S.pref); applyPref();
  });
  view.querySelectorAll('.v').forEach(el => el.onclick = () => {
    const n = +el.dataset.v;
    view.querySelectorAll('.v.hl').forEach(x => x.classList.remove('hl')); el.classList.add('hl');
    setLast(b, c, n);
    const txt = `${el.lastElementChild.textContent} (${book.abbr} ${c}:${el.firstElementChild.textContent})`;
    navigator.clipboard?.writeText(txt).then(() => toast('구절을 복사했습니다'), () => { });
  });
  onKeys(() => go(prev), () => go(next));
  if (hv) {
    const end = hv2 || hv;
    view.querySelectorAll('.v').forEach(el => { const n = +el.dataset.v; if (n >= hv && n <= end) el.classList.add('hl'); });
    const t = view.querySelector('.v.hl'); if (t) setTimeout(() => t.scrollIntoView({ block: 'center' }), 30);
  }
}

/* ── 4. 찬송가 찾기 ── */
const compact = s => s.replace(/[\s()]/g, '');
function renderHymns(q, focusNum) {
  const recent = S.recentHymns.length ? S.recentHymns : [1, 305, 288];
  view.innerHTML = searchHead('찬송가', '새찬송가 645장', q, '장 번호 또는 제목') + `
    <div class="quick">
      <span class="label">${S.recentHymns.length ? '최근에 본 찬송가' : '번호로 바로 가기'}</span>
      <div class="grid">
        ${recent.slice(0, 3).map(n => `<a href="#/hymn/${n}">${n}</a>`).join('')}
        <button class="go" id="gonum">번호 입력</button>
      </div>
    </div>
    <div class="section"><span class="label" id="rl"></span><span class="count" id="rc"></span></div>
    <div class="hlist" id="hl"></div>`;
  const inp = $('#sq');
  const draw = () => {
    const v = inp.value.trim();
    let items = S.hymns;
    if (/^\d+$/.test(v)) items = S.hymns.filter(h => String(h.n).startsWith(v));
    else if (v) { const k = compact(v); items = S.hymns.filter(h => compact(h.t).includes(k)); }
    $('#rl').textContent = v ? `‘${v}’ 찾은 결과` : '전체 찬송가';
    $('#rc').textContent = `${items.length}곡`;
    $('#hl').innerHTML = items.length ? items.map(h => `<a href="#/hymn/${h.n}"><span class="no">${h.n}</span><span class="tt">${esc(h.t)}</span>${ic.next('#A8977C')}</a>`).join('')
      : '<p class="empty">찾는 찬송가가 없습니다.</p>';
    history.replaceState(null, '', '#/hymn' + (v ? '?q=' + encodeURIComponent(v) : ''));
  };
  inp.oninput = draw;
  $('#sf').onsubmit = e => {
    e.preventDefault(); const v = inp.value.trim();
    if (/^\d+$/.test(v) && +v >= 1 && +v <= 645) location.hash = '#/hymn/' + +v; else inp.blur();
  };
  $('#gonum').onclick = () => { inp.value = ''; inp.setAttribute('inputmode', 'numeric'); inp.placeholder = '장 번호 (1–645)'; inp.focus(); draw(); };
  draw();
  if (focusNum) $('#gonum').click();
}

/* ── 5. 악보 ── */
function renderScore(n) {
  if (!(n >= 1 && n <= 645)) { location.hash = '#/hymn'; return; }
  setHymn(n);
  const h = S.hymns[n - 1];
  view.innerHTML = `
    <div class="score-top">
      <a class="icon-btn" href="#/hymn" aria-label="찬송가 목록으로">${ic.back('#E2C285')}</a>
      <span class="lbl">찬송가</span>
      <button class="num-btn" id="nb">${ic.search('#E2C285')}장 번호</button>
    </div>
    <form class="numpad" id="np" hidden>
      <label class="sr" for="ni">장 번호</label>
      <input id="ni" type="number" inputmode="numeric" min="1" max="645" placeholder="1–645">
      <button>열기</button>
    </form>
    <div class="score-title"><span class="no">${n}</span><h1>${esc(h.t)}</h1></div>
    <div class="sheet" id="sheet"><img src="hymns/${pad3(n)}.jpg" alt="새찬송가 ${n}장 ${esc(h.t)} 악보" decoding="async"></div>
    <p class="score-hint">두 손가락으로 확대 · 옆으로 밀어 다음 장</p>
    <div class="score-foot">
      <button class="pill" id="prev" ${n > 1 ? '' : 'disabled'}>‹ ${n > 1 ? n - 1 + '장' : ''}</button>
      <a class="icon-btn home-btn" href="#/" aria-label="첫 화면으로">${ic.book('#E2C285')}</a>
      <button class="pill solid" id="next" ${n < 645 ? '' : 'disabled'}>${n < 645 ? n + 1 + '장' : ''} ›</button>
    </div>`;
  const go = d => { const m = n + d; if (m >= 1 && m <= 645) location.hash = '#/hymn/' + m; };
  $('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
  $('#nb').onclick = () => { const f = $('#np'); f.hidden = !f.hidden; if (!f.hidden) $('#ni').focus(); };
  $('#np').onsubmit = e => { e.preventDefault(); const m = +$('#ni').value; if (m >= 1 && m <= 645) location.hash = '#/hymn/' + m; else toast('1부터 645 사이 번호를 넣어 주세요'); };
  let x0 = null, y0 = null; const sh = $('#sheet');
  sh.addEventListener('touchstart', e => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } else x0 = null; }, { passive: true });
  sh.addEventListener('touchend', e => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && (window.visualViewport?.scale || 1) <= 1.01) go(dx < 0 ? 1 : -1);
  });
  onKeys(() => go(-1), () => go(1));
}

/* ── 6. 통합 검색 ── */
function renderSearch(q, tab) {
  view.innerHTML = searchHead('찾기', '성경 · 찬송가', q, '구절 · 단어 · 찬송가 번호');
  bindSearchForm(tab !== 'all' ? `&t=${tab}` : '');
  if (!q) {
    view.insertAdjacentHTML('beforeend', `<p class="empty">“요 3:16”, “시편 23”처럼 쓰면 그 구절로 바로 갑니다.<br>“사랑 오래”처럼 여러 단어를 띄어 쓰면 모두 들어 있는 절을 찾고,<br>번호나 제목으로 찬송가도 함께 찾습니다.</p>`);
    $('#sq').focus(); return;
  }
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  // 성경
  const bible = [];
  S.krv.books.forEach((bk, b) => bk.chapters.forEach((ch, ci) => ch.forEach((t, vi) => {
    if (t && terms.every(w => t.includes(w))) bible.push({ b, c: ci + 1, v: vi + 1, t });
  })));
  // 찬송가
  let hymns;
  if (/^\d+$/.test(q.trim())) { const n = +q.trim(); hymns = n >= 1 && n <= 645 ? [S.hymns[n - 1]] : []; }
  else { const ks = terms.map(compact); hymns = S.hymns.filter(h => ks.every(k => compact(h.t).includes(k))); }
  const ref = parseRef(q);
  const re = new RegExp('(' + terms.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
  const hi = s => esc(s).replace(re, '<mark>$1</mark>');
  const LIMIT = tab === 'bible' ? 300 : 30;
  let html = `<div class="tabs" role="tablist">
    ${[['all', '전체'], ['bible', `성경 ${bible.length}`], ['hymn', `찬송가 ${hymns.length}`]].map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}
  </div><div class="results">`;
  if (ref && tab !== 'hymn') {
    const vs = ref.v ? `?v=${ref.v}${ref.v2 ? '&v2=' + ref.v2 : ''}` : '';
    html += `<a class="jump" href="#/bible/${ref.b}/${ref.c}${vs}">${esc(S.krv.books[ref.b].name)} ${ref.c}${ref.v ? ':' + ref.v + (ref.v2 ? '-' + ref.v2 : '') : '장'} 바로 가기 ${ic.next('#fff')}</a>`;
  }
  if (tab !== 'hymn') {
    html += `<div class="sec"><span class="label">성경 · ${bible.length.toLocaleString()}절</span><span class="count">구약 · 신약 전체</span></div>`;
    html += bible.slice(0, LIMIT).map(r => `<a class="bv" href="#/bible/${r.b}/${r.c}?v=${r.v}"><b>${S.krv.books[r.b].abbr} ${r.c}:${r.v}</b>${hi(r.t)}</a>`).join('');
    if (!bible.length) html += '<p class="empty">찾는 구절이 없습니다.</p>';
    if (bible.length > LIMIT) html += tab === 'all' ? `<div class="more"><button class="pill" data-t="bible">성경 결과 모두 보기</button></div>` : `<p class="count">앞의 ${LIMIT}절만 보여 줍니다. 단어를 더 넣어 좁혀 보세요.</p>`;
  }
  if (tab !== 'bible') {
    html += `<div class="sec"><span class="label">찬송가 · ${hymns.length}곡</span></div>`;
    html += hymns.map(h => `<a class="hv" href="#/hymn/${h.n}"><b>${h.n}</b><span>${hi(h.t)}</span></a>`).join('');
    if (!hymns.length) html += '<p class="empty">찾는 찬송가가 없습니다.</p>';
  }
  view.insertAdjacentHTML('beforeend', html + '</div>');
  view.querySelectorAll('[data-t]').forEach(x => x.onclick = () => location.hash = `#/search?q=${encodeURIComponent(q)}&t=${x.dataset.t}`);
}

/* ── 설정 ── */
function renderSettings() {
  view.innerHTML = `
    <div class="dark-head"><div class="row">
      <a class="icon-btn back" href="#/" aria-label="첫 화면으로">${ic.back('#E2C285')}</a><h1>설정</h1>
    </div></div>
    <div class="cards">
      <section class="card">
        <h3>보기</h3>
        <div class="row"><span>글자 크기</span>
          <button class="round" data-fs="-1" aria-label="글자 작게">가−</button><b id="fsv" style="min-width:3em;text-align:center">${S.pref.fs}px</b><button class="round" data-fs="1" aria-label="글자 크게" style="font-size:16px">가+</button></div>
        <div class="row"><span>본문 글꼴</span>
          <div class="seg">${[['serif', '명조'], ['sans', '고딕']].map(([k, l]) => `<button data-font="${k}" aria-pressed="${S.pref.font === k}">${l}</button>`).join('')}</div></div>
      </section>
      <section class="card">
        <h3>자료 파일 다시 불러오기</h3>
        <p>새 휴대폰으로 옮겼거나 자료가 지워졌을 때, 성경찬송자료.bpk 파일을 다시 골라 주세요.</p>
        <div class="row">${packPicker('pf2')}<span id="pst" class="count"></span></div>
        <progress id="ppr" value="0" max="648" hidden></progress>
      </section>
      <section class="card">
        <h3>정보</h3>
        <p>성경전서 개역개정판 © 대한성서공회 · 새찬송가 © 한국찬송가공회<br>개인 소장 자료로 만든 개인용 앱입니다. 인터넷에 공개 배포하지 마세요.</p>
      </section>
    </div>`;
  view.querySelectorAll('[data-fs]').forEach(x => x.onclick = () => { S.pref.fs = Math.min(30, Math.max(14, S.pref.fs + +x.dataset.fs)); save('pref', S.pref); applyPref(); $('#fsv').textContent = S.pref.fs + 'px'; });
  view.querySelectorAll('[data-font]').forEach(x => x.onclick = () => { S.pref.font = x.dataset.font; save('pref', S.pref); applyPref(); renderSettings(); });
  bindPackPicker('pf2', () => location.reload());
}

/* ── 자료 파일(.bpk) 불러오기: 휴대폰에 성경·악보를 저장 ── */
async function importPack(file, onProgress) {
  const head = new DataView(await file.slice(0, 8).arrayBuffer());
  const magic = String.fromCharCode(...new Uint8Array(await file.slice(0, 4).arrayBuffer()));
  if (magic !== 'BPK1') throw new Error('성경찬송 자료 파일(.bpk)이 아닙니다.');
  const hlen = head.getUint32(4, true);
  const meta = JSON.parse(await file.slice(8, 8 + hlen).text());
  const base = 8 + hlen;
  const data = await caches.open('data-v1'), hymns = await caches.open('hymns-v1');
  let done = 0;
  for (const f of meta.files) {
    const blob = file.slice(base + f.o, base + f.o + f.s, f.t);
    const url = new URL(f.p, document.baseURI).href;
    await (f.p.startsWith('hymns/') ? hymns : data).put(url, new Response(blob, { headers: { 'Content-Type': f.t, 'Content-Length': String(f.s) } }));
    onProgress(++done, meta.files.length);
  }
  try { await navigator.storage?.persist?.(); } catch { }
  return meta.files.length;
}
function packPicker(id) {
  return `<label class="pill solid" style="cursor:pointer">자료 파일 선택<input id="${id}" type="file" accept=".bpk,application/octet-stream" hidden></label>`;
}
function bindPackPicker(id, after) {
  $('#' + id).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const pr = $('#ppr'), st = $('#pst');
    pr.hidden = false; st.textContent = '저장하는 중…';
    try {
      const n = await importPack(f, (d, t) => { pr.max = t; pr.value = d; st.textContent = `${d}/${t}`; });
      st.textContent = `${n}개 저장을 마쳤습니다`; toast('자료를 모두 저장했습니다');
      setTimeout(after, 600);
    } catch (err) { st.textContent = '불러오기 실패: ' + (err.message || err); pr.hidden = true; }
  };
}
function renderSetup() {
  document.body.dataset.screen = 'paper';
  view.innerHTML = `
    <div class="dark-head"><div class="row"><h1>성경 · 찬송</h1><span class="sub">처음 한 번만</span></div></div>
    <div class="cards">
      <section class="card">
        <h3>자료 파일을 불러와 주세요</h3>
        <p>성경 본문과 찬송가 악보는 이 휴대폰 안에 저장해서 씁니다. PC에서 받은 <b>성경찬송자료.bpk</b> 파일(약 221MB)을 휴대폰으로 옮긴 뒤 아래 버튼으로 골라 주세요.</p>
        <p>한 번 저장하면 그다음부터는 인터넷이 없어도 쓸 수 있습니다.</p>
        <div class="row">${packPicker('pf')}<span id="pst" class="count"></span></div>
        <progress id="ppr" value="0" max="648" hidden></progress>
      </section>
      <section class="card">
        <h3>파일 옮기는 방법</h3>
        <p>카카오톡 ‘나와의 채팅’, 구글 드라이브, USB 연결 중 편한 방법으로 휴대폰에 옮기세요. 파일을 고를 때 ‘다운로드’나 ‘파일’ 폴더에서 찾으면 됩니다.</p>
      </section>
    </div>`;
  bindPackPicker('pf', () => location.reload());
}

/* ── 시작 ── */
(async function init() {
  applyPref();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try { await navigator.serviceWorker.register('sw.js'); } catch { }
  }
  try {
    const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
    const [krv, hymns] = await Promise.all([get('data/krv.json'), get('data/hymns.json')]);
    S.krv = krv; S.hymns = hymns; buildBookIndex();
  } catch {
    if ('caches' in window && location.protocol !== 'file:') renderSetup();
    else view.innerHTML = `<p class="empty">자료를 불러오지 못했습니다.<br>파일을 직접 열지 말고 <b>시작.bat</b>으로 실행해 주세요.</p>`;
    return;
  }
  if (!(S.last.b >= 0 && S.last.b < 66)) S.last = { b: 0, c: 1, v: 1 };
  if (!(S.hymn >= 1 && S.hymn <= 645)) S.hymn = 1;
  addEventListener('hashchange', route);
  route();
})();
