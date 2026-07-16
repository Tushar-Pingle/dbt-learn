/* app.js — router + screens (home, chapter, level shell, capstone). Loaded last. */
window.DBT = window.DBT || {};

DBT.app = (function () {
  const ui = DBT.ui, state = DBT.state, icon = ui.icon, esc = ui.esc;
  const screen = () => document.getElementById("screen");

  function chapters() { return DBT.content.chapters; }
  function capstone() { return DBT.content.capstone; }
  function chapterById(id) { return chapters().find((c) => c.id === id); }
  function chapterIndex(id) { return chapters().findIndex((c) => c.id === id); }
  function levelById(ch, lvId) { return ch.levels.find((l) => l.id === lvId); }

  /* ------------- routing ------------- */
  function parseHash() {
    const h = (location.hash || "#/").replace(/^#/, "");
    const parts = h.split("/").filter(Boolean); // ["c","gov","1"]
    if (!parts.length) return { name: "home" };
    if (parts[0] === "capstone") return { name: "capstone" };
    if (parts[0] === "c") {
      if (parts.length === 2) return { name: "chapter", ch: parts[1] };
      if (parts.length >= 3) return { name: "level", ch: parts[1], lv: parts[2] };
    }
    return { name: "home" };
  }

  function navigate(hash) { location.hash = hash; }

  function route() {
    ui.renderTopbar();
    const r = parseHash();
    let html = "";
    try {
      if (r.name === "home") html = homeScreen();
      else if (r.name === "chapter") { const c = chapterById(r.ch); html = c ? chapterScreen(c) : homeScreen(); }
      else if (r.name === "capstone") html = capstoneGate();
      else if (r.name === "level") {
        const c = chapterById(r.ch); const lv = c && levelById(c, r.lv);
        if (!c || !lv) { navigate("#/"); return; }
        // gate: chapter + level must be unlocked
        if (!state.isChapterUnlocked(chapters(), chapterIndex(c.id))) { navigate("#/"); return; }
        const idx = c.levels.indexOf(lv);
        if (!state.isLevelUnlocked(c.id, c, idx)) { navigate("#/c/" + c.id); return; }
        mountLevel(c, lv);
        return; // mountLevel handles its own DOM
      }
    } catch (e) {
      console.error("route error", e);
      html = `<div class="card" style="padding:24px"><h2>Something went wrong</h2><p class="dim">${esc(e.message)}</p><a class="btn btn-primary" href="#/" style="margin-top:14px">Back to start</a></div>`;
    }
    screen().innerHTML = html;
    wireCommonNav(screen());
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    screen().focus({ preventScroll: true });
  }

  function wireCommonNav(root) {
    ui.$$("[data-nav]", root).forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); navigate(el.getAttribute("data-nav")); }));
  }

  /* ------------- HOME ------------- */
  function firstActionHash() {
    for (const c of chapters()) {
      const idx = chapterIndex(c.id);
      if (!state.isChapterUnlocked(chapters(), idx)) continue;
      for (let i = 0; i < c.levels.length; i++) {
        const lv = c.levels[i];
        if (!state.isLevelDone(c.id, lv) && state.isLevelUnlocked(c.id, c, i)) return "#/c/" + c.id + "/" + lv.id;
      }
    }
    if (state.chapterProgress(chapters()[chapters().length - 1]).complete) return "#/capstone";
    return "#/c/" + chapters()[0].id + "/" + chapters()[0].levels[0].id;
  }

  function homeScreen() {
    const overall = state.overallProgress(chapters());
    const started = overall.done > 0;
    const stations = chapters().map((c, i) => stationCard(c, i)).join("");
    const badges = allBadges().map(badgeChip).join("");

    return `
    <section class="hero reveal">
      <span class="eyebrow">${icon("sparkles")} Hands-on dbt · learn by doing</span>
      <h1>Ship data models like <span class="accent">a senior does.</span></h1>
      <p class="hero-sub">Three interactive chapters on the skills that separate a working dbt project from a trustworthy one — <strong>governance</strong>, <strong>testing &amp; freshness</strong>, and <strong>CI/CD</strong>. Concepts, when to use them, and a real in-browser sandbox to practice.</p>
      <div class="hero-cta">
        <a class="btn btn-primary btn-lg" data-nav="${firstActionHash()}">${icon(started ? "play" : "rocket")} ${started ? "Continue learning" : "Start the journey"}</a>
        <a class="btn btn-ghost btn-lg" href="#chapters-head">${icon("mapPin")} See the map</a>
      </div>
      <div class="hero-overall">${ui.progressLine(overall.frac)}
        <div class="progress-cap"><span>${overall.done} / ${overall.total} stages</span><span>${Math.round(overall.frac * 100)}% complete</span></div>
      </div>
    </section>

    <div class="feat-row reveal" style="animation-delay:.05s">
      <div class="feat"><h4>${icon("book")} Understand it</h4><p>Plain-English concepts with the "who, when &amp; where to apply" that docs skip.</p></div>
      <div class="feat"><h4>${icon("listChecks")} Check yourself</h4><p>Quick interactive questions after every concept — instant feedback, no guessing.</p></div>
      <div class="feat"><h4>${icon("beaker")} Practice for real</h4><p>Write real YAML &amp; SQL in a sandbox that runs in your browser and grades itself.</p></div>
    </div>

    <div class="section-head" id="chapters-head"><h2>Your learning path</h2><span class="rule"></span><span class="eyebrow">${chapters().length} chapters + capstone</span></div>
    <div class="pipeline">${stations}${capstoneStation()}</div>

    <div class="section-head"><h2>Trophy case</h2><span class="rule"></span><span class="eyebrow">${earnedCount()} / ${allBadges().length} earned</span></div>
    <div class="badge-shelf">${badges}</div>
    `;
  }

  function stationCard(c, i) {
    const unlocked = state.isChapterUnlocked(chapters(), i);
    const prog = state.chapterProgress(c);
    const nav = unlocked ? ` data-nav="#/c/${c.id}"` : "";
    return `
    <div class="station reveal" style="--ch-color:${c.color};animation-delay:${0.08 + i * 0.05}s">
      <button class="station-card${unlocked ? "" : " locked"}"${nav}${unlocked ? "" : " aria-disabled=\"true\""}>
        <div class="station-top">
          <div class="station-badge">${icon(c.icon)}</div>
          ${unlocked ? ui.ring(prog.frac, { color: c.color }) : `<span class="lock-pill">${icon("lock")}</span>`}
        </div>
        <div class="station-num">CHAPTER 0${c.order}</div>
        <h3>${esc(c.title)}</h3>
        <p class="station-desc">${esc(c.subtitle)}</p>
        <div class="station-foot">
          <span class="station-lvls">${c.levels.length} levels · 1 boss</span>
          ${unlocked ? `<span class="chip coral">${prog.complete ? "Review" : prog.done ? "Continue" : "Begin"} ${icon("chevronRight")}</span>` : `<span class="lock-pill">${icon("lock")} Finish ch.0${c.order - 1}</span>`}
        </div>
      </button>
    </div>`;
  }

  function capstoneStation() {
    const unlocked = state.chapterProgress(chapters()[chapters().length - 1]).complete;
    const done = state.isStageDone("capstone", "final", "capstone");
    return `
    <div class="station reveal" style="--ch-color:#FFC24B;animation-delay:.25s;grid-column:1/-1">
      <button class="station-card${unlocked ? "" : " locked"}"${unlocked ? ' data-nav="#/capstone"' : ""}>
        <div class="station-top">
          <div class="station-badge">${icon("grad")}</div>
          ${done ? `<span class="chip pass">${icon("check")} Graduated</span>` : unlocked ? `<span class="chip coral">Unlocked</span>` : `<span class="lock-pill">${icon("lock")}</span>`}
        </div>
        <div class="station-num">FINAL</div>
        <h3>Capstone — Ship a public model the right way</h3>
        <p class="station-desc">Bring all three skills together: contract &amp; document a model, test it, and wire up Slim CI. Earn your diploma.</p>
        <div class="station-foot">
          <span class="station-lvls">Combines governance · testing · ci/cd</span>
          ${unlocked ? `<span class="chip coral">Attempt capstone ${icon("chevronRight")}</span>` : `<span class="lock-pill">${icon("lock")} Finish all 3 chapters</span>`}
        </div>
      </button>
    </div>`;
  }

  /* ------------- badges ------------- */
  function allBadges() {
    const list = [];
    chapters().forEach((c) => list.push(c.badge));
    (DBT.content.specialBadges || []).forEach((b) => list.push(b));
    if (capstone() && capstone().badge) list.push(capstone().badge);
    return list;
  }
  function earnedCount() { return allBadges().filter((b) => state.hasBadge(b.id)).length; }
  function badgeChip(b) {
    const earned = state.hasBadge(b.id);
    return `<div class="badge${earned ? " earned" : ""}" title="${esc(b.hint || b.name)}"><div class="badge-medal">${icon(earned ? b.icon : "lock")}</div><div class="badge-name">${esc(b.name)}</div></div>`;
  }

  /* ------------- CHAPTER ------------- */
  function chapterScreen(c) {
    const prog = state.chapterProgress(c);
    const items = c.levels.map((lv, i) => levelRow(c, lv, i)).join("");
    return `
    <div class="crumb"><a data-nav="#/">${icon("home")} Home</a> ${icon("chevronRight")} <span>Chapter 0${c.order}</span></div>
    <div class="chapter-hero reveal" style="--ch-color:${c.color}">
      <div class="station-badge">${icon(c.icon)}</div>
      <div style="flex:1">
        <div class="station-num">CHAPTER 0${c.order} · ${c.levels.length} levels</div>
        <h1>${esc(c.title)}</h1>
        <p>${esc(c.blurb)}</p>
        <div class="hero-overall" style="margin:16px 0 0;max-width:340px">${ui.progressLine(prog.frac)}<div class="progress-cap"><span>${prog.done}/${prog.total} stages</span><span>${Math.round(prog.frac * 100)}%</span></div></div>
      </div>
    </div>
    <div class="timeline">${items}</div>`;
  }

  function levelRow(c, lv, i) {
    const unlocked = state.isLevelUnlocked(c.id, c, i);
    const done = state.isLevelDone(c.id, lv);
    const cur = unlocked && !done;
    const cls = [done ? "done" : "", cur ? "current" : "", unlocked ? "" : "locked", lv.boss ? "boss" : ""].filter(Boolean).join(" ");
    const nodeInner = lv.boss ? icon("award") : done ? icon("check") : (i + 1);
    const nav = unlocked ? ` data-nav="#/c/${c.id}/${lv.id}"` : "";
    const tags = (lv.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
    const xp = lv.boss ? 45 : state.levelStages(lv).reduce((a, s) => a + ({ learn: 8, example: 8, check: 16, practice: 22 }[s] || 0), 0);
    return `
    <div class="tl-item ${cls}">
      <div class="tl-rail"><div class="tl-node">${nodeInner}</div><div class="tl-line"></div></div>
      <button class="tl-card"${nav}${unlocked ? "" : ' aria-disabled="true"'}>
        <div class="tl-card-body">
          <h3>${lv.boss ? "👑 " : ""}${esc(lv.title)}</h3>
          <div class="lv-sub">${esc(lv.subtitle || "")}</div>
          <div class="tl-tags">${lv.boss ? `<span class="chip boss-tag">${icon("award")} Boss challenge</span>` : tags}</div>
        </div>
        ${unlocked ? `<span class="tl-xp">${icon("zap")} ${done ? "Done" : "+" + xp}</span>` : `<span class="lock-pill">${icon("lock")}</span>`}
      </button>
    </div>`;
  }

  /* ------------- LEVEL SHELL (stateful) ------------- */
  function mountLevel(c, lv) {
    const stages = state.levelStages(lv); // e.g. ["learn","example","check","practice"] or ["boss"]
    // determine starting stage: first not-done, else last
    let active = stages.findIndex((s) => !state.isStageDone(c.id, lv.id, s));
    if (active < 0) active = 0;

    function stageEnabled(i) {
      if (state.isStageDone(c.id, lv.id, stages[i])) return true;
      // enabled if all previous done
      for (let k = 0; k < i; k++) if (!state.isStageDone(c.id, lv.id, stages[k])) return false;
      return true;
    }

    function completeStage(st) {
      const res = state.markStage(c.id, lv.id, st);
      ui.awardStage(res, lv.num ? "Level " + lv.num : lv.title);
      // grant special/level badge when level completes
      afterProgress(c, lv);
      // advance
      const nextIdx = stages.findIndex((s, i) => i > active && !state.isStageDone(c.id, lv.id, s));
      if (state.isLevelDone(c.id, lv)) { render(true); }
      else { active = nextIdx >= 0 ? nextIdx : Math.min(active + 1, stages.length - 1); render(); }
    }

    function render(justCompleted) {
      const root = screen();
      const tabLabels = { learn: ["Learn", "book"], example: ["Example", "code"], check: ["Check", "listChecks"], practice: ["Practice", "beaker"], boss: ["Boss", "award"] };
      const tabs = stages.map((s, i) => {
        const lab = tabLabels[s] || [s, "book"];
        const done = state.isStageDone(c.id, lv.id, s);
        const en = stageEnabled(i);
        return `<button class="stage-tab${i === active ? " active" : ""}${done ? " done" : ""}" data-stage="${i}"${en ? "" : " disabled"}>
          <span class="st-ico">${done ? icon("check") : (i + 1)}</span>${esc(lab[0])}</button>`;
      }).join("");

      root.innerHTML = `
      <div class="crumb"><a data-nav="#/">${icon("home")} Home</a> ${icon("chevronRight")} <a data-nav="#/c/${c.id}">${esc(c.title)}</a> ${icon("chevronRight")} <span>${lv.boss ? "Boss" : "Level " + (lv.num || lv.id)}</span></div>
      <div class="lesson-head" style="--ch-color:${c.color}">
        <div class="station-num">${lv.boss ? "BOSS CHALLENGE" : "LEVEL " + (lv.num || lv.id)}${lv.tags ? " · " + lv.tags.join(" · ") : ""}</div>
        <h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">${esc(lv.title)}</h1>
        ${lv.subtitle ? `<p class="dim" style="max-width:60ch">${esc(lv.subtitle)}</p>` : ""}
        <div class="stage-tabs" role="tablist">${tabs}</div>
      </div>
      <div id="stage-body" class="reveal"></div>`;

      wireCommonNav(root);
      ui.$$("[data-stage]", root).forEach((btn) => btn.addEventListener("click", () => {
        if (btn.disabled) return; active = +btn.getAttribute("data-stage"); render();
      }));
      renderStage(document.getElementById("stage-body"));
      window.scrollTo({ top: 0 });
      if (justCompleted && state.isLevelDone(c.id, lv)) maybeLevelCelebration(c, lv);
    }

    function renderStage(body) {
      const st = stages[active];
      if (st === "learn") return renderReading(body, lv.learn, "learn", "You've got the concept");
      if (st === "example") return renderReading(body, lv.example, "example", "Example understood");
      if (st === "check") return renderCheck(body);
      if (st === "practice") return renderPractice(body, lv.practice);
      if (st === "boss") return renderBoss(body);
    }

    function renderReading(body, blocks, st, doneMsg) {
      const done = state.isStageDone(c.id, lv.id, st);
      body.innerHTML = `<div class="reading">${ui.renderBlocks(blocks)}</div>
        <div class="q-actions" style="margin-top:30px">
          <button class="btn btn-primary btn-lg" data-continue>${done ? "Continue" : "Got it"} ${icon("arrowRight")}</button>
        </div>`;
      body.querySelector("[data-continue]").addEventListener("click", () => {
        if (done) { advanceOrHome(); } else { completeStage(st); }
      });
      if (window.Prism) Prism.highlightAllUnder(body);
    }

    function renderCheck(body) {
      const done = state.isStageDone(c.id, lv.id, "check");
      DBT.quiz.renderChecks(body, lv.checks, {
        alreadyDone: done,
        onComplete: () => { if (!done) completeStage("check"); else advanceOrHome(); },
        color: c.color,
      });
    }

    function renderPractice(body, practice) {
      const done = state.isStageDone(c.id, lv.id, "practice");
      const onSolved = () => { if (!done) completeStage("practice"); };
      mountPractice(body, practice, { onSolved, done, color: c.color, advance: advanceOrHome });
    }

    function renderBoss(body) {
      const done = state.isStageDone(c.id, lv.id, "boss");
      const intro = lv.intro ? `<div class="reading" style="margin-bottom:24px">${ui.renderBlocks(lv.intro)}</div>` : "";
      body.innerHTML = intro + `<div id="boss-mount"></div>`;
      if (window.Prism) Prism.highlightAllUnder(body);
      mountPractice(document.getElementById("boss-mount"), lv.challenge, {
        onSolved: () => { if (!done) completeStage("boss"); },
        done, color: c.color, advance: advanceOrHome, boss: true,
      });
    }

    function advanceOrHome() {
      // go to chapter screen (next level shown there)
      navigate("#/c/" + c.id);
    }

    render();
  }

  /* mount a practice/boss challenge based on its type */
  function mountPractice(container, practice, opts) {
    if (!practice) { container.innerHTML = ""; opts.onSolved(); return; }
    if (practice.type === "checks") {
      DBT.quiz.renderChecks(container, practice.checks, { alreadyDone: opts.done, onComplete: opts.done ? opts.advance : opts.onSolved, color: opts.color, practice: true });
      return;
    }
    if (practice.type === "sandbox-governance") return DBT.sandbox.governance.mount(container, practice, opts);
    if (practice.type === "sandbox-testing") return DBT.sandbox.testing.mount(container, practice, opts);
    if (practice.type === "sandbox-dag") return DBT.sandbox.cicd.mount(container, practice, opts);
    container.innerHTML = `<div class="card" style="padding:20px">Unknown practice type.</div>`;
  }

  /* ------------- badge + celebration logic ------------- */
  function afterProgress(c, lv) {
    if (state.isLevelDone(c.id, lv) && lv.award) {
      const b = (DBT.content.specialBadges || []).find((x) => x.id === lv.award);
      if (b && state.earnBadge(b.id)) ui.celebrateBadge(b);
    }
    if (state.isChapterDone(c) && c.badge && state.earnBadge(c.badge.id)) {
      ui.celebrateBadge(c.badge);
    }
  }
  function maybeLevelCelebration(c, lv) {
    if (state.isChapterDone(c)) {
      ui.burst();
      const nextIdx = chapterIndex(c.id) + 1;
      const hasNext = nextIdx < chapters().length;
      ui.modal({
        medal: `<div class="badge-medal earned" style="width:88px;height:88px;margin:0 auto">${icon(c.badge.icon)}</div>`,
        title: "Chapter complete!",
        html: `<p>You finished <strong>${esc(c.title)}</strong> and earned the <strong>${esc(c.badge.name)}</strong> badge.</p>`,
        actions: hasNext
          ? [{ label: "Back to map" }, { label: "Next chapter " + "→", primary: true, onClick: () => navigate("#/c/" + chapters()[nextIdx].id) }]
          : [{ label: "Back to map" }, { label: "Go to Capstone →", primary: true, onClick: () => navigate("#/capstone") }],
      });
    }
  }

  /* ------------- CAPSTONE ------------- */
  function capstoneGate() {
    const unlocked = state.chapterProgress(chapters()[chapters().length - 1]).complete;
    if (!unlocked) { navigate("#/"); return ""; }
    // Render capstone via its own module-ish flow held in content.capstone
    setTimeout(() => DBT.content.mountCapstone(screen(), { navigate, afterGraduate }), 0);
    return `<div class="crumb"><a data-nav="#/">${icon("home")} Home</a> ${icon("chevronRight")} <span>Capstone</span></div><div id="capstone-mount"></div>`;
  }
  function afterGraduate() {
    if (capstone().badge) state.earnBadge(capstone().badge.id);
    ui.burst();
  }

  /* ------------- boot ------------- */
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    window.addEventListener("hashchange", route);
    route();
  }

  return { boot, navigate, route, chapters };
})();

document.addEventListener("DOMContentLoaded", DBT.app.boot);
if (document.readyState !== "loading") DBT.app.boot();
