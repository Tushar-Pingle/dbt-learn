/* state.js — progress, XP, badges, theme. Persisted in localStorage. */
window.DBT = window.DBT || {};

DBT.state = (function () {
  const KEY = "dbt-academy-v1";

  const XP_BY_STAGE = { learn: 8, example: 8, check: 16, practice: 22, boss: 45, capstone: 90 };

  const listeners = [];
  let data = load();

  function fresh() {
    return { v: 1, xp: 0, stages: {}, badges: {}, theme: null, visited: {} };
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.v === 1) return raw;
    } catch (e) { /* ignore */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* quota / private mode */ }
    emit();
  }
  function emit() { listeners.forEach((fn) => { try { fn(data); } catch (e) {} }); }
  function on(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }

  const key = (ch, lv, st) => `${ch}.${lv}.${st}`;

  /* ---- stages ---- */
  function isStageDone(ch, lv, st) { return !!data.stages[key(ch, lv, st)]; }
  function markStage(ch, lv, st) {
    const k = key(ch, lv, st);
    if (data.stages[k]) return { xp: 0, already: true };
    data.stages[k] = true;
    const gained = XP_BY_STAGE[st] || 10;
    data.xp += gained;
    save();
    return { xp: gained, already: false };
  }

  /* ---- levels ---- */
  function levelStages(level) {
    if (level.boss) return ["boss"];
    if (level.capstone) return ["capstone"];
    const s = ["learn"];
    if (level.example) s.push("example");
    if (level.checks && level.checks.length) s.push("check");
    if (level.practice) s.push("practice");
    return s;
  }
  function isLevelDone(ch, level) { return levelStages(level).every((st) => isStageDone(ch, level.id, st)); }
  function levelProgress(ch, level) {
    const stages = levelStages(level);
    const done = stages.filter((st) => isStageDone(ch, level.id, st)).length;
    return { done, total: stages.length, frac: stages.length ? done / stages.length : 0 };
  }
  function isLevelUnlocked(ch, chapter, index) {
    if (index === 0) return true;
    return isLevelDone(ch, chapter.levels[index - 1]);
  }

  /* ---- chapters ---- */
  function chapterProgress(chapter) {
    let done = 0, total = 0;
    chapter.levels.forEach((lv) => {
      const p = levelProgress(chapter.id, lv);
      done += p.done; total += p.total;
    });
    return { done, total, frac: total ? done / total : 0, complete: chapter.levels.every((lv) => isLevelDone(chapter.id, lv)) };
  }
  function isChapterDone(chapter) { return chapter.levels.every((lv) => isLevelDone(chapter.id, lv)); }
  function isChapterUnlocked(chapters, index) {
    if (index === 0) return true;
    return isChapterDone(chapters[index - 1]);
  }
  function overallProgress(chapters) {
    let done = 0, total = 0;
    chapters.forEach((c) => { const p = chapterProgress(c); done += p.done; total += p.total; });
    return { done, total, frac: total ? done / total : 0 };
  }

  /* ---- badges ---- */
  function hasBadge(id) { return !!data.badges[id]; }
  function earnBadge(id) {
    if (data.badges[id]) return false;
    data.badges[id] = Date.now();
    save();
    return true;
  }

  /* ---- theme + misc ---- */
  function getTheme() { return data.theme; }
  function setTheme(t) { data.theme = t; save(); }
  function getXP() { return data.xp; }
  function markVisited(id) { if (!data.visited[id]) { data.visited[id] = true; save(); } }
  function hasVisited(id) { return !!data.visited[id]; }
  function reset() { data = fresh(); save(); }

  return {
    on, isStageDone, markStage, levelStages, isLevelDone, levelProgress, isLevelUnlocked,
    chapterProgress, isChapterDone, isChapterUnlocked, overallProgress,
    hasBadge, earnBadge, getTheme, setTheme, getXP, markVisited, hasVisited, reset,
  };
})();
