/* quiz.js — interactive check engine. DBT.quiz.renderChecks(container, checks, opts) */
window.DBT = window.DBT || {};

DBT.quiz = (function () {
  const ui = DBT.ui, icon = ui.icon, esc = ui.esc;

  const KIND_LABEL = {
    mcq: "Multiple choice", multi: "Select all that apply", match: "Match the pairs",
    fill: "Type your answer", predict: "Predict the result", refcheck: "Access check",
  };

  function renderChecks(container, checks, opts) {
    opts = opts || {};
    checks = checks || [];
    let idx = 0;

    if (opts.alreadyDone && !opts._review) {
      container.innerHTML = donePanel(checks.length, opts.practice);
      container.querySelector("[data-continue]").addEventListener("click", opts.onComplete);
      const rv = container.querySelector("[data-review]");
      if (rv) rv.addEventListener("click", () => renderChecks(container, checks, Object.assign({}, opts, { _review: true, alreadyDone: false })));
      return;
    }

    function render() {
      const q = checks[idx];
      container.innerHTML = `
      <div class="check-shell">
        <div class="check-progress">
          <div class="check-dots">${checks.map((_, i) => `<span class="check-dot ${i < idx ? "done" : i === idx ? "active" : ""}"></span>`).join("")}</div>
          <span class="check-count">${idx + 1} / ${checks.length}</span>
        </div>
        <div class="q-card">
          <span class="chip q-kind coral">${icon("listChecks")} ${KIND_LABEL[q.kind] || "Question"}</span>
          <div class="q-stem">${q.q}</div>
          ${q.scenario ? `<div class="q-scenario">${renderScenario(q.scenario)}</div>` : ""}
          <div id="q-interactive"></div>
          <div class="q-feedback" id="q-fb"></div>
          <div class="q-actions" id="q-actions"></div>
        </div>
      </div>`;
      if (window.Prism) Prism.highlightAllUnder(container);
      const host = container.querySelector("#q-interactive");
      const render_by = { mcq: renderMcq, predict: renderMcq, refcheck: renderMcq, multi: renderMulti, match: renderMatch, fill: renderFill };
      (render_by[q.kind] || renderMcq)(host, q);
    }

    function feedback(ok, title, why) {
      const fb = container.querySelector("#q-fb");
      fb.className = "q-feedback show " + (ok ? "ok" : "no");
      fb.innerHTML = `<span class="fb-ico">${icon(ok ? "check" : "x")}</span><div><h4>${esc(title || (ok ? "Correct!" : "Not quite"))}</h4>${why ? `<p>${why}</p>` : ""}</div>`;
    }
    function clearFeedback() { const fb = container.querySelector("#q-fb"); fb.className = "q-feedback"; fb.innerHTML = ""; }

    function showNext() {
      const a = container.querySelector("#q-actions");
      const last = idx === checks.length - 1;
      a.innerHTML = `<button class="btn btn-primary" data-next>${last ? "Finish check " + "" : "Next question"} ${icon("arrowRight")}</button>`;
      a.querySelector("[data-next]").addEventListener("click", () => {
        if (last) finish(); else { idx++; render(); }
      });
    }

    function finish() {
      container.innerHTML = donePanel(checks.length, opts.practice, true);
      container.querySelector("[data-continue]").addEventListener("click", opts.onComplete);
      ui.burst();
    }

    /* ---- MCQ / predict / refcheck (single correct, retry until right) ---- */
    function renderMcq(host, q) {
      const keys = "ABCDEFGH";
      let locked = false;
      host.innerHTML = `<div class="q-options">${q.options.map((o, i) =>
        `<button class="opt" data-i="${i}"><span class="opt-key">${keys[i]}</span><span class="opt-txt">${o.text}</span><span class="opt-mark"></span></button>`).join("")}</div>`;
      ui.$$(".opt", host).forEach((btn) => btn.addEventListener("click", () => {
        if (locked) return;
        const i = +btn.getAttribute("data-i");
        const o = q.options[i];
        if (o.correct) {
          locked = true;
          btn.classList.add("correct"); btn.querySelector(".opt-mark").innerHTML = icon("check");
          ui.$$(".opt", host).forEach((b) => b.setAttribute("disabled", ""));
          feedback(true, q.correctTitle || "Correct!", o.why || q.explain);
          showNext();
        } else {
          btn.classList.add("wrong"); btn.setAttribute("disabled", ""); btn.querySelector(".opt-mark").innerHTML = icon("x");
          feedback(false, "Try again", o.why || "That's not it — read the options again.");
        }
      }));
    }

    /* ---- multi-select (exact set) ---- */
    function renderMulti(host, q) {
      const keys = "ABCDEFGH";
      const chosen = new Set();
      let solved = false;
      host.innerHTML = `<div class="q-options">${q.options.map((o, i) =>
        `<button class="opt" data-i="${i}"><span class="opt-key">${keys[i]}</span><span class="opt-txt">${o.text}</span><span class="opt-mark"></span></button>`).join("")}</div>
        <div class="q-actions"><button class="btn btn-primary btn-sm" data-check>Check answer</button></div>`;
      ui.$$(".opt", host).forEach((btn) => btn.addEventListener("click", () => {
        if (solved) return;
        const i = +btn.getAttribute("data-i");
        if (chosen.has(i)) { chosen.delete(i); btn.classList.remove("selected"); }
        else { chosen.add(i); btn.classList.add("selected"); }
      }));
      host.querySelector("[data-check]").addEventListener("click", () => {
        if (solved) return;
        const correctSet = new Set(q.options.map((o, i) => o.correct ? i : -1).filter((x) => x >= 0));
        const ok = chosen.size === correctSet.size && [...chosen].every((i) => correctSet.has(i));
        if (ok) {
          solved = true;
          ui.$$(".opt", host).forEach((b, i) => { b.setAttribute("disabled", ""); if (correctSet.has(i)) { b.classList.add("correct"); b.querySelector(".opt-mark").innerHTML = icon("check"); } });
          host.querySelector("[data-check]").remove();
          feedback(true, "Exactly right", q.explain);
          showNext();
        } else {
          ui.$$(".opt", host).forEach((b, i) => { if (chosen.has(i) && !correctSet.has(i)) b.classList.add("wrong"); });
          feedback(false, "Not the full set", "Some picks are off. Selected wrong ones are marked red — adjust and check again.");
          setTimeout(() => ui.$$(".opt.wrong", host).forEach((b) => b.classList.remove("wrong")), 900);
        }
      });
    }

    /* ---- match pairs (click left, then right) ---- */
    function renderMatch(host, q) {
      const left = q.pairs.map((p, i) => ({ i, text: p.left, tag: p.leftTag }));
      const right = shuffle(q.pairs.map((p, i) => ({ i, text: p.right, tag: p.rightTag })));
      let picked = null; let matched = 0;
      host.innerHTML = `<div class="match">
        <div class="match-src">${left.map((l) => `<button class="match-item" data-side="L" data-i="${l.i}">${l.tag ? `<span class="m-tag">${esc(l.tag)}</span><br>` : ""}${l.text}</button>`).join("")}</div>
        <div style="display:flex;flex-direction:column;justify-content:center;color:var(--text-faint)">${left.map(() => icon("arrowRight")).join("")}</div>
        <div class="match-dst">${right.map((r) => `<button class="match-item" data-side="R" data-i="${r.i}">${r.tag ? `<span class="m-tag">${esc(r.tag)}</span><br>` : ""}${r.text}</button>`).join("")}</div>
      </div>`;
      function clearPick() { if (picked) picked.el.classList.remove("picked"); picked = null; }
      ui.$$(".match-item", host).forEach((el) => el.addEventListener("click", () => {
        if (el.classList.contains("matched")) return;
        const side = el.getAttribute("data-side"), i = +el.getAttribute("data-i");
        if (!picked) { picked = { el, side, i }; el.classList.add("picked"); return; }
        if (picked.side === side) { clearPick(); picked = { el, side, i }; el.classList.add("picked"); return; }
        // attempt match
        if (picked.i === i) {
          el.classList.add("matched"); picked.el.classList.add("matched"); picked.el.classList.remove("picked");
          picked = null; matched++;
          if (matched === q.pairs.length) { feedback(true, "All matched!", q.explain); showNext(); }
        } else {
          const wrongEl = el, keepEl = picked.el;
          el.classList.add("wrong"); keepEl.classList.add("wrong");
          feedback(false, "Not a match", "Those two don't go together — try a different pairing.");
          setTimeout(() => { wrongEl.classList.remove("wrong"); keepEl.classList.remove("wrong", "picked"); }, 700);
          picked = null;
        }
      }));
    }

    /* ---- fill in ---- */
    function renderFill(host, q) {
      host.innerHTML = `<div class="fill-wrap">
        <input class="fill-input" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(q.placeholder || "Type here…")}" />
        ${q.hint ? `<div class="fill-hint">${icon("info")} ${q.hint}</div>` : ""}
        <div class="q-actions"><button class="btn btn-primary btn-sm" data-check>Check answer</button></div></div>`;
      const input = host.querySelector(".fill-input");
      let solved = false;
      const norm = (s) => String(s).toLowerCase().replace(/["'`]/g, "").replace(/\s+/g, " ").trim();
      const accept = [q.answer].concat(q.accept || []).map(norm);
      function check() {
        if (solved) return;
        const val = norm(input.value);
        if (val && accept.some((a) => a === val || (q.contains && val.indexOf(a) >= 0))) {
          solved = true; input.setAttribute("disabled", ""); host.querySelector("[data-check]").remove();
          feedback(true, "That's it", q.explain);
          showNext();
        } else {
          feedback(false, "Not yet", q.hintWrong || "Check spelling and try again.");
        }
      }
      host.querySelector("[data-check]").addEventListener("click", check);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      input.focus();
    }

    render();
  }

  /* ---------- scenario renderers ---------- */
  function renderScenario(sc) {
    if (sc.type === "code") return ui.codeblock({ code: sc.code, lang: sc.lang || "yaml", file: sc.file });
    if (sc.type === "html") return sc.html;
    if (sc.type === "note") return `<div class="callout ${sc.variant || "info"}"><span class="cl-ico">${icon("info")}</span><div><p>${sc.html}</p></div></div>`;
    if (sc.type === "models") return renderModelsScenario(sc);
    if (sc.type === "freshness") return renderFreshnessScenario(sc);
    return "";
  }

  function accessChip(a) {
    const map = { public: "pass", protected: "warn", private: "fail" };
    return `<span class="chip ${map[a] || ""}"><span class="chip-dot"></span>${esc(a)}</span>`;
  }
  function modelCard(m, label) {
    return `<div class="card" style="padding:12px 14px;flex:1;min-width:0">
      <div class="station-num">${esc(label)}</div>
      <div class="mono" style="font-weight:600;margin:3px 0 8px;color:var(--text)">${esc(m.name)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${m.group ? `<span class="chip">${icon("users")} ${esc(m.group)}</span>` : ""}${m.access ? accessChip(m.access) : ""}</div>
    </div>`;
  }
  function renderModelsScenario(sc) {
    return `<div style="display:flex;align-items:stretch;gap:12px;margin:6px 0">
      ${modelCard(sc.from, sc.fromLabel || "consumer (wants to ref)")}
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;color:var(--coral)"><span class="mono" style="font-size:.7rem;color:var(--text-faint)">ref()</span>${icon("arrowRight")}</div>
      ${modelCard(sc.to, sc.toLabel || "target model")}
    </div>${sc.samePkg === false ? `<div class="cb-caption">${icon("info")} These models live in <strong>different projects</strong>.</div>` : sc.sameProject === false ? "" : ""}`;
  }
  function renderFreshnessScenario(sc) {
    // sc: { lastLoaded: "8 hours ago", warn:"12 hours", error:"24 hours", gapHours, warnHours, errorHours }
    const g = sc.gapHours, w = sc.warnHours, e = sc.errorHours;
    const max = Math.max(e * 1.15, g * 1.1);
    const pct = (h) => Math.min(100, (h / max) * 100);
    return `<div class="card" style="padding:16px">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-dim);margin-bottom:8px" class="mono">
        <span>${icon("clock")} last row loaded <strong style="color:var(--text)">${esc(sc.lastLoaded)}</strong></span><span>now</span></div>
      <div style="position:relative;height:14px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden">
        <div style="position:absolute;inset:0 0 0 0;width:${pct(g)}%;background:linear-gradient(90deg,var(--pass),var(--warn) ${pct(w) / pct(g) * 100}%,var(--fail));opacity:.9"></div>
        <div style="position:absolute;top:0;bottom:0;left:${pct(w)}%;width:2px;background:var(--warn)"></div>
        <div style="position:absolute;top:0;bottom:0;left:${pct(e)}%;width:2px;background:var(--fail)"></div>
      </div>
      <div style="display:flex;gap:16px;margin-top:10px;font-size:.76rem" class="mono">
        <span class="chip warn"><span class="chip-dot"></span>warn_after: ${esc(sc.warn)}</span>
        <span class="chip fail"><span class="chip-dot"></span>error_after: ${esc(sc.error)}</span>
        <span style="margin-left:auto;color:var(--text-dim)">data age: <strong style="color:var(--text)">${esc(sc.age || sc.lastLoaded)}</strong></span>
      </div></div>`;
  }

  function donePanel(n, practice, justFinished) {
    return `<div class="stage-done">
      <div class="sd-medal">${icon(justFinished ? "award" : "check")}</div>
      <h2>${justFinished ? (practice ? "Practice cleared!" : "Check complete!") : (practice ? "Practice done" : "Check done")}</h2>
      <p>${justFinished ? `You answered all ${n} correctly.` : `You've already cleared these ${n} question${n > 1 ? "s" : ""}.`}</p>
      <div class="q-actions" style="justify-content:center;margin-top:22px">
        ${justFinished ? "" : `<button class="btn btn-ghost" data-review>${icon("refresh")} Review</button>`}
        <button class="btn btn-primary" data-continue>Continue ${icon("arrowRight")}</button>
      </div></div>`;
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  return { renderChecks };
})();
