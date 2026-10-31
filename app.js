/* Tradedesk — by Eric Hong
   Vanilla, no build. Views behind a hash router (#/desk, #/catalysts, #/macro,
   #/macro/briefing, #/blog, #/method). Everything shown is derived from window.DESK in data.js. */
(() => {
  "use strict";

  const D = window.DESK;
  const RUNS = D.runs;
  const AS_OF = new Date(D.asOf + "T00:00:00");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) document.documentElement.classList.add("no-motion");

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const main = $("#main");

  // ---------- formatting ----------
  const money = (v) =>
    "$" + v.toLocaleString("en-US", {
      minimumFractionDigits: Number.isInteger(v) && v >= 100 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  const pct = (from, to) => (to - from) / from;
  const signed = (x, dp = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(dp) + "%";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = (s) => new Date(s + "T00:00:00");
  const shortDate = (s) => { const d = date(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  const daysTo = (s) => Math.round((date(s) - AS_OF) / 864e5);
  const rel = (n) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : n > 0 ? `in ${n}d` : `${-n}d ago`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const ACTION_LABEL = { BUY: "Buy", WAIT: "Wait", HOLD: "Hold", AVOID: "Avoid", NONE: "No verdict" };

  // Where you'd actually be filled: spot for BUY/HOLD, the middle of the
  // entry band for WAIT (the run says don't buy at spot).
  const entryRef = (r) => (r.action === "WAIT" && r.zone ? (r.zone[0] + r.zone[1]) / 2 : r.spot);
  const rr = (r) => {
    if (!["BUY", "WAIT", "HOLD"].includes(r.action) || !r.stop || !r.target) return null;
    const e = entryRef(r);
    return e > r.stop && r.target > e ? (r.target - e) / (e - r.stop) : null;
  };
  const upside = (r) => (r.target != null ? pct(r.spot, r.target) : null);

  // ---------- state ----------
  const saved = (() => { try { return JSON.parse(localStorage.getItem("td-state") || "{}"); } catch { return {}; } })();
  const state = {
    view: saved.view || "watch",
    action: "all",
    conv7: false,
    hasEntry: false,
    sectors: new Set(),
    sort: saved.sort || "newest",
    open: new Set(),
  };
  const persist = () => { try { localStorage.setItem("td-state", JSON.stringify({ view: state.view, sort: state.sort })); } catch {} };

  const SORTS = {
    newest: { label: "Newest run", fn: (a, b) => b.run.localeCompare(a.run) || a.t.localeCompare(b.t) },
    conv: { label: "Conviction", fn: (a, b) => (b.conv ?? -1) - (a.conv ?? -1) },
    upside: { label: "Upside", fn: (a, b) => (upside(b) ?? -9) - (upside(a) ?? -9) },
    rr: { label: "Reward / risk", fn: (a, b) => (rr(b) ?? -1) - (rr(a) ?? -1) },
    key: { label: "Next catalyst", fn: (a, b) => a.key.localeCompare(b.key) },
    ticker: { label: "Ticker A–Z", fn: (a, b) => a.t.localeCompare(b.t) },
  };

  const inView = (r) => state.view === "all" || r.watch;
  const actionMatch = (r, a) =>
    a === "all" ? true : a === "WAITHOLD" ? r.action === "WAIT" || r.action === "HOLD" : r.action === a;
  const filtered = () =>
    RUNS.filter((r) =>
      inView(r) &&
      actionMatch(r, state.action) &&
      (!state.conv7 || (r.conv ?? 0) >= 7) &&
      (!state.hasEntry || !!r.zone || r.action === "BUY") &&
      (!state.sectors.size || state.sectors.has(r.sector))
    ).sort(SORTS[state.sort].fn);

  // ---------- small render pieces ----------
  const actionTag = (a) =>
    a === "NONE"
      ? `<span class="act none">No verdict</span>`
      : `<span class="act c-${a}"><span class="swatch"></span>${a}</span>`;

  const convMeter = (c) =>
    c == null
      ? `<span class="dash">—</span>`
      : `<span class="conv" aria-label="Conviction ${c} of 10"><span class="conv-ticks">${Array.from({ length: 10 }, (_, i) => `<i class="${i < c ? "on" : ""}"></i>`).join("")}</span><span class="num">${c}</span></span>`;

  const stageBar = (n, running) =>
    `<span class="st-bar">${D.stages.map((_, i) => `<i class="${i < n ? "on" : running && i === n ? "now" : ""}"></i>`).join("")}</span>`;

  // Mini ladder for the row: stop tick, entry band, spot dot, spot→target segment.
  function miniLadder(r) {
    if (r.target == null) return `<span class="dash">—</span>`;
    const W = 112, H = 18, y = 9;
    const vals = [r.spot, r.target, r.stop, ...(r.zone || [])].filter((v) => v != null);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.06 || 1;
    const x = (v) => 3 + ((v - lo + pad) / (hi - lo + pad * 2)) * (W - 6);
    const c = `var(--${r.action === "AVOID" ? "avoid" : r.action === "BUY" ? "buy" : "wait"})`;
    return `<svg class="mini" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="var(--rule)" />
      ${r.zone ? `<rect x="${x(r.zone[0])}" y="${y - 4}" width="${Math.max(2, x(r.zone[1]) - x(r.zone[0]))}" height="8" rx="1.5" fill="rgb(var(--ink-rgb) / .14)" />` : ""}
      ${r.stop ? `<line x1="${x(r.stop)}" x2="${x(r.stop)}" y1="${y - 5}" y2="${y + 5}" stroke="var(--avoid)" stroke-width="1.5" stroke-linecap="round" />` : ""}
      <line x1="${x(r.spot)}" x2="${x(r.target)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2" stroke-linecap="round" />
      <circle cx="${x(r.target)}" cy="${y}" r="2.6" fill="${c}" />
      <circle cx="${x(r.spot)}" cy="${y}" r="3.2" fill="var(--ink)" stroke="var(--bg)" stroke-width="1.5" />
    </svg>`;
  }

  // The big ladder: every price level the run names, on one axis, labelled
  // directly. Labels sit in two lanes and are pushed apart so none collide.
  let ladderSeq = 0;
  function ladder(r, opts = {}) {
    if (r.target == null) return "";
    const W = opts.w || 520, H = 136, AX = 66;
    const c = `var(--${r.action === "AVOID" ? "avoid" : r.action === "BUY" ? "buy" : "wait"})`;
    const marks = [
      { k: "Spot", v: r.spot, lane: 0, kind: "spot" },
      { k: r.action === "AVOID" ? "Intrinsic" : "Target", v: r.target, lane: 0, kind: "target" },
    ];
    if (r.stop) marks.push({ k: "Stop", v: r.stop, lane: 1, kind: "stop" });
    if (r.zone) marks.push({ k: "Entry", v: (r.zone[0] + r.zone[1]) / 2, lo: r.zone[0], hi: r.zone[1], lane: 1, kind: "zone" });
    if (r.bear) marks.push({ k: "Bear", v: r.bear, lane: 1, kind: "alt" });
    if (r.bull) marks.push({ k: "Bull", v: r.bull, lane: 1, kind: "alt" });

    const vals = marks.flatMap((m) => [m.v, m.lo, m.hi]).filter((v) => v != null);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.1;
    const L = 30, R = W - 30;
    const x = (v) => L + ((v - lo + pad) / (hi - lo + pad * 2)) * (R - L);
    marks.forEach((m) => (m.x = m.lx = x(m.v)));

    // de-collide each lane: relax until neighbours are >= MIN apart
    const MIN = 74;
    [0, 1].forEach((lane) => {
      const ms = marks.filter((m) => m.lane === lane).sort((a, b) => a.x - b.x);
      for (let it = 0; it < 40; it++) {
        let moved = false;
        for (let i = 1; i < ms.length; i++) {
          const gap = ms[i].lx - ms[i - 1].lx;
          if (gap < MIN) { const d = (MIN - gap) / 2; ms[i - 1].lx -= d; ms[i].lx += d; moved = true; }
        }
        ms.forEach((m) => (m.lx = Math.max(26, Math.min(W - 26, m.lx))));
        if (!moved) break;
      }
    });

    const id = "h" + ladderSeq++;
    const dPct = (v) => signed(pct(r.spot, v));
    const tip = (m) => m.kind === "zone"
      ? `Entry band · ${money(m.lo)}–${money(m.hi)} · ${dPct(m.hi)} to ${dPct(m.lo)}`
      : m.kind === "spot" ? `Spot · ${money(m.v)}` : `${m.k} · ${money(m.v)} · ${dPct(m.v)} vs spot`;

    // faint price ticks
    const step = niceStep((hi - lo + pad * 2) / 4);
    const ticks = [];
    for (let v = Math.ceil((lo - pad) / step) * step; v <= hi + pad; v += step) ticks.push(v);

    const label = (m) => {
      const top = m.lane === 0;
      const ky = top ? 16 : AX + 34, vy = top ? 32 : AX + 50;
      const ly1 = top ? AX - 9 : AX + 9, ly2 = top ? 38 : AX + 22;
      const leader = Math.abs(m.lx - m.x) > 2
        ? `<path d="M${m.x} ${ly1} V${(ly1 + ly2) / 2} H${m.lx} V${ly2}" fill="none" stroke="var(--rule)" />`
        : `<line x1="${m.x}" x2="${m.x}" y1="${ly1}" y2="${ly2}" stroke="var(--rule)" />`;
      const val = m.kind === "zone" ? `${money(m.lo)}–${money(m.hi).slice(1)}` : money(m.v);
      return `${leader}<text class="lk" x="${m.lx}" y="${ky}" text-anchor="middle">${m.k}</text><text class="lv" x="${m.lx}" y="${vy}" text-anchor="middle">${val}</text>`;
    };

    const s = marks.find((m) => m.kind === "spot"), t = marks.find((m) => m.kind === "target");
    const dir = t.x >= s.x ? 1 : -1;
    const segEnd = t.x - dir * 7;

    return `<svg class="ladder" viewBox="0 0 ${W} ${H}" role="img" aria-label="Price ladder for ${r.t}: ${marks.map((m) => `${m.k} ${m.kind === "zone" ? money(m.lo) + " to " + money(m.hi) : money(m.v)}`).join(", ")}">
      <defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgb(var(--ink-rgb) / .38)" stroke-width="1.2"/></pattern></defs>
      ${ticks.map((v) => `<line x1="${x(v)}" x2="${x(v)}" y1="${AX - 3}" y2="${AX + 3}" stroke="var(--rule)"/><text class="ax" x="${x(v)}" y="${H - 2}" text-anchor="middle">${money(v)}</text>`).join("")}
      <line x1="${L - 18}" x2="${R + 18}" y1="${AX}" y2="${AX}" stroke="var(--rule)" />
      ${marks.map(label).join("")}
      ${r.zone ? `<rect x="${x(r.zone[0])}" y="${AX - 8}" width="${Math.max(3, x(r.zone[1]) - x(r.zone[0]))}" height="16" rx="3" fill="url(#${id})" stroke="rgb(var(--ink-rgb) / .3)" />` : ""}
      <line class="seg-draw" x1="${s.x}" x2="${segEnd}" y1="${AX}" y2="${AX}" stroke="${c}" stroke-width="2" stroke-linecap="round" />
      <path class="seg-draw-head" d="M${segEnd - dir * 2} ${AX - 4.5} L${segEnd + dir * 4} ${AX} L${segEnd - dir * 2} ${AX + 4.5}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      ${marks.filter((m) => m.kind === "alt").map((m) => `<circle cx="${m.x}" cy="${AX}" r="4" fill="var(--surface)" stroke="var(--t3)" stroke-width="1.5" />`).join("")}
      ${r.stop ? `<line x1="${x(r.stop)}" x2="${x(r.stop)}" y1="${AX - 9}" y2="${AX + 9}" stroke="var(--avoid)" stroke-width="2.5" stroke-linecap="round" />` : ""}
      <circle cx="${t.x}" cy="${AX}" r="5.5" fill="${c}" stroke="var(--surface)" stroke-width="2.5" />
      <circle cx="${s.x}" cy="${AX}" r="6" fill="var(--ink)" stroke="var(--surface)" stroke-width="2.5" />
      ${marks.map((m) => m.kind === "zone"
        ? `<rect class="hit" x="${x(m.lo) - 4}" y="${AX - 14}" width="${x(m.hi) - x(m.lo) + 8}" height="28" data-tip="${esc(tip(m))}" />`
        : `<circle class="hit" cx="${m.x}" cy="${AX}" r="13" data-tip="${esc(tip(m))}" />`).join("")}
    </svg>`;
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2.5 : n < 7.5 ? 5 : 10) * p;
  }

  // ---------- desk ----------
  function rowHTML(r) {
    const up = upside(r), q = rr(r), dk = daysTo(r.key);
    const entryNote = r.action === "WAIT" && r.zone ? ` title="Measured from the middle of the entry band, ${money(entryRef(r))}"` : "";
    const relCls = dk === 0 ? "today" : dk > 0 && dk <= 7 ? "soon" : "";
    const status = r.status === "running"
      ? `<span class="st running">In progress${stageBar(r.stage, true)}</span>`
      : `<span class="st">Complete</span>`;
    return `<article class="row c-${r.action}" data-t="${r.t}" data-open="${state.open.has(r.t)}">
      <button class="row-line" type="button" aria-expanded="${state.open.has(r.t)}" aria-controls="d-${r.t}">
        <span class="tk"><span class="tk-sym">${r.t}${r.watch ? `<span class="tk-star" title="On the watchlist"></span>` : ""}</span><span class="tk-sub">${esc(r.sector)}</span></span>
        <span>${actionTag(r.action)}</span>
        <span>${convMeter(r.conv)}</span>
        <span class="px">${r.target != null
          ? `<span class="px-main">${money(r.spot)}<span class="arr">→</span>${money(r.target)}</span><span class="px-sub">${signed(up)}</span>`
          : `<span class="px-main">${money(r.spot)}</span><span class="px-sub">no target</span>`}</span>
        <span class="col-ladder">${miniLadder(r)}</span>
        <span class="stop">${r.stop ? `${money(r.stop)}<small>${signed(pct(r.spot, r.stop))}</small>` : `<span class="dash">—</span>`}</span>
        <span class="rr r"${entryNote}>${q != null ? `${q.toFixed(1)}<small>×</small>` : `<span class="dash">—</span>`}</span>
        <span class="kd"><span class="kd-date">${shortDate(r.key)}</span><span class="kd-rel ${relCls}">${rel(dk)}</span></span>
        <span>${status}</span>
        <svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
      </button>
      <div class="row-detail" id="d-${r.t}" role="region" aria-label="${r.t} detail"><div>${state.open.has(r.t) ? detailHTML(r) : ""}</div></div>
    </article>`;
  }

  function detailHTML(r) {
    const verdict = r.action === "NONE"
      ? `${r.name}<span class="t3"> · ${r.status === "running" ? `In progress, step ${r.stage} of ${D.stages.length}` : "No call yet"}</span>`
      : `${r.name}<span class="t3"> · ${ACTION_LABEL[r.action]}, conviction ${r.conv}/10</span>`;
    const riskLabel = r.action === "NONE" ? "Note" : "Main risk";
    const legend = r.target != null ? `<div class="ladder-legend">
        <span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="var(--ink)"/></svg>Spot</span>
        <span><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="var(--c)"/></svg>${r.action === "AVOID" ? "Intrinsic" : "Target"}</span>
        ${r.stop ? `<span><svg width="12" height="12"><line x1="6" x2="6" y1="1" y2="11" stroke="var(--avoid)" stroke-width="2.5" stroke-linecap="round"/></svg>Stop</span>` : ""}
        ${r.zone ? `<span><svg width="14" height="10"><rect x=".5" y=".5" width="13" height="9" rx="2" fill="none" stroke="rgb(var(--ink-rgb) / .4)"/><path d="M3 9 9 1M7 9l5-7" stroke="rgb(var(--ink-rgb) / .4)"/></svg>Entry band</span>` : ""}
        ${r.bear || r.bull ? `<span><svg width="12" height="12"><circle cx="6" cy="6" r="3.6" fill="none" stroke="var(--t3)" stroke-width="1.5"/></svg>${r.bear ? "Bear case" : "Bull case"}</span>` : ""}
      </div>` : "";
    return `<div class="detail">
      <div class="detail-top">
        <div>
          <h3 class="verdict">${verdict}</h3>
          <p class="summary">${esc(r.summary)}</p>
          ${r.risk && r.risk !== "—" ? `<div class="risk"><span class="label">${riskLabel}</span><p>${esc(r.risk)}</p></div>` : ""}
        </div>
        ${r.target != null ? `<div class="ladder-wrap">${ladder(r)}${legend}</div>` : ""}
      </div>
      ${r.status === "running" ? "" : `<div class="cells">
        <div class="cell"><span class="label">Entry</span><p>${esc(r.entry)}</p></div>
        <div class="cell"><span class="label">${r.action === "AVOID" ? "Intrinsic" : "Target"}</span><p>${esc(r.targetNote)}</p></div>
        <div class="cell"><span class="label">Stop</span><p>${esc(r.stopNote)}</p></div>
        <div class="cell"><span class="label">Catalyst</span><p>${esc(r.catalyst)}</p></div>
      </div>`}
      <div class="detail-foot">
        <span>Updated ${shortDate(r.run)}</span>
        ${(() => { const g = tiltFor(r.sector); return g ? `<a class="macro-note" href="#/macro">Macro: ${tiltWord(g.tilt).toLowerCase()} (${g.name})</a>` : ""; })()}
        <span class="pipeline">Research steps ${stageBar(r.status === "running" ? r.stage : D.stages.length, r.status === "running")} ${r.status === "running" ? r.stage : D.stages.length}/${D.stages.length}</span>
        <span class="grow"></span>
        <button class="link-btn" type="button" data-copy="${r.t}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 7a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 7 1.5L6.3 2.2M7 5a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 5 10.5l.7-.7"/></svg>Copy link</button>
      </div>
    </div>`;
  }

  function countsFor(pool) {
    const c = { all: pool.length, BUY: 0, WAITHOLD: 0, AVOID: 0, NONE: 0 };
    pool.forEach((r) => { if (r.action === "WAIT" || r.action === "HOLD") c.WAITHOLD++; else c[r.action]++; });
    return c;
  }

  function toolbarHTML() {
    const pool = RUNS.filter(inView);
    const c = countsFor(pool);
    const acts = [["all", "All"], ["BUY", "Buy"], ["WAITHOLD", "Wait / Hold"], ["AVOID", "Avoid"], ["NONE", "No verdict"]];
    const sectorLabel = state.sectors.size === 0 ? "All sectors" : state.sectors.size === 1 ? [...state.sectors][0] : `${state.sectors.size} sectors`;
    const n = filtered().length;
    return `<div class="seg" role="group" aria-label="Runs">
        <button type="button" data-view="watch" aria-pressed="${state.view === "watch"}">Watchlist<span class="ct">${RUNS.filter((r) => r.watch).length}</span></button>
        <button type="button" data-view="all" aria-pressed="${state.view === "all"}">All runs<span class="ct">${RUNS.length}</span></button>
      </div>
      <div class="seg" role="group" aria-label="Action">
        ${acts.map(([k, l]) => `<button type="button" data-action="${k}" aria-pressed="${state.action === k}">${l}<span class="ct">${c[k]}</span></button>`).join("")}
      </div>
      <button class="chip" type="button" data-toggle="conv7" aria-pressed="${state.conv7}"><span class="tick"></span>Conviction ≥ 7</button>
      <button class="chip" type="button" data-toggle="hasEntry" aria-pressed="${state.hasEntry}"><span class="tick"></span>Has entry</button>
      <div class="pop"><button class="chip" type="button" data-pop="sector" aria-haspopup="true" aria-pressed="${state.sectors.size > 0}">${esc(sectorLabel)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button></div>
      <span class="grow"></span>
      <span class="count"><b>${n}</b> of ${pool.length}</span>
      <div class="pop"><button class="chip" type="button" data-pop="sort" aria-haspopup="true"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2v8M1.5 8l2 2 2-2M8.5 10V2M6.5 4l2-2 2 2"/></svg>${SORTS[state.sort].label}</button></div>`;
  }

  function tableHTML() {
    const rows = filtered();
    if (!rows.length) {
      return `<div class="empty"><p>No stocks match these filters.</p><button class="chip" type="button" data-reset>Clear filters</button></div>`;
    }
    return `<div class="thead" role="presentation">
        <span>Ticker</span><span>Action</span><span>Conviction</span><span>Price → Target</span><span class="col-ladder">Range</span><span>Stop</span><span class="r">R/R</span><span>Next event</span><span>Status</span><span></span>
      </div>
      <div class="rows">${rows.map(rowHTML).join("")}</div>`;
  }

  function deskHTML() {
    const all = RUNS;
    const mixOrder = ["BUY", "WAIT", "HOLD", "AVOID", "NONE"];
    const mix = mixOrder.map((a) => [a, all.filter((r) => r.action === a).length]).filter(([, n]) => n);
    const withConv = all.filter((r) => r.conv != null);
    const avgConv = withConv.reduce((s, r) => s + r.conv, 0) / withConv.length;
    const next = all.filter((r) => daysTo(r.key) >= 0).sort((a, b) => a.key.localeCompare(b.key))[0];
    const inWeek = all.filter((r) => { const d = daysTo(r.key); return d >= 0 && d <= 7; }).length;

    return `<div class="page desk">
      <p class="eyebrow rise">Updated ${D.asOfLabel}</p>
      <header class="head">
        <div>
          <h1 class="title rise">Trade desk</h1>
          <p class="lede rise">My latest call on every stock I cover, with the price target, stop loss and next important date. Click a row to read the full notes.</p>
        </div>
        <div class="tape rise" aria-label="Macro tape">
          ${D.tape.map((x) => `<div class="tape-cell"><div class="tape-k">${x.k}</div><div class="tape-v">${x.v}<small>${x.u}</small></div><div class="tape-d">${x.d}</div></div>`).join("")}
          <a class="tape-cell tape-link" href="#/macro"><div class="tape-k">Macro read</div><div class="tape-v tape-word">${D.macro.read.regime}</div><div class="tape-d">${D.macro.read.cycle} →</div></a>
        </div>
      </header>

      <section class="mix rise" aria-label="Verdict mix">
        <div>
          <div class="mix-bar">${mix.map(([a, n]) => `<span class="mix-seg c-${a}" style="flex:${n}" data-tip="${ACTION_LABEL[a]} · ${n} of ${all.length} runs"></span>`).join("")}</div>
          <div class="mix-legend">${mix.map(([a, n]) => `<span class="mix-key c-${a}"><span class="swatch"></span>${ACTION_LABEL[a]} <span class="num">${n}</span></span>`).join("")}</div>
        </div>
        <div class="mix-meta">
          <div><div class="meta-k">Avg conviction</div><div class="meta-v"><span class="num">${avgConv.toFixed(1)}</span> <span class="t3">/ 10</span></div></div>
          <div><div class="meta-k">Events this week</div><div class="meta-v"><span class="num">${inWeek}</span></div></div>
          <div><div class="meta-k">Next event</div><div class="meta-v"><span class="num">${next.t}</span> <span class="t3">${rel(daysTo(next.key)).toLowerCase()}</span></div></div>
        </div>
      </section>

      <div class="toolbar" id="toolbar">${toolbarHTML()}</div>
      <div class="table" id="table">${tableHTML()}</div>

      <footer class="foot">
        <span>Tradedesk by <b>${D.author}</b>. Prices as of ${D.asOfLabel}. Not investment advice.</span>
        <span class="keys"><span><kbd>⌘K</kbd> find</span><span><kbd>j</kbd><kbd>k</kbd> move</span><span><kbd>↵</kbd> open</span></span>
      </footer>
    </div>`;
  }

  function refreshDesk({ animateRows = true } = {}) {
    $("#toolbar").innerHTML = toolbarHTML();
    $("#table").innerHTML = tableHTML();
    if (animateRows) riseRows();
    persist();
  }

  function toggleRow(t, force) {
    const row = $(`.row[data-t="${t}"]`);
    if (!row) return;
    const open = force ?? row.dataset.open !== "true";
    const r = RUNS.find((x) => x.t === t);
    if (open) {
      state.open.add(t);
      const host = row.querySelector(".row-detail > div");
      if (!host.firstElementChild) host.innerHTML = detailHTML(r);
      // let the 0fr state paint before flipping to 1fr
      requestAnimationFrame(() => {
        row.dataset.open = "true";
        row.querySelector(".row-line").setAttribute("aria-expanded", "true");
        drawLadder(row);
      });
    } else {
      state.open.delete(t);
      row.dataset.open = "false";
      row.querySelector(".row-line").setAttribute("aria-expanded", "false");
    }
  }

  function drawLadder(row) {
    if (reduce) return;
    const seg = row.querySelector(".seg-draw");
    if (!seg) return;
    const len = Math.abs(+seg.getAttribute("x2") - +seg.getAttribute("x1"));
    seg.animate([{ strokeDasharray: `0 ${len + 4}` }, { strokeDasharray: `${len} 0` }], { duration: 900, delay: 140, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    const head = row.querySelector(".seg-draw-head");
    head?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 760, fill: "backwards" });
    $$(".ladder circle:not(.hit), .ladder rect:not(.hit)", row).forEach((el, i) =>
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 120 + i * 50, easing: "ease-out", fill: "backwards" }));
  }

  // ---------- catalysts ----------
  function catalystsHTML() {
    const up = RUNS.filter((r) => daysTo(r.key) >= 0).sort((a, b) => a.key.localeCompare(b.key) || a.t.localeCompare(b.t));
    const span = Math.max(...up.map((r) => daysTo(r.key))) + 6;

    // strip: one dot per run, stacked when dates crowd
    const W = 1200, AX = 60, L = 12, R = W - 12;
    const x = (d) => L + (d / span) * (R - L);
    const placed = [];
    const dots = up.map((r) => {
      const cx = x(daysTo(r.key));
      let lvl = 0;
      while (placed.some((p) => p.lvl === lvl && Math.abs(p.cx - cx) < 50)) lvl++;
      placed.push({ cx, lvl });
      return { r, cx, lvl };
    });
    const months = [];
    for (let d = 0; d <= span; d++) {
      const dt = new Date(AS_OF.getTime() + d * 864e5);
      if (dt.getDate() === 1 && d * (R - L) / span > 64) months.push({ d, label: MONTHS[dt.getMonth()] + (dt.getMonth() === 0 ? " ’" + String(dt.getFullYear()).slice(2) : "") });
    }
    const maxLvl = Math.max(...dots.map((d) => d.lvl));
    const H = AX + 22 + (maxLvl + 1) * 26;
    const strip = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Catalyst timeline for the next ${span} days">
      <line x1="${L}" x2="${R}" y1="${AX}" y2="${AX}" stroke="var(--rule)" />
      ${months.map((m) => `<line x1="${x(m.d)}" x2="${x(m.d)}" y1="${AX - 34}" y2="${AX}" stroke="var(--rule-soft)" /><text x="${x(m.d) + 6}" y="${AX - 24}" font-size="11.5" fill="var(--t3)">${m.label}</text>`).join("")}
      <line x1="${x(0)}" x2="${x(0)}" y1="${AX - 34}" y2="${AX + 6}" stroke="var(--accent)" stroke-width="1.5" />
      <text x="${x(0) + 6}" y="${AX - 24}" font-size="11.5" fill="var(--accent)">Today</text>
      ${dots.map(({ r, cx, lvl }) => {
        const cy = AX + 18 + lvl * 26;
        return `<g class="c-${r.action}">
          <line x1="${cx}" x2="${cx}" y1="${AX}" y2="${cy - 6}" stroke="var(--rule)" />
          <circle cx="${cx}" cy="${cy}" r="5" fill="var(--c)" stroke="var(--bg)" stroke-width="2" />
          <text x="${cx + 9}" y="${cy + 4}" font-size="11" fill="var(--t2)">${r.t}</text>
          <circle cx="${cx}" cy="${cy}" r="14" fill="transparent" data-tip="${esc(`${r.t} · ${ACTION_LABEL[r.action]} · ${shortDate(r.key)} (${rel(daysTo(r.key))})`)}" data-go="${r.t}" style="cursor:pointer" />
        </g>`;
      }).join("")}
    </svg>`;

    // weeks, Monday-anchored
    const monday = (dt) => { const m = new Date(dt); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
    const thisMon = monday(AS_OF);
    const groups = new Map();
    up.forEach((r) => {
      const wk = Math.round((monday(date(r.key)) - thisMon) / (7 * 864e5));
      if (!groups.has(wk)) groups.set(wk, []);
      groups.get(wk).push(r);
    });
    const weekTitle = (wk) => {
      const s = new Date(thisMon.getTime() + wk * 7 * 864e5), e = new Date(s.getTime() + 6 * 864e5);
      const range = `${MONTHS[s.getMonth()]} ${s.getDate()} – ${s.getMonth() === e.getMonth() ? "" : MONTHS[e.getMonth()] + " "}${e.getDate()}`;
      const h = wk === 0 ? "This week" : wk === 1 ? "Next week" : `Week of ${MONTHS[s.getMonth()]} ${s.getDate()}`;
      return { h, range };
    };

    return `<div class="page">
      <p class="eyebrow rise">${up.length} upcoming events</p>
      <header class="head" style="grid-template-columns:1fr">
        <div>
          <h1 class="title rise">Upcoming events</h1>
          <p class="lede rise">Earnings reports and other dates that matter for each stock, in date order. Click a ticker to see its call.</p>
        </div>
      </header>
      <div class="strip rise">${strip}</div>
      <div class="weeks">
        ${[...groups.entries()].map(([wk, rs]) => { const t = weekTitle(wk); return `<section class="week rise">
          <div><div class="week-h">${t.h}</div><div class="week-sub">${t.range} · ${rs.length} event${rs.length > 1 ? "s" : ""}</div></div>
          <div class="ev-list">${rs.map((r) => { const d = date(r.key), n = daysTo(r.key); return `<a class="ev" href="#/desk/${r.t}">
            <span class="ev-day"><b>${d.getDate()}</b><span>${DAYS[d.getDay()]}</span></span>
            <span class="tk-sym">${r.t}</span>
            <span>${actionTag(r.action)}</span>
            <span class="ev-what">${esc(r.catalyst)}</span>
            <span class="ev-when ${n === 0 ? "today" : ""}">${rel(n)}</span>
          </a>`; }).join("")}</div>
        </section>`; }).join("")}
      </div>
      <footer class="foot"><span>Tradedesk by <b>${D.author}</b>. Not investment advice.</span></footer>
    </div>`;
  }

  // ---------- macro ----------
  const M = D.macro;
  const FX_LABEL = { helps: "Helps", neutral: "Neutral", hurts: "Hurts" };
  const fxTag = (e) => `<span class="fx fx-${e}"><span class="swatch"></span>${FX_LABEL[e]}</span>`;
  const tiltWord = (t) => (t >= 1 ? "Overweight" : t > 0 ? "Slight overweight" : t === 0 ? "Neutral" : t > -1 ? "Slight underweight" : "Underweight");
  const tiltFor = (sector) => M.tilts.find((g) => g.sectors.includes(sector));
  const fmtVal = (x) => (x.pre ? x.u : "") + x.v.toLocaleString("en-US", { minimumFractionDigits: x.dp, maximumFractionDigits: x.dp }) + (x.pre ? "" : x.u);

  // 12-month sparkline: a 1.5px line, a dot on the latest reading, and a dashed
  // line at the year-ago level so direction reads without an axis.
  function spark(x) {
    const W = 120, H = 30, P = 4, s = x.s;
    const lo = Math.min(...s), hi = Math.max(...s), span = hi - lo || 1;
    const px = (i) => P + (i / (s.length - 1)) * (W - 2 * P);
    const py = (v) => H - P - ((v - lo) / span) * (H - 2 * P);
    const d = s.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join("");
    const f = (v) => fmtVal({ ...x, v });
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(x.k)}, ${f(s[0])} a year ago, ${f(s[s.length - 1])} now" data-tip="${esc(`${x.k}: ${f(s[0])} a year ago → ${f(s[s.length - 1])} now`)}">
      <line x1="${P}" x2="${W - P}" y1="${py(s[0])}" y2="${py(s[0])}" stroke="var(--rule)" stroke-dasharray="2 3" />
      <path d="${d}" fill="none" stroke="var(--t2)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${px(s.length - 1)}" cy="${py(s[s.length - 1])}" r="3" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5" />
    </svg>`;
  }

  // Growth (x) against inflation trend (y). The last eight weekly reads are a
  // trail; the latest is the only coloured mark.
  function quadrant() {
    const W = 560, H = 420, L = 40, R = W - 16, T = 16, B = H - 36, LIM = 1.3;
    const x = (g) => L + ((g + LIM) / (2 * LIM)) * (R - L);
    const y = (i) => B - ((i + LIM) / (2 * LIM)) * (B - T);
    const cx = x(0), cy = y(0);
    const pts = M.path.map((p) => ({ ...p, X: x(p.g), Y: y(p.i) }));
    const last = pts[pts.length - 1], first = pts[0];
    const quad = (g, i) => (g >= 0 ? (i >= 0 ? "Overheating" : "Recovery") : i >= 0 ? "Stagflation" : "Slowdown");
    const corner = (tx, ty, anchor, name, sub, on) =>
      `<text x="${tx}" y="${ty}" text-anchor="${anchor}" class="q-name${on ? " on" : ""}">${name}</text><text x="${tx}" y="${ty + 17}" text-anchor="${anchor}" class="q-sub">${sub}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth and inflation regime, last ${pts.length} weekly reads. Latest: ${quad(last.g, last.i)}.">
      <rect x="${cx}" y="${T}" width="${R - cx}" height="${cy - T}" fill="var(--wash)" />
      <rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="none" stroke="var(--rule)" rx="2" />
      <line x1="${cx}" x2="${cx}" y1="${T}" y2="${B}" stroke="var(--rule)" />
      <line x1="${L}" x2="${R}" y1="${cy}" y2="${cy}" stroke="var(--rule)" />
      ${corner(L + 14, T + 26, "start", "Stagflation", "Growth down, inflation up", false)}
      ${corner(cx + 14, T + 26, "start", "Overheating", "Growth up, inflation up", true)}
      ${corner(L + 14, B - 30, "start", "Slowdown", "Growth down, inflation down", false)}
      ${corner(R - 14, B - 30, "end", "Recovery", "Growth up, inflation down", false)}
      <text x="${R}" y="${B + 24}" text-anchor="end" class="q-axis">Growth vs trend →</text>
      <text x="${L}" y="${B + 24}" class="q-axis">← Below trend</text>
      <text transform="translate(${L - 14} ${cy}) rotate(-90)" text-anchor="middle" class="q-axis">Inflation trend →</text>
      <polyline points="${pts.map((p) => `${p.X.toFixed(1)},${p.Y.toFixed(1)}`).join(" ")}" fill="none" stroke="var(--t4)" stroke-width="1.5" stroke-linejoin="round" />
      ${pts.slice(0, -1).map((p) => `<circle cx="${p.X}" cy="${p.Y}" r="3.5" fill="var(--bg)" stroke="var(--t3)" stroke-width="1.5" />
        <circle cx="${p.X}" cy="${p.Y}" r="11" fill="transparent" data-tip="${esc(`${shortDate(p.d)} · ${quad(p.g, p.i)}`)}" />`).join("")}
      <text x="${first.X + 10}" y="${first.Y + 4}" class="q-date">${shortDate(first.d)}</text>
      <circle cx="${last.X}" cy="${last.Y}" r="7" fill="var(--accent)" stroke="var(--bg)" stroke-width="2.5" />
      <circle cx="${last.X}" cy="${last.Y}" r="14" fill="transparent" data-tip="${esc(`${shortDate(last.d)} (latest) · ${quad(last.g, last.i)}`)}" />
      <text x="${last.X + 14}" y="${last.Y + 4}" class="q-date now">${shortDate(last.d)}</text>
    </svg>`;
  }

  const macroHead = (tab) => `
      <p class="eyebrow rise">Macro read for ${shortDate(M.asOf)}, ${M.asOf.slice(0, 4)}</p>
      <header class="head" style="grid-template-columns:1fr">
        <div>
          <h1 class="title rise">Macro</h1>
          <p class="lede rise">Where the economy is in the cycle and what that means for the stocks on the desk. I update the read every Friday and after each Fed meeting.</p>
        </div>
      </header>
      <nav class="tabs rise" aria-label="Macro pages">
        <a href="#/macro" ${tab === "overview" ? 'aria-current="page"' : ""}>Overview</a>
        <a href="#/macro/briefing" ${tab === "briefing" ? 'aria-current="page"' : ""}>Daily briefing</a>
      </nav>`;

  function macroHTML() {
    const r = M.read, dRec = r.recession - r.recessionPrev;
    const deskBy = (sectors) => RUNS.filter((x) => sectors.includes(x.sector));
    const chip = (x) => `<a class="ttag tkchip c-${x.action}" href="#/desk/${x.t}" data-tip="${esc(`${x.name} · ${ACTION_LABEL[x.action]}`)}"><span class="swatch"></span>${x.t}</a>`;

    return `<div class="page macro">
      ${macroHead("overview")}

      <section class="read rise" aria-label="Current read">
        <div class="read-cell"><div class="meta-k">Regime</div><div class="read-v">${r.regime}</div><div class="read-n">${r.regimeNote}</div></div>
        <div class="read-cell"><div class="meta-k">Cycle</div><div class="read-v">${r.cycle}</div><div class="read-n">${r.cycleNote}</div></div>
        <div class="read-cell"><div class="meta-k">Recession odds, next 12 months</div><div class="read-v num">${r.recession}%</div><div class="read-n">${dRec > 0 ? "Up" : "Down"} ${Math.abs(dRec)} points from last week</div></div>
        <div class="read-cell"><div class="meta-k">Liquidity</div><div class="read-v">${r.liquidity}</div><div class="read-n">${r.liquidityNote}</div></div>
      </section>

      <section class="mregime">
        <div class="regime-text rise">
          <h2 class="h2">The short version</h2>
          ${r.summary.map((p) => `<p>${esc(p)}</p>`).join("")}
          <h2 class="h2">What changed this week</h2>
          <ul class="changed">${r.changed.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        </div>
        <figure class="quad rise">
          ${quadrant()}
          <figcaption>Weekly reads since ${shortDate(M.path[0].d)}. Growth is measured against its trend; inflation by whether its trend is rising or falling.</figcaption>
        </figure>
      </section>

      <section class="block rise">
        <div class="block-head"><h2 class="h2">Sector tilts</h2><p>How the macro read leans for each part of the market, and the stocks I cover in each.</p></div>
        <div class="tilts">
          ${M.tilts.map((g) => { const w = Math.abs(g.tilt) / 2 * 50; return `<div class="tilt">
            <div class="tilt-name"><b>${g.name}</b><span>${esc(g.why)}</span></div>
            <div class="tilt-bar" data-tip="${esc(`${g.name} · ${tiltWord(g.tilt)} (${g.tilt > 0 ? "+" : ""}${g.tilt})`)}">
              <span class="tilt-mid"></span>
              ${g.tilt ? `<span class="tilt-fill ${g.tilt > 0 ? "pos" : "neg"}" style="${g.tilt > 0 ? "left:50%" : `left:${50 - w}%`};width:${w}%"></span>` : `<span class="tilt-zero"></span>`}
            </div>
            <div class="tilt-word">${tiltWord(g.tilt)}</div>
            <div class="tilt-tk">${deskBy(g.sectors).map(chip).join("")}</div>
          </div>`; }).join("")}
          <div class="tilt-scale" aria-hidden="true"><span></span><span class="tilt-scale-axis"><span>Underweight</span><span>Neutral</span><span>Overweight</span></span></div>
        </div>
      </section>

      <section class="block rise">
        <div class="block-head"><h2 class="h2">Indicators</h2><p>The data behind the read. Each line shows the last 12 months; the dashed line is where it was a year ago.</p></div>
        <div class="ind">
          <div class="ind-head" aria-hidden="true"><span>Indicator</span><span>Latest</span><span>12 months</span><span>For stocks</span><span>Why</span></div>
          ${M.groups.map((g) => `<div class="ind-group">${g.name}</div>${g.items.map((x) => `<div class="ind-row">
            <span class="ind-k">${x.k}</span>
            <span class="ind-v num">${fmtVal(x)}</span>
            <span class="ind-s">${spark(x)}</span>
            <span>${fxTag(x.effect)}</span>
            <span class="ind-n">${esc(x.note)}</span>
          </div>`).join("")}`).join("")}
        </div>
      </section>

      <section class="block rise">
        <div class="block-head"><h2 class="h2">Themes I’m trading</h2></div>
        <div class="themes">
          ${M.themes.map((t) => `<article class="theme"><h3>${t.title}</h3><p>${esc(t.body)}</p><div class="tilt-tk">${t.tickers.map((tk) => RUNS.find((x) => x.t === tk)).filter(Boolean).map(chip).join("")}</div></article>`).join("")}
        </div>
      </section>

      <section class="block rise">
        <div class="block-head"><h2 class="h2">Past reads</h2></div>
        <div class="hist" role="table">
          <div class="hist-row hist-h" role="row"><span>Date</span><span>Regime</span><span>Cycle</span><span>Recession odds</span><span>Liquidity</span><span>Top sectors</span></div>
          ${M.history.map((h, i) => `<div class="hist-row${i === 0 ? " now" : ""}" role="row">
            <span class="num">${shortDate(h.d)}</span>
            <span>${h.regime}</span>
            <span>${h.cycle}</span>
            <span class="hist-rec"><span class="num">${h.rec}%</span><span class="hist-bar"><i style="width:${h.rec * 2.5}%"></i></span></span>
            <span>${h.liq}</span>
            <span class="t3">${h.top.join(", ")}</span>
          </div>`).join("")}
        </div>
      </section>

      <footer class="foot"><span>Tradedesk by <b>${D.author}</b>. Data as of ${D.asOfLabel}. Not investment advice.</span></footer>
    </div>`;
  }

  function briefingHTML() {
    const b = M.briefing;
    const chg = (x, bp) => bp ?? signed(x / 100);
    const reporting = RUNS.filter((r) => { const n = daysTo(r.key); return n >= 0 && n <= 7; }).sort((a, z) => a.key.localeCompare(z.key));
    return `<div class="page macro">
      ${macroHead("briefing")}
      <article class="brief">
        <h2 class="brief-title rise">${b.title}</h2>
        <p class="brief-short rise">${esc(b.short)}</p>

        <section class="rise">
          <h3 class="h3">Markets at the close</h3>
          <div class="lv">
            <div class="lv-row lv-h"><span></span><span>Close</span><span>Day</span><span>Month</span></div>
            ${b.levels.map((l) => `<div class="lv-row"><span>${l.k}</span><span class="num">${l.v}</span><span class="num ${l.d1 < 0 ? "dn" : "up"}">${chg(l.d1, l.bp)}</span><span class="num ${l.m1 < 0 ? "dn" : "up"}">${chg(l.m1, l.bpm)}</span></div>`).join("")}
          </div>
        </section>

        <section class="rise">
          <h3 class="h3">What happened</h3>
          <ul class="changed">${b.happened.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
        </section>

        <section class="rise">
          <h3 class="h3">What I’m watching</h3>
          <div class="watch">${b.watching.map((w) => { const d = date(w.d); return `<div class="watch-row">
            <span class="ev-day"><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()]}</span></span>
            <span><b>${w.what}</b><span class="t3"> · ${rel(daysTo(w.d))}</span><br><span class="watch-why">${esc(w.why)}</span></span>
          </div>`; }).join("")}</div>
        </section>

        ${reporting.length ? `<section class="rise">
          <h3 class="h3">Stocks on the desk with events in the next week</h3>
          <div class="ev-list">${reporting.map((r) => { const d = date(r.key), n = daysTo(r.key); return `<a class="ev" href="#/desk/${r.t}">
            <span class="ev-day"><b>${d.getDate()}</b><span>${DAYS[d.getDay()]}</span></span>
            <span class="tk-sym">${r.t}</span>
            <span>${actionTag(r.action)}</span>
            <span class="ev-what">${esc(r.catalyst)}</span>
            <span class="ev-when ${n === 0 ? "today" : ""}">${rel(n)}</span>
          </a>`; }).join("")}</div>
        </section>` : ""}
      </article>
      <footer class="foot"><span>Tradedesk by <b>${D.author}</b>. Prices as of ${D.asOfLabel}. Not investment advice.</span></footer>
    </div>`;
  }

  // ---------- method ----------
  function methodHTML() {
    const sample = RUNS.find((r) => r.t === "NVDA");
    const blurbs = [
      "Check rates, credit spreads and the dollar, and which sectors they help or hurt.",
      "Check debt, cash flow and ownership. Most stocks don’t get past this step.",
      "Look at the trend and key price levels. This sets the stop and the buy range.",
      "Build a DCF or the model that suits the business, and compare it to peers.",
      "Write the best case for and against, with a price for each.",
      "List what would prove the call wrong, and when we’d find out.",
      "Decide on Buy, Wait, Hold or Avoid, with a conviction score.",
    ];
    return `<div class="page">
      <p class="eyebrow rise">How the research works</p>
      <header class="head" style="grid-template-columns:1fr">
        <div>
          <h1 class="title rise">Method</h1>
          <p class="lede rise">Each stock goes through the same seven steps before it gets a call.</p>
        </div>
      </header>
      <ol class="steps rise">${D.stages.map((s, i) => `<li><span class="num">Step ${i + 1}</span><b>${s}</b><p>${blurbs[i]}</p></li>`).join("")}</ol>
      <div class="prose">

        <h2 class="rise">What the calls mean</h2>
        <dl class="defs rise">
          <dt>${actionTag("BUY")}</dt><dd>Buy at the current price. The Entry note gives the starting size and where to add.</dd>
          <dt>${actionTag("WAIT")}</dt><dd>I like the company but the price is too high. The Entry note gives the price range where I’d buy, and R/R is measured from the middle of that range.</dd>
          <dt>${actionTag("HOLD")}</dt><dd>Keep it if you own it, but there isn’t enough upside to buy more.</dd>
          <dt>${actionTag("AVOID")}</dt><dd>Don’t own it. The price shown is my estimate of what it’s worth, which is below the current price.</dd>
          <dt>${actionTag("NONE")}</dt><dd>The research is still in progress, or it’s waiting on missing data.</dd>
        </dl>

        <h2 class="rise">Reading the price range chart</h2>
        <p class="rise">This chart puts all the prices for a stock on one line. The coloured line goes from the current price to the target. The red mark is the stop loss and the striped box is the buy range.</p>
        <div class="sample c-${sample.action} rise">${ladder(sample, { w: 560 })}</div>
        <p class="rise">Reward/risk (R/R) compares how far the target is from your buy price with how far the stop is:</p>
        <p class="rise"><span class="formula">R/R = (target − entry) ÷ (entry − stop)</span></p>
        <p class="rise"><b>Conviction</b> goes from 1 to 10. It reflects how many parts of the research point the same way, not how much upside there is. I put less money into a 5 than an 8, even if the 5 has better R/R.</p>
      </div>
      <footer class="foot"><span>Tradedesk by <b>${D.author}</b>. Not investment advice.</span></footer>
    </div>`;
  }

  // ---------- blog ----------
  const longDate = (s) => { const d = date(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
  const readTime = (p) => Math.max(1, Math.round(p.body.join(" ").split(/\s+/).length / 220));
  const tickerChip = (t) => {
    const r = RUNS.find((x) => x.t === t);
    return r ? `<a class="tchip c-${r.action}" href="#/desk/${t}"><span class="swatch"></span>${t}</a>` : "";
  };

  function blogHTML() {
    const posts = [...D.posts].sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="page">
      <p class="eyebrow rise">${posts.length} posts</p>
      <header class="head" style="grid-template-columns:1fr">
        <div>
          <h1 class="title rise">Blog</h1>
          <p class="lede rise">Longer notes on the calls, what changed and why.</p>
        </div>
      </header>
      <div class="posts">
        ${posts.map((p) => `<a class="post-card rise" href="#/blog/${p.slug}">
          <span class="post-date">${longDate(p.date)}</span>
          <span class="post-main">
            <span class="post-title">${esc(p.title)}</span>
            <span class="post-dek">${esc(p.dek)}</span>
            <span class="post-tags">${p.tickers.map((t) => `<span class="ttag">${t}</span>`).join("")}<span class="post-rt">${readTime(p)} min read</span></span>
          </span>
        </a>`).join("")}
      </div>
      <footer class="foot"><span>Tradedesk by <b>${D.author}</b>. Not investment advice.</span></footer>
    </div>`;
  }

  function postHTML(slug) {
    const p = D.posts.find((x) => x.slug === slug);
    if (!p) return blogHTML();
    const sorted = [...D.posts].sort((a, b) => b.date.localeCompare(a.date));
    const i = sorted.indexOf(p), older = sorted[i + 1], newer = sorted[i - 1];
    const mentioned = p.tickers.map((t) => RUNS.find((r) => r.t === t)).filter(Boolean);
    return `<div class="page">
      <a class="back rise" href="#/blog"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>All posts</a>
      <article class="article">
        <header class="rise">
          <h1 class="article-title">${esc(p.title)}</h1>
          <p class="article-meta">${D.author} · ${longDate(p.date)} · ${readTime(p)} min read</p>
          <p class="article-dek">${esc(p.dek)}</p>
        </header>
        <div class="article-body rise">
          ${p.body.map((b) => b.startsWith("## ") ? `<h2>${esc(b.slice(3))}</h2>` : `<p>${esc(b)}</p>`).join("")}
        </div>
        <aside class="mentioned rise">
          <p class="label">Stocks in this post</p>
          <div class="m-list">${mentioned.map((r) => `<a class="m-row c-${r.action}" href="#/desk/${r.t}">
            <span class="tk-sym">${r.t}</span>
            <span class="m-name">${esc(r.name)}</span>
            ${actionTag(r.action)}
            <span class="px-main">${r.target != null ? `${money(r.spot)}<span class="arr">→</span>${money(r.target)}` : money(r.spot)}</span>
          </a>`).join("")}</div>
        </aside>
        <nav class="pager rise">
          ${older ? `<a href="#/blog/${older.slug}"><span class="label">Older</span><span>${esc(older.title)}</span></a>` : "<span></span>"}
          ${newer ? `<a class="r" href="#/blog/${newer.slug}"><span class="label">Newer</span><span>${esc(newer.title)}</span></a>` : "<span></span>"}
        </nav>
      </article>
      <footer class="foot"><span>Tradedesk by <b>${D.author}</b>. Not investment advice.</span></footer>
    </div>`;
  }

  // ---------- motion ----------
  const EASE = "cubic-bezier(.16,1,.3,1)";
  function rise(els, { base = 0, step = 70 } = {}) {
    els.forEach((el, i) => {
      if (reduce) { el.style.opacity = 1; return; }
      el.animate(
        [{ opacity: 0, transform: "translateY(14px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
        { duration: 1000, delay: base + i * step, easing: EASE, fill: "both" }
      ).finished.then(() => { el.style.opacity = 1; el.getAnimations().forEach((a) => a.cancel()); }).catch(() => {});
    });
  }
  function riseRows(base = 0) {
    if (reduce) return;
    $$(".thead, .row", $("#table")).slice(0, 26).forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(8px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
        { duration: 760, delay: base + i * 22, easing: EASE, fill: "backwards" }));
  }

  // ---------- router ----------
  let current = null;
  function route() {
    const [, view = "desk", arg] = (location.hash || "#/desk").split("/");
    const v = ["desk", "catalysts", "macro", "method", "blog"].includes(view) ? view : "desk";
    $$(".rail-nav a").forEach((a) => a.dataset.route === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    const post = v === "blog" && arg && D.posts.find((p) => p.slug === arg);
    document.title = (post ? post.title : { desk: "Trade desk", catalysts: "Upcoming events", macro: arg === "briefing" ? "Daily briefing" : "Macro", method: "Method", blog: "Blog" }[v]) + " · Tradedesk by Eric Hong";

    if (v === "desk" && current === "desk" && arg) { focusTicker(arg.toUpperCase()); return; }
    const key = v === "blog" ? "blog/" + (post ? post.slug : "") : v === "macro" ? "macro/" + (arg === "briefing" ? "briefing" : "") : v;
    if (key !== current) {
      main.innerHTML = v === "desk" ? deskHTML() : v === "catalysts" ? catalystsHTML() : v === "blog" ? (post ? postHTML(post.slug) : blogHTML()) : v === "macro" ? (arg === "briefing" ? briefingHTML() : macroHTML()) : methodHTML();
      current = key;
      window.scrollTo(0, 0);
      rise($$(".rise", main));
      if (v === "desk") riseRows(380);
    }
    if (v === "desk" && arg) focusTicker(arg.toUpperCase());
  }

  function focusTicker(t) {
    const r = RUNS.find((x) => x.t === t);
    if (!r) return;
    let needs = false;
    if (!inView(r)) { state.view = "all"; needs = true; }
    if (!filtered().includes(r)) { state.action = "all"; state.conv7 = false; state.hasEntry = false; state.sectors.clear(); needs = true; }
    if (needs) refreshDesk({ animateRows: false });
    const row = $(`.row[data-t="${t}"]`);
    if (!row) return;
    if (row.dataset.open !== "true") toggleRow(t, true);
    setTimeout(() => {
      const y = row.getBoundingClientRect().top + window.scrollY - ($("#toolbar")?.offsetHeight || 0) - 70;
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      row.querySelector(".row-line").focus({ preventScroll: true });
    }, 60);
  }

  // ---------- popovers ----------
  function closePops() { $$(".pop-panel").forEach((p) => p.remove()); }
  function openPop(btn, kind) {
    const host = btn.parentElement;
    if (host.querySelector(".pop-panel")) { closePops(); return; }
    closePops();
    const panel = document.createElement("div");
    panel.className = "pop-panel" + (kind === "sort" ? " right" : "");
    panel.setAttribute("role", "menu");
    if (kind === "sector") {
      const pool = RUNS.filter(inView);
      const secs = [...new Set(pool.map((r) => r.sector))].sort();
      panel.innerHTML = secs.map((s) => `<button class="pop-item" type="button" role="menuitemcheckbox" data-sector="${esc(s)}" aria-checked="${state.sectors.has(s)}"><span class="box"></span>${esc(s)}<span class="num">${pool.filter((r) => r.sector === s).length}</span></button>`).join("") +
        `<div class="pop-sep"></div><div class="pop-foot"><button type="button" data-sector-clear>Clear</button><button type="button" data-close-pop>Done</button></div>`;
    } else {
      panel.innerHTML = Object.entries(SORTS).map(([k, s]) => `<button class="pop-item radio" type="button" role="menuitemradio" data-sort="${k}" aria-checked="${state.sort === k}">${s.label}</button>`).join("");
    }
    host.appendChild(panel);
    panel.querySelector(".pop-item")?.focus();
  }

  // ---------- palette ----------
  const pal = $("#palette"), palQ = $("#palette-q"), palList = $("#palette-list");
  let palSel = 0, palItems = [];
  function openPalette() {
    pal.hidden = false;
    palQ.value = "";
    renderPalette();
    requestAnimationFrame(() => palQ.focus());
  }
  function closePalette() { pal.hidden = true; }
  function renderPalette() {
    const q = palQ.value.trim().toLowerCase();
    palItems = RUNS.filter((r) => !q || r.t.toLowerCase().startsWith(q) || r.name.toLowerCase().includes(q) || r.sector.toLowerCase().includes(q))
      .sort((a, b) => (q && a.t.toLowerCase().startsWith(q) ? -1 : 0) - (q && b.t.toLowerCase().startsWith(q) ? -1 : 0) || a.t.localeCompare(b.t));
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    palList.innerHTML = palItems.length
      ? palItems.map((r, i) => `<li role="option" data-t="${r.t}" aria-selected="${i === palSel}"><span class="tk-sym">${r.t}</span><span class="nm">${esc(r.name)}<small>${esc(r.sector)}</small></span>${actionTag(r.action)}</li>`).join("")
      : `<div class="palette-empty">No run for “${esc(palQ.value)}”.</div>`;
  }
  function pickPalette(t) { closePalette(); location.hash = `#/desk/${t}`; if (current === "desk") focusTicker(t); }
  palQ.addEventListener("input", () => { palSel = 0; renderPalette(); });
  palQ.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      palSel = (palSel + (e.key === "ArrowDown" ? 1 : -1) + palItems.length) % Math.max(1, palItems.length);
      renderPalette();
      palList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && palItems[palSel]) pickPalette(palItems[palSel].t);
  });
  palList.addEventListener("click", (e) => { const li = e.target.closest("li[data-t]"); if (li) pickPalette(li.dataset.t); });
  palList.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li[data-t]"); if (!li) return;
    const i = palItems.findIndex((r) => r.t === li.dataset.t);
    if (i !== palSel) { palSel = i; $$("li", palList).forEach((x, j) => x.setAttribute("aria-selected", j === i)); }
  });

  // ---------- tooltip ----------
  const tipEl = $("#tip");
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (!t) { tipEl.hidden = true; return; }
    const [head, ...rest] = t.dataset.tip.split(" · ");
    tipEl.innerHTML = `<b>${esc(head)}</b>${rest.length ? ` <span class="t">·</span> ${rest.map(esc).join(' <span class="t">·</span> ')}` : ""}`;
    const b = t.getBoundingClientRect();
    tipEl.style.left = Math.max(80, Math.min(innerWidth - 80, b.left + b.width / 2)) + "px";
    tipEl.style.top = b.top + "px";
    tipEl.hidden = false;
  });
  window.addEventListener("scroll", () => (tipEl.hidden = true), { passive: true });

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, [data-go]");
    if (!e.target.closest(".pop")) closePops();
    if (!el) return;
    const d = el.dataset;

    if (el.matches(".row-line")) return toggleRow(el.closest(".row").dataset.t);
    if (d.view) { state.view = d.view; state.sectors.clear(); return refreshDesk(); }
    if (d.action) { state.action = d.action; return refreshDesk(); }
    if (d.toggle) { state[d.toggle] = !state[d.toggle]; return refreshDesk(); }
    if (d.pop) return openPop(el, d.pop);
    if (d.sector) {
      state.sectors.has(d.sector) ? state.sectors.delete(d.sector) : state.sectors.add(d.sector);
      el.setAttribute("aria-checked", state.sectors.has(d.sector));
      $("#table").innerHTML = tableHTML();
      const chip = $('[data-pop="sector"]');
      const lbl = state.sectors.size === 0 ? "All sectors" : state.sectors.size === 1 ? [...state.sectors][0] : `${state.sectors.size} sectors`;
      chip.firstChild.textContent = lbl;
      chip.setAttribute("aria-pressed", state.sectors.size > 0);
      $(".count").innerHTML = `<b>${filtered().length}</b> of ${RUNS.filter(inView).length}`;
      return;
    }
    if ("sectorClear" in d) { state.sectors.clear(); closePops(); return refreshDesk(); }
    if ("closePop" in d) return closePops();
    if (d.sort) { state.sort = d.sort; closePops(); return refreshDesk(); }
    if ("reset" in d) { state.action = "all"; state.conv7 = state.hasEntry = false; state.sectors.clear(); return refreshDesk(); }
    if (d.copy) {
      const url = location.href.split("#")[0] + "#/desk/" + d.copy;
      navigator.clipboard?.writeText(url).then(() => {
        const txt = [...el.childNodes].find((n) => n.nodeType === 3);
        txt.textContent = "Copied"; setTimeout(() => (txt.textContent = "Copy link"), 1400);
      });
      return;
    }
    if (d.go) { location.hash = `#/desk/${d.go}`; return; }
    if ("openSearch" in d) return openPalette();
    if ("closeSearch" in d) return closePalette();
  });

  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches?.("input, textarea");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); return; }
    if (e.key === "Escape") { if (!pal.hidden) closePalette(); closePops(); return; }
    if (typing || !pal.hidden) return;
    if (e.key === "/") { e.preventDefault(); openPalette(); return; }
    if ((e.key === "j" || e.key === "k") && current === "desk") {
      const lines = $$(".row-line");
      if (!lines.length) return;
      const i = lines.indexOf(document.activeElement);
      const n = i < 0 ? 0 : Math.max(0, Math.min(lines.length - 1, i + (e.key === "j" ? 1 : -1)));
      lines[n].focus();
      lines[n].scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
  });

  $("#theme-toggle").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("td-theme", t); } catch {}
  });
  $("#rail-collapse").addEventListener("click", () => {
    const h = document.documentElement, c = h.dataset.rail === "collapsed";
    c ? delete h.dataset.rail : (h.dataset.rail = "collapsed");
    try { localStorage.setItem("td-rail", c ? "0" : "1"); } catch {}
  });

  window.addEventListener("hashchange", route);
  rise($$(".rail > *"), { step: 60 });
  route();
})();
