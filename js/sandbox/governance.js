/* sandbox/governance.js — parse real YAML, check ref-legality + run dbt-project-evaluator
   governance rules. DBT.sandbox.governance.mount(container, spec, opts) */
window.DBT = window.DBT || {};
DBT.sandbox = DBT.sandbox || {};

DBT.sandbox.governance = (function () {
  const ui = DBT.ui, icon = ui.icon, esc = ui.esc;

  /* ---------- model normalisation (accepts v1.10 config-nested & legacy top-level) ---------- */
  function norm(m) {
    const cfg = m.config || {};
    const contract = (m.contract && m.contract.enforced) || (cfg.contract && cfg.contract.enforced) || false;
    return {
      name: m.name,
      project: m.project || cfg.project || "analytics",
      group: m.group || cfg.group || null,
      access: m.access || cfg.access || "protected",
      contract: !!contract,
      description: (m.description || "").trim(),
      columns: (m.columns || []).map((c) => ({ name: c.name, data_type: c.data_type || c.dataType || null, description: (c.description || "").trim() })),
      refs: m.refs || m.depends_on || m.ref || [],
    };
  }

  function analyze(doc) {
    const models = (doc && doc.models ? doc.models : []).filter((m) => m && m.name).map(norm);
    const byName = {};
    models.forEach((m) => { byName[m.name] = m; });
    const exposures = (doc && doc.exposures ? doc.exposures : []).map((e) => ({ name: e.name, depends_on: e.depends_on || e.refs || [] }));

    /* ref legality */
    const refFindings = [];
    models.forEach((m) => {
      (m.refs || []).forEach((rn) => {
        const T = byName[rn];
        if (!T) { refFindings.push({ ok: true, unknown: true, from: m.name, to: rn, msg: `<code>${esc(m.name)}</code> refs <code>${esc(rn)}</code> — not defined here, treated as external (skipped).` }); return; }
        let blocked = null;
        if (T.access === "public") { /* always allowed */ }
        else if (T.access === "protected") {
          if (T.project !== m.project) blocked = `it is <strong>protected</strong> to the <code>${esc(T.project)}</code> project`;
        } else if (T.access === "private") {
          if (T.project !== m.project) blocked = `it is <strong>private</strong> (and in another project)`;
          else if (T.group !== m.group) blocked = `it is <strong>private</strong> to the <code>${esc(T.group || "—")}</code> group`;
        }
        if (blocked) {
          refFindings.push({ ok: false, from: m.name, to: T.name,
            msg: `<strong>DbtReferenceError</strong>: <code>${esc(m.name)}</code> attempted to reference <code>${esc(T.name)}</code>, which is not allowed because ${blocked}.`,
            fix: `Either make <code>${esc(T.name)}</code> more accessible (e.g. <code>access: public</code>) or move/regroup <code>${esc(m.name)}</code>.` });
        } else {
          refFindings.push({ ok: true, from: m.name, to: T.name, msg: `<code>${esc(m.name)}</code> → <code>${esc(T.name)}</code> ✓ allowed (<em>${esc(T.access)}</em>).` });
        }
      });
    });

    /* dbt-project-evaluator governance rules */
    const auditFindings = [];
    models.filter((m) => m.access === "public").forEach((m) => {
      if (!m.contract) auditFindings.push({ rule: "fct_public_models_without_contract", model: m.name,
        what: `Public model <code>${esc(m.name)}</code> has no enforced contract.`,
        fix: `Add <code>config: contract: {enforced: true}</code> and give every column a <code>data_type</code>.` });
      const colsMissing = m.columns.filter((c) => !c.description).map((c) => c.name);
      if (!m.description || m.columns.length === 0 || colsMissing.length) {
        let why = !m.description ? "no model-level <code>description</code>" : "";
        if (m.columns.length === 0) why = (why ? why + "; " : "") + "no documented columns";
        else if (colsMissing.length) why = (why ? why + "; " : "") + `columns without a description: <code>${colsMissing.map(esc).join(", ")}</code>`;
        auditFindings.push({ rule: "fct_undocumented_public_models", model: m.name,
          what: `Public model <code>${esc(m.name)}</code> is not fully documented (${why}).`,
          fix: `Public models need a model-level <code>description</code> <em>and</em> a description on <strong>every</strong> column.` });
      }
    });
    exposures.forEach((e) => {
      (e.depends_on || []).forEach((rn) => {
        const T = byName[rn];
        if (T && T.access !== "public") auditFindings.push({ rule: "fct_exposures_dependent_on_private_models", model: e.name,
          what: `Exposure <code>${esc(e.name)}</code> depends on <code>${esc(rn)}</code>, which is <strong>${esc(T.access)}</strong> (not public).`,
          fix: `Exposures should read from trusted <code>public</code> models. Promote <code>${esc(rn)}</code> to <code>access: public</code> (and contract + document it).` });
      });
    });

    return { models, byName, exposures, refFindings, auditFindings };
  }

  /* ---------- rendering ---------- */
  function mount(container, spec, opts) {
    opts = opts || {};
    const modeAudit = spec.mode === "audit";
    container.innerHTML = `
    <div class="sandbox">
      <div class="sb-head">
        <h3>${icon("shieldCheck")} Governance sandbox</h3>
        <div class="sb-tools">
          <button class="btn btn-ghost btn-sm" data-reset>${icon("refresh")} Reset</button>
          <button class="btn btn-primary btn-sm" data-run>${icon("play")} Run ${modeAudit ? "audit" : "checks"}</button>
        </div>
      </div>
      <div class="sb-goal">${icon("target")}<div><b>Goal:</b> ${spec.goal}</div></div>
      <div class="sb-body">
        <div class="sb-pane">
          <div class="sb-pane-head">${icon("code")} models.yml <span class="flex"></span></div>
          <div id="gov-ed"></div>
        </div>
        <div class="sb-pane">
          <div class="sb-pane-head">${icon(modeAudit ? "shield" : "gitBranch")} ${modeAudit ? "audit results" : "ref-legality"} </div>
          <div class="sb-result" id="gov-out"><div class="sb-empty">Press <strong>Run ${modeAudit ? "audit" : "checks"}</strong> to analyze your YAML.</div></div>
        </div>
      </div>
    </div>`;

    const ed = ui.makeEditor(container.querySelector("#gov-ed"), { value: spec.starter || "", label: "models.yml" });
    const out = container.querySelector("#gov-out");
    let solved = false;

    function run() {
      let doc;
      try { doc = jsyaml.load(ed.value) || {}; }
      catch (e) {
        out.innerHTML = `<div class="verdict fail"><div class="v-ico">${icon("x")}</div><div><h4>YAML didn't parse</h4><p>${esc(String(e.message || e).split("\n")[0])}</p></div></div><div class="result-note">Fix the indentation/syntax and run again. YAML is picky about spaces.</div>`;
        return;
      }
      const res = analyze(doc);
      const refBad = res.refFindings.filter((f) => !f.ok);
      const auditBad = res.auditFindings;
      const reqs = (spec.requires || []).map((r) => ({ label: r.label, pass: safeTest(r.test, res) }));
      const reqFail = reqs.filter((r) => !r.pass);

      const primaryClean = modeAudit ? (auditBad.length === 0) : (refBad.length === 0);
      const pass = primaryClean && reqFail.length === 0;

      let html = "";
      // verdict
      if (pass) html += verdict("pass", "check", modeAudit ? "Audit clean — ships like an API" : "All refs are legal", modeAudit ? "No governance violations, and every requirement met." : "Every reference respects its access boundary.");
      else html += verdict("fail", "alert", modeAudit ? `${auditBad.length + reqFail.length} issue${auditBad.length + reqFail.length !== 1 ? "s" : ""} to fix` : `${refBad.length} illegal reference${refBad.length !== 1 ? "s" : ""}`, "Read the findings below, edit the YAML, and run again.");

      // requirement checks
      if (reqs.length) {
        html += `<div class="result-note">${icon("listChecks")} Task requirements</div>`;
        reqs.forEach((r) => { html += finding(r.pass, r.label, "", ""); });
      }

      if (modeAudit) {
        html += `<div class="result-note">${icon("shield")} dbt-project-evaluator · governance rules</div>`;
        if (!auditBad.length) html += finding(true, "No governance-rule violations found.", "", "");
        else auditBad.forEach((f) => html += finding(false, `<span class="mono" style="color:var(--coral)">${esc(f.rule)}</span> — ${f.what}`, "", f.fix));
        // also surface any illegal refs as info
        if (refBad.length) { html += `<div class="result-note">${icon("gitBranch")} also: reference problems</div>`; refBad.forEach((f) => html += finding(false, f.msg, "", f.fix)); }
      } else {
        html += `<div class="result-note">${icon("gitBranch")} reference check (${res.refFindings.filter((f) => !f.unknown).length} edges)</div>`;
        res.refFindings.forEach((f) => html += finding(f.ok, f.msg, "", f.ok ? "" : f.fix));
      }

      out.innerHTML = html;

      if (pass && !solved) {
        solved = true;
        showContinue();
        ui.toast({ kind: "badge", title: modeAudit ? "Audit passed" : "Refs legal", msg: "Challenge solved" });
      }
    }

    function showContinue() {
      const bar = document.createElement("div");
      bar.className = "q-actions";
      bar.style.marginTop = "18px";
      bar.innerHTML = `<button class="btn btn-primary btn-lg" data-fin>${opts.boss ? "Claim victory" : "Complete practice"} ${icon("arrowRight")}</button>`;
      out.appendChild(bar);
      bar.querySelector("[data-fin]").addEventListener("click", () => { (opts.done ? opts.advance : opts.onSolved)(); });
    }

    container.querySelector("[data-run]").addEventListener("click", run);
    container.querySelector("[data-reset]").addEventListener("click", () => { ed.reset(spec.starter || ""); out.innerHTML = `<div class="sb-empty">Editor reset. Press <strong>Run</strong> to analyze.</div>`; });
    if (spec.autorun) run();
  }

  function safeTest(fn, res) { try { return !!fn(res); } catch (e) { return false; } }
  function verdict(kind, ic, title, sub) {
    return `<div class="verdict ${kind}"><div class="v-ico">${icon(ic)}</div><div><h4>${title}</h4><p>${sub}</p></div></div>`;
  }
  function finding(ok, body, note, fix) {
    return `<div class="finding ${ok ? "ok" : "bad"}">${icon(ok ? "check" : "x")}<div class="f-body"><div>${body}</div>${note ? `<p>${note}</p>` : ""}${fix ? `<div class="f-fix">${icon("sparkles")} ${fix}</div>` : ""}</div></div>`;
  }

  return { mount, analyze };
})();
