/* sandbox/cicd.js — Slim CI DAG simulator. Click models to "modify", see state:modified+
   rebuild only the blast radius. DBT.sandbox.cicd.mount(container, spec, opts) */
window.DBT = window.DBT || {};
DBT.sandbox = DBT.sandbox || {};

DBT.sandbox.cicd = (function () {
  const ui = DBT.ui, icon = ui.icon, esc = ui.esc;

  // fixed project DAG: sources -> staging -> intermediate -> marts
  const NODES = [
    { id: "src_orders", label: "orders", sub: "SOURCE", layer: 0, type: "source" },
    { id: "src_customers", label: "customers", sub: "SOURCE", layer: 0, type: "source" },
    { id: "src_payments", label: "payments", sub: "SOURCE", layer: 0, type: "source" },
    { id: "stg_orders", label: "stg_orders", sub: "STAGING", layer: 1 },
    { id: "stg_customers", label: "stg_customers", sub: "STAGING", layer: 1 },
    { id: "stg_payments", label: "stg_payments", sub: "STAGING", layer: 1 },
    { id: "int_orders", label: "int_orders", sub: "INTERMEDIATE", layer: 2 },
    { id: "fct_orders", label: "fct_orders", sub: "MART", layer: 3 },
    { id: "dim_customers", label: "dim_customers", sub: "MART", layer: 3 },
    { id: "fct_payments", label: "fct_payments", sub: "MART", layer: 3 },
  ];
  const EDGES = [
    ["src_orders", "stg_orders"], ["src_customers", "stg_customers"], ["src_payments", "stg_payments"],
    ["stg_orders", "int_orders"], ["stg_payments", "int_orders"],
    ["int_orders", "fct_orders"], ["stg_customers", "fct_orders"],
    ["stg_customers", "dim_customers"], ["stg_payments", "fct_payments"],
  ];
  const byId = {}; NODES.forEach((n) => (byId[n.id] = n));
  const children = {}; NODES.forEach((n) => (children[n.id] = []));
  EDGES.forEach(([a, b]) => children[a].push(b));
  const MODELS = NODES.filter((n) => n.type !== "source");

  function descendants(seed) {
    const out = new Set(), stack = [...seed];
    while (stack.length) { const cur = stack.pop(); (children[cur] || []).forEach((c) => { if (!out.has(c)) { out.add(c); stack.push(c); } }); }
    return out;
  }

  // layout
  const NW = 128, NH = 44, COLX = [14, 190, 366, 542], ROWH = 62;
  function layout() {
    const pos = {};
    [0, 1, 2, 3].forEach((L) => {
      const ns = NODES.filter((n) => n.layer === L);
      const totalH = ns.length * ROWH;
      const top = (HEIGHT - totalH) / 2 + (ROWH - NH) / 2;
      ns.forEach((n, i) => { pos[n.id] = { x: COLX[L], y: top + i * ROWH }; });
    });
    return pos;
  }
  const HEIGHT = 3 * ROWH + 26;
  const WIDTH = COLX[3] + NW + 14;

  function mount(container, spec, opts) {
    opts = opts || {};
    const modified = new Set(spec.startModified || []);
    let defer = spec.startDefer != null ? spec.startDefer : true;
    let solved = false;

    container.innerHTML = `
    <div class="dag-wrap">
      <div class="dag-toolbar">
        <div class="dag-stat full"><span class="num" id="s-full">0</span><span class="lbl">Full build</span></div>
        <div class="dag-stat slim"><span class="num" id="s-slim">0</span><span class="lbl">Slim CI builds</span></div>
        <div class="dag-stat save"><span class="num" id="s-save">0%</span><span class="lbl">Skipped</span></div>
        <div style="flex:1"></div>
        <label class="toggle"><input type="checkbox" id="defer-tog" ${defer ? "checked" : ""}><span class="tk"></span><span>Defer to prod <span class="mono" style="color:var(--text-faint)">--defer</span></span></label>
      </div>
      <div class="sb-goal">${icon("target")}<div><b>Goal:</b> ${spec.goal}</div></div>
      <div class="dag-canvas"><div id="dag-svg"></div></div>
      <div class="dag-hint">
        <span class="dag-legend"><span class="sw" style="background:color-mix(in srgb,var(--coral) 40%,var(--surface));border:1.5px solid var(--coral)"></span>modified</span>
        <span class="dag-legend"><span class="sw" style="background:color-mix(in srgb,var(--gold) 35%,var(--surface));border:1.5px solid var(--gold)"></span>downstream (rebuilt)</span>
        <span class="dag-legend"><span class="sw" style="background:var(--surface);border:1.5px solid var(--border-strong)"></span>unchanged</span>
        <span style="margin-left:auto;color:var(--text-faint)">${icon("info")} click a model to toggle "modified"</span>
      </div>
      <div class="dag-cmd" id="dag-cmd"></div>
      <div style="padding:14px 18px 4px" id="dag-result"></div>
      <div class="q-actions" style="padding:0 18px 18px" id="dag-actions">
        ${spec.target ? `<button class="btn btn-primary" data-check>${icon("check")} Check my selection</button>` : ""}
      </div>
    </div>`;

    const pos = layout();
    const svgHost = container.querySelector("#dag-svg");
    const cmdEl = container.querySelector("#dag-cmd");

    function selection() {
      const desc = descendants([...modified]);
      const sel = new Set([...modified, ...desc].filter((id) => byId[id].type !== "source"));
      return sel;
    }

    function draw() {
      const sel = selection();
      // edges
      let edges = "";
      EDGES.forEach(([a, b]) => {
        const pa = pos[a], pb = pos[b];
        const x1 = pa.x + NW, y1 = pa.y + NH / 2, x2 = pb.x, y2 = pb.y + NH / 2;
        const mx = (x1 + x2) / 2;
        const hot = sel.has(b) && (sel.has(a) || modified.has(a));
        edges += `<path class="dag-edge${hot ? " hot" : ""}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
      });
      // nodes
      let nodes = "";
      NODES.forEach((n) => {
        const p = pos[n.id];
        let cls = "n-idle", clickable = n.type !== "source";
        if (n.type === "source") cls = "n-source";
        else if (modified.has(n.id)) cls = "n-modified";
        else if (sel.has(n.id)) cls = "n-down";
        else if (defer) cls = "n-defer";
        const tag = (n.type !== "source" && defer && !sel.has(n.id)) ? `<text class="dag-tag" x="${p.x + NW - 8}" y="${p.y + NH - 7}" text-anchor="end">prod ↩</text>` : "";
        nodes += `<g class="dag-node ${cls}${clickable ? " clickable" : ""}" data-id="${n.id}">
          <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="9"></rect>
          <text x="${p.x + 12}" y="${p.y + 19}">${esc(n.label)}</text>
          <text class="n-sub" x="${p.x + 12}" y="${p.y + 32}">${esc(n.sub)}</text>
          ${tag}
        </g>`;
      });
      svgHost.innerHTML = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="model dependency graph">${edges}${nodes}</svg>`;
      ui.$$(".dag-node.clickable", svgHost).forEach((g) => g.addEventListener("click", () => {
        const id = g.getAttribute("data-id");
        if (modified.has(id)) modified.delete(id); else modified.add(id);
        update();
      }));
    }

    function update() {
      const sel = selection();
      const full = MODELS.length;
      const slim = sel.size;
      container.querySelector("#s-full").textContent = full;
      container.querySelector("#s-slim").textContent = slim;
      const pct = full ? Math.round(((full - slim) / full) * 100) : 0;
      container.querySelector("#s-save").textContent = pct + "%";
      cmdEl.innerHTML = command();
      draw();
    }

    function command() {
      const parts = [`<span style="color:var(--text-dim)">$</span> dbt build`,
        `<span class="flag">--select</span> <span class="sel">state:modified+</span>`];
      if (defer) parts.push(`<span class="flag">--defer</span>`);
      parts.push(`<span class="flag">--state</span> path/to/prod-artifacts`);
      const note = modified.size === 0
        ? `   <span style="color:var(--text-faint)"># nothing modified → 0 models build</span>`
        : "";
      return parts.join(" ") + note;
    }

    container.querySelector("#defer-tog").addEventListener("change", (e) => { defer = e.target.checked; update(); });

    if (spec.target) {
      container.querySelector("[data-check]").addEventListener("click", () => {
        const want = new Set(spec.target.modified || []);
        const sameMod = want.size === modified.size && [...want].every((x) => modified.has(x));
        const deferOk = spec.target.defer == null || spec.target.defer === defer;
        const res = container.querySelector("#dag-result");
        if (sameMod && deferOk) {
          res.innerHTML = `<div class="verdict pass"><div class="v-ico">${icon("check")}</div><div><h4>${spec.successTitle || "Exactly right"}</h4><p>${spec.successMsg || "That's the minimal correct rebuild set for this change."}</p></div></div>`;
          if (!solved) {
            solved = true;
            const bar = container.querySelector("#dag-actions");
            bar.innerHTML = `<button class="btn btn-primary btn-lg" data-fin>${opts.boss ? "Claim victory" : "Complete practice"} ${icon("arrowRight")}</button>`;
            bar.querySelector("[data-fin]").addEventListener("click", () => { (opts.done ? opts.advance : opts.onSolved)(); });
            ui.toast({ kind: "badge", title: "Slim CI dialed in", msg: spec.short || "Nice" });
          }
        } else {
          let msg = !sameMod ? "The set of <em>modified</em> models isn't what this scenario describes." : "Selection is right, but check the <code>--defer</code> setting the scenario asks for.";
          res.innerHTML = `<div class="verdict warn"><div class="v-ico">${icon("alert")}</div><div><h4>Not quite</h4><p>${msg}</p></div></div>`;
        }
      });
    }

    update();
  }

  return { mount };
})();
