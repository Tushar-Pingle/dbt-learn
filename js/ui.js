/* ui.js — shared rendering helpers, icons, toasts, modal, topbar, content blocks. */
window.DBT = window.DBT || {};

DBT.ui = (function () {
  const state = DBT.state;

  /* ---------------- icons (inline SVG, stroke unless noted) ---------------- */
  const P = {
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    shieldCheck: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4",
    check: "M20 6 9 17l-5-5",
    x: "M18 6 6 18|M6 6l12 12",
    lock: "M7 11V7a5 5 0 0 1 10 0v4|rect:3,11,18,10,2",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z#",
    zap: "M13 2 3 14h7l-1 8 10-12h-7z#",
    award: "circle:12,8,6|M8.21 13.89 7 23l5-3 5 3-1.21-9.12",
    rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z|M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z|M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0|M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
    flask: "M9 3h6|M10 3v6l-5.6 9.66A1 1 0 0 0 5.26 20h13.48a1 1 0 0 0 .86-1.34L14 9V3",
    database: "ellipse:12,5,9,3|M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5|M3 12c0 1.66 4 3 9 3s9-1.34 9-3",
    gitBranch: "circle:18,6,3|circle:6,6,3|circle:6,18,3|M6 9v6a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6",
    layers: "M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5",
    package: "M16.5 9.4 7.5 4.21|M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96 12 12.01l8.73-5.05|M12 22.08V12",
    clock: "circle:12,12,10|M12 6v6l4 2",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|circle:9,7,4|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
    calendar: "rect:3,4,18,18,2|M16 2v4|M8 2v4|M3 10h18",
    mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z|circle:12,10,3",
    target: "circle:12,12,10|circle:12,12,6|circle:12,12,2",
    key: "circle:8,15,5|M13.5 10.5 21 3|M17 7l2 2|M15 9l2 2",
    info: "circle:12,12,10|M12 16v-4|M12 8h.01",
    alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
    octagon: "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z|M12 8v4|M12 16h.01",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    code: "M16 18l6-6-6-6|M8 6l-6 6 6 6",
    play: "M6 3l14 9-14 9V3z#",
    refresh: "M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    sun: "circle:12,12,4|M12 2v2|M12 20v2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M2 12h2|M20 12h2|M4.9 19.1l1.4-1.4|M17.7 6.3l1.4-1.4",
    moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    sparkles: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z|M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
    sliders: "M4 21v-7|M4 10V3|M12 21v-9|M12 8V3|M20 21v-5|M20 12V3|M1 14h6|M9 8h6|M17 16h6",
    chevronRight: "M9 18l6-6-6-6",
    arrowRight: "M5 12h14|M12 5l7 7-7 7",
    arrowLeft: "M19 12H5|M12 19l-7-7 7-7",
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10",
    listChecks: "M11 5h10|M11 12h10|M11 19h10|M3 6l1.4 1.4L7.5 4.3|M3 13l1.4 1.4L7.5 11.3|M3 20l1.4 1.4L7.5 18.3",
    fileCheck: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M9 15l2 2 4-4",
    target2: "circle:12,12,9|circle:12,12,4|M12 3v3|M12 18v3|M3 12h3|M18 12h3",
    grad: "M22 10 12 5 2 10l10 5 10-5z|M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5|M22 10v6",
    branchMerge: "circle:6,6,3|circle:6,18,3|circle:18,9,3|M6 9v6|M18 12a9 9 0 0 1-9 9",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z|circle:12,12,3",
    beaker: "M4.5 3h15|M6 3v6.5L3.2 18A2 2 0 0 0 5 21h14a2 2 0 0 0 1.8-3L18 9.5V3|M6 14h12",
  };

  function icon(name, extraClass) {
    const raw = P[name] || P.info;
    let fill = "none";
    let d = raw;
    if (d.endsWith("#")) { fill = "currentColor"; d = d.slice(0, -1); }
    const parts = d.split("|").map((seg) => {
      if (seg.startsWith("rect:")) { const [x, y, w, h, r] = seg.slice(5).split(","); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r || 0}"/>`; }
      if (seg.startsWith("circle:")) { const [cx, cy, rr] = seg.slice(7).split(","); return `<circle cx="${cx}" cy="${cy}" r="${rr}"/>`; }
      if (seg.startsWith("ellipse:")) { const [cx, cy, rx, ry] = seg.slice(8).split(","); return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`; }
      return `<path d="${seg}"/>`;
    }).join("");
    const cls = "ic" + (extraClass ? " " + extraClass : "");
    return `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${parts}</svg>`;
  }

  /* ---------------- DOM helpers ---------------- */
  function frag(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  /* ---------------- code highlighting ---------------- */
  function highlight(code, lang) {
    const L = (window.Prism && Prism.languages && Prism.languages[lang]) ? lang : null;
    if (L) return Prism.highlight(code, Prism.languages[L], L);
    return esc(code);
  }
  const DOTS = { yaml: "#FF694A", sql: "#34C77B", bash: "#FFC24B", shell: "#FFC24B", text: "#a79f93", ini: "#5AA9E6" };
  function codeblock(o) {
    const lang = o.lang || "text";
    const dot = DOTS[lang] || "#a79f93";
    const head = (o.file || o.showHead !== false)
      ? `<div class="cb-head"><span class="cb-dot" style="background:${dot}"></span>${o.file ? `<span class="cb-file">${esc(o.file)}</span>` : ""}<span class="cb-lang">${esc(lang)}</span></div>`
      : "";
    return `<div class="codeblock">${head}<pre><code class="language-${lang}">${highlight(o.code, lang)}</code></pre></div>${o.caption ? `<div class="cb-caption">${o.caption}</div>` : ""}`;
  }

  /* ---------------- progress ring ---------------- */
  function ring(frac, opts) {
    opts = opts || {};
    const r = opts.r || 18;
    const circ = 2 * Math.PI * r;
    const done = frac >= 1;
    const label = done ? icon("check") : Math.round(frac * 100) + "%";
    const color = opts.color ? ` style="--ch-color:${opts.color}"` : "";
    return `<div class="ring${done ? " done" : ""}"${color} style="--p:${frac};--circ:${circ}">
      <svg viewBox="0 0 44 44"><circle class="track" cx="22" cy="22" r="${r}"/><circle class="fill" cx="22" cy="22" r="${r}" style="--circ:${circ}"/></svg>
      <span class="lbl">${label}</span></div>`;
  }
  function progressLine(frac) {
    return `<div class="progress-line"><i style="width:${Math.round(frac * 100)}%"></i></div>`;
  }

  /* ---------------- content block renderer (Learn / Example) ---------------- */
  function renderBlocks(blocks) {
    return (blocks || []).map(renderBlock).join("");
  }
  function renderBlock(b) {
    switch (b.t) {
      case "lead": return `<p class="lead">${b.html}</p>`;
      case "p": return `<p>${b.html}</p>`;
      case "h": return `<h3>${esc(b.text)}</h3>`;
      case "h2": return `<h2>${esc(b.text)}</h2>`;
      case "list": {
        const tag = b.ordered ? "ol" : "ul";
        return `<${tag}>${b.items.map((i) => `<li>${i}</li>`).join("")}</${tag}>`;
      }
      case "callout": {
        const v = b.variant || "info";
        const ic = { tip: "check", warn: "alert", danger: "octagon", info: "info", key: "key" }[v] || "info";
        return `<div class="callout ${v}"><span class="cl-ico">${icon(ic)}</span><div>${b.title ? `<h4>${esc(b.title)}</h4>` : ""}<p>${b.html}</p></div></div>`;
      }
      case "code": return codeblock(b);
      case "apply": return renderApply(b);
      case "compare": {
        const col = (c, cls) => `<div class="col ${cls}"><h5>${icon(cls === "good" ? "check" : "x")}${esc(c.title)}</h5><ul>${c.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`;
        return `<div class="compare">${col(b.good, "good")}${col(b.bad, "bad")}</div>`;
      }
      case "table": {
        const head = `<tr>${b.head.map((h) => `<th>${h}</th>`).join("")}</tr>`;
        const rows = b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
        return `<div class="rtable-wrap"><table class="mini-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>${b.note ? `<div class="cb-caption">${b.note}</div>` : ""}`;
      }
      case "divider": return `<div class="rule" style="height:1px;background:var(--border);margin:6px 0"></div>`;
      default: return "";
    }
  }
  function renderApply(b) {
    const cell = (lbl, ic, html) => `<div class="apply-cell"><h5>${icon(ic)}${lbl}</h5><p>${html}</p></div>`;
    return `<div class="apply-card"><div class="eyebrow">${icon("target")} When &amp; where to apply</div>
      <div class="apply-grid">
        ${cell("Who", "users", b.who)}
        ${cell("When", "clock", b.when)}
        ${cell("Where", "mapPin", b.where)}
      </div></div>`;
  }

  /* ---------------- lightweight code editor (textarea + line gutter) ---------------- */
  function makeEditor(host, o) {
    o = o || {};
    host.classList.add("editor");
    host.innerHTML = `<div class="gutter" aria-hidden="true">1</div><textarea spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" wrap="off" aria-label="${esc(o.label || "code editor")}"></textarea>`;
    const gutter = host.querySelector(".gutter");
    const ta = host.querySelector("textarea");
    ta.value = o.value || "";
    if (o.placeholder) ta.placeholder = o.placeholder;
    function grow() {
      ta.style.height = "auto";
      ta.style.height = Math.max(ta.scrollHeight, 180) + "px";
      const n = ta.value.split("\n").length;
      let s = ""; for (let i = 1; i <= n; i++) s += i + "\n";
      gutter.textContent = s;
    }
    ta.addEventListener("input", () => { grow(); if (o.onChange) o.onChange(ta.value); });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
        grow();
      }
    });
    setTimeout(grow, 0);
    return {
      get value() { return ta.value; },
      set value(v) { ta.value = v; grow(); },
      textarea: ta,
      focus() { ta.focus(); },
      reset(v) { ta.value = v; grow(); },
    };
  }

  /* ---------------- toast ---------------- */
  function toast(o) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const kind = o.kind || "info";
    const ic = o.icon || (kind === "xp" ? "zap" : kind === "badge" ? "award" : "info");
    const node = document.createElement("div");
    node.className = "toast " + kind;
    node.innerHTML = `<div class="t-ico">${icon(ic)}</div><div><h5>${esc(o.title)}</h5>${o.msg ? `<p>${esc(o.msg)}</p>` : ""}</div>`;
    root.appendChild(node);
    setTimeout(() => { node.classList.add("out"); setTimeout(() => node.remove(), 320); }, o.ttl || 2600);
  }

  /* ---------------- confetti burst ---------------- */
  function burst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#FF694A", "#FFC24B", "#34C77B", "#5AA9E6", "#d9a8ff"];
    const wrap = document.createElement("div");
    wrap.className = "burst";
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("i");
      const ang = Math.random() * Math.PI - Math.PI / 2;
      const dist = 120 + Math.random() * 220;
      p.style.background = colors[i % colors.length];
      p.style.left = 50 + (Math.cos(ang) * (Math.random() - 0.5) * 60) + "%";
      p.style.setProperty("--x", Math.cos(ang) * dist + "px");
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      p.style.animation = `fall ${0.9 + Math.random() * 0.8}s cubic-bezier(.2,.6,.4,1) ${Math.random() * 0.15}s forwards`;
      p.style.left = 45 + Math.random() * 10 + "%";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 2000);
  }

  /* ---------------- modal ---------------- */
  function modal(o) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `<div class="modal-scrim"><div class="modal" role="dialog" aria-modal="true">
      ${o.medal ? `<div class="m-medal">${o.medal}</div>` : ""}
      <h2>${esc(o.title)}</h2>${o.html ? `<div>${o.html}</div>` : o.text ? `<p>${esc(o.text)}</p>` : ""}
      <div class="m-actions">${(o.actions || []).map((a, i) => `<button class="btn ${a.primary ? "btn-primary" : "btn-ghost"}" data-mi="${i}">${esc(a.label)}</button>`).join("")}</div>
    </div></div>`;
    const close = () => { root.innerHTML = ""; };
    (o.actions || []).forEach((a, i) => {
      root.querySelector(`[data-mi="${i}"]`).addEventListener("click", () => { close(); if (a.onClick) a.onClick(); });
    });
    root.querySelector(".modal-scrim").addEventListener("click", (e) => { if (e.target.classList.contains("modal-scrim") && o.dismissable !== false) close(); });
    return close;
  }

  /* ---------------- award helper: show XP + badge feedback ---------------- */
  function awardStage(res, label) {
    if (res && res.xp > 0) toast({ kind: "xp", title: "+" + res.xp + " XP", msg: label || "Nice work" });
  }
  function celebrateBadge(b) {
    toast({ kind: "badge", title: "Badge earned", msg: b.name, ttl: 3200 });
  }

  /* ---------------- topbar ---------------- */
  function renderTopbar() {
    const bar = document.getElementById("topbar");
    if (!bar) return;
    const theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    bar.innerHTML = `
      <button class="brand" data-nav="#/" aria-label="Home">
        <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#141312"/><path d="M8 16h6m4 0h6" stroke="#FF694A" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="16" r="3.6" fill="#FF694A"/><circle cx="7" cy="16" r="2.4" fill="#FFC24B"/><circle cx="25" cy="16" r="2.4" fill="#34C77B"/></svg>
        <span><span class="brand-name">dbt <b>Academy</b></span><br><span class="brand-tag">governance · testing · ci/cd</span></span>
      </button>
      <div class="topbar-spacer"></div>
      <div class="top-stat top-xp" title="Experience points">${icon("zap")}<span class="top-xp-num">${state.getXP()}</span><span class="hide-sm">XP</span></div>
      <button class="icon-btn" data-act="theme" aria-label="Toggle light/dark theme" title="Toggle theme">${icon(theme === "light" ? "moon" : "sun")}</button>
      <button class="icon-btn" data-act="reset" aria-label="Reset progress" title="Reset progress">${icon("refresh")}</button>`;

    bar.querySelector(".brand").addEventListener("click", () => { location.hash = "#/"; });
    bar.querySelector('[data-act="theme"]').addEventListener("click", toggleTheme);
    bar.querySelector('[data-act="reset"]').addEventListener("click", confirmReset);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    state.setTheme(next);
    renderTopbar();
  }
  function confirmReset() {
    modal({
      title: "Reset all progress?",
      text: "This clears your XP, badges, and completed stages on this device. Your theme choice is kept. This can't be undone.",
      actions: [
        { label: "Cancel" },
        { label: "Reset everything", primary: true, onClick: () => { const t = state.getTheme(); state.reset(); if (t) state.setTheme(t); location.hash = "#/"; location.reload(); } },
      ],
    });
  }

  // keep topbar XP live
  state.on(() => { const n = document.querySelector(".top-xp-num"); if (n) n.textContent = state.getXP(); });

  return {
    icon, frag, $, $$, esc, highlight, codeblock, ring, progressLine,
    renderBlocks, renderBlock, renderApply, toast, burst, modal, makeEditor,
    awardStage, celebrateBadge, renderTopbar,
  };
})();
