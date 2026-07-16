/* content/cicd.js — Chapter 3: CI/CD, Slim CI & Deployment. */
window.DBT = window.DBT || {};
DBT.content = DBT.content || { chapters: [], specialBadges: [] };

DBT.content.chapters.push({
  id: "cicd",
  order: 3,
  color: "#5AA9E6",
  icon: "gitBranch",
  title: "CI/CD & Slim CI",
  subtitle: "Separate dev from prod, test every PR, and rebuild only what changed with Slim CI.",
  blurb: "The final skill is making correctness automatic. Separate development from production so experiments never touch trusted data. Run a CI job on every pull request so breakage is caught before merge. And use Slim CI — deferral plus state:modified+ — to rebuild only the models that changed and their downstream, instead of the whole project. Fast, cheap, and the reason accuracy can be the default.",
  badge: { id: "badge-cicd", name: "Pipeline Architect", icon: "rocket", hint: "Finish Chapter 3" },
  levels: [
    /* ---------------- 3.1 ---------------- */
    {
      id: "1", num: "3.1", title: "Dev vs prod", subtitle: "Why development and production must be separate worlds.", tags: ["Environments"],
      learn: [
        { t: "lead", html: "Rule zero of a safe warehouse: your experiments never run where your trusted data lives. In dbt Core that separation is a <strong>target</strong> in <code>profiles.yml</code>; in dbt Cloud it's an <strong>environment</strong>. Same idea — different credentials, different schema." },
        { t: "code", lang: "yaml", file: "profiles.yml", code: "jaffle_shop:\n  target: dev            # default when you just run `dbt build`\n  outputs:\n    dev:\n      type: snowflake\n      schema: dbt_tush     # your personal, isolated schema\n      threads: 4\n    prod:\n      type: snowflake\n      schema: analytics    # the trusted production schema\n      threads: 8" },
        { t: "list", items: [
          "Run <code>dbt build</code> → hits <strong>dev</strong>, your sandbox schema. Break whatever you want.",
          "Run <code>dbt build --target prod</code> → hits <strong>prod</strong> (normally only your scheduler does this).",
          "Prod's build produces the <strong>artifacts</strong> (a <code>manifest.json</code>) that CI later compares against — remember this, it's the key to Slim CI.",
        ] },
        { t: "apply", who: "Everyone: individual engineers get isolated dev schemas; the platform team owns the prod environment.", when: "Always. Dev and prod separation is table stakes before any CI/CD.", where: "Targets in <code>profiles.yml</code> (Core) or Environments in dbt Cloud — each with its own credentials, role, and schema." },
      ],
      checks: [
        { kind: "mcq", q: "Why keep a separate dev schema per engineer?", options: [
          { text: "So experiments never overwrite trusted production tables (and no one clobbers anyone else).", correct: true, why: "Isolation is the whole point — dev is a safe sandbox, prod stays trustworthy." },
          { text: "Because dbt refuses to run without two targets.", why: "dbt runs fine with one target; separation is a best practice, not a hard requirement." },
          { text: "To make builds slower.", why: "Separation doesn't slow builds; it protects data." },
        ], explain: "Dev/prod separation isolates experiments from trusted data." },
        { kind: "mcq", q: "Which run produces the baseline artifacts that Slim CI compares against?", options: [
          { text: "The scheduled production build.", correct: true, why: "Prod's build writes the manifest.json that CI defers to and diffs against." },
          { text: "Each engineer's local dev run.", why: "Dev runs are throwaway; the shared baseline comes from prod." },
          { text: "The dbt docs command.", why: "Docs don't create the CI baseline." },
        ], explain: "Prod's build → the baseline <code>manifest.json</code> for state comparison." },
      ],
    },

    /* ---------------- 3.2 ---------------- */
    {
      id: "2", num: "3.2", title: "Jobs: scheduled vs CI", subtitle: "The two kinds of automated runs and what each is for.", tags: ["Jobs"],
      learn: [
        { t: "lead", html: "A <strong>job</strong> is an automated dbt invocation. You'll run two kinds, and they do very different work." },
        { t: "compare", good: { title: "Production (deploy) job", items: [
          "Runs on a <strong>schedule</strong> (cron), against <strong>prod</strong>.",
          "Usually <code>dbt build</code> (run + test + snapshot + seed, in DAG order).",
          "Often paired with <code>dbt source freshness</code>.",
          "Produces the baseline <code>manifest.json</code>.",
        ] }, bad: { title: "CI job", items: [
          "Triggered by a <strong>pull request</strong>, not a clock.",
          "Builds into a temporary, PR-scoped schema.",
          "Validates the change <em>before</em> merge.",
          "Uses deferral + <code>state:modified+</code> (next level).",
        ] } },
        { t: "callout", variant: "info", title: "'build' does a lot", html: "<code>dbt build</code> interleaves models, tests, seeds and snapshots in dependency order — so a model only builds if its upstream tests passed. It's the one command most production jobs run." },
        { t: "apply", who: "The platform team configures both; every engineer benefits from the CI job on their PRs.", when: "Schedule the prod job to match your data's cadence (e.g. hourly/daily). The CI job runs automatically on every PR.", where: "In dbt Cloud's Jobs UI, or your orchestrator (Airflow, GitHub Actions) for dbt Core." },
      ],
      checks: [
        { kind: "match", q: "Match each trait to the right kind of job.", pairs: [
          { left: "Triggered by a pull request", leftTag: "TRIGGER", right: "CI job", rightTag: "JOB" },
          { left: "Runs on a cron schedule against prod", leftTag: "TRIGGER", right: "Production job", rightTag: "JOB" },
          { left: "Produces the baseline manifest.json", leftTag: "OUTPUT", right: "Production job", rightTag: "JOB" },
          { left: "Builds into a temporary PR schema", leftTag: "OUTPUT", right: "CI job", rightTag: "JOB" },
        ], explain: "Prod job = scheduled, writes the baseline. CI job = PR-triggered, temporary schema." },
      ],
    },

    /* ---------------- 3.3 ---------------- */
    {
      id: "3", num: "3.3", title: "CI on every pull request", subtitle: "Catch breakage before it reaches main — automatically.", tags: ["CI"],
      learn: [
        { t: "lead", html: "A <strong>CI job</strong> runs on every pull request and builds + tests your change in an isolated schema. If your edit breaks a model or fails a test, the PR check goes red <em>before</em> anyone merges. Correctness stops being a thing people remember to check — it's enforced." },
        { t: "h", text: "What the CI job proves" },
        { t: "list", items: [
          "The changed models <strong>actually build</strong> against real warehouse SQL.",
          "Their <strong>tests pass</strong> (and the tests of everything downstream).",
          "Contracts still hold — a broken shape fails the check.",
        ] },
        { t: "callout", variant: "key", title: "The naive way is too slow", html: "Rebuilding the <em>entire</em> project on every PR is correct but painfully slow and expensive as projects grow. The next level — Slim CI — makes it fast enough to run on every commit without thinking about cost." },
        { t: "apply", who: "Reviewers trust it; authors rely on it. The platform team sets it up once.", when: "On every PR to your dbt repo — no exceptions. Green check required to merge.", where: "A dbt Cloud CI job tied to your Git provider, or a GitHub Actions/GitLab CI workflow for dbt Core." },
      ],
      checks: [
        { kind: "mcq", q: "What's the main problem with rebuilding the whole project on every PR?", options: [
          { text: "It's slow and expensive as the project grows — so people avoid running it.", correct: true, why: "Correct but costly; Slim CI fixes exactly this so CI stays fast and cheap." },
          { text: "It doesn't actually test anything.", why: "It does test — the issue is cost/speed, not correctness." },
          { text: "It can only run once per day.", why: "No such limit; the concern is time and warehouse spend per run." },
        ], explain: "Full rebuilds are accurate but too slow/expensive — the motivation for Slim CI." },
      ],
    },

    /* ---------------- 3.4 ---------------- */
    {
      id: "4", num: "3.4", title: "Slim CI: rebuild only what changed", subtitle: "Deferral + state:modified+ = the blast radius, nothing more.", tags: ["Slim CI"], award: "slim-ci-ninja",
      learn: [
        { t: "lead", html: "<strong>Slim CI</strong> is the trick that makes 'test everything on every PR' fast. It combines two mechanisms so the CI job builds <em>only</em> the models you changed and their downstream — deferring everything else to production." },
        { t: "h", text: "1 · State comparison — what changed?" },
        { t: "p", html: "<code>--state path/to/prod-artifacts</code> points dbt at production's <code>manifest.json</code>. dbt diffs your PR against it:" },
        { t: "list", items: [
          "<code>state:modified</code> — all <strong>new</strong> nodes plus any <strong>changed</strong> existing nodes (SQL, configs, contracts…).",
          "the trailing <code>+</code> — also include <strong>every downstream descendant</strong> (the blast radius of your change).",
        ] },
        { t: "h", text: "2 · Deferral — reuse prod for the rest" },
        { t: "p", html: "<code>--defer</code> tells dbt: for any <code>ref()</code> to a model you're <em>not</em> building in this run, use the existing <strong>production</strong> relation instead of rebuilding it." },
        { t: "code", lang: "bash", file: "the Slim CI command", code: "dbt build --select state:modified+ --defer --state path/to/prod-artifacts" },
        { t: "callout", variant: "key", title: "Read it in one breath", html: "\"Build the models I changed <em>and their downstream</em> (<code>state:modified+</code>), and for everything upstream they depend on, borrow production (<code>--defer</code>).\"" },
        { t: "apply", who: "The platform team wires it into the CI job; in dbt Cloud, 'defer to prod' injects all of this automatically.", when: "On every PR CI run — it's the default way to keep CI fast and cheap at scale.", where: "The CI job's build command, using <code>--select state:modified+ --defer --state &lt;prod-artifacts&gt;</code>." },
      ],
      example: [
        { t: "h", text: "The savings, concretely" },
        { t: "p", html: "Say your project has 8 models and you touch just <code>stg_orders</code>. Its only downstream are <code>int_orders</code> and <code>fct_orders</code>. Slim CI builds <strong>3 models</strong>, not 8 — and defers the other 5 to prod:" },
        { t: "table", head: ["Approach", "Models built", "Relative cost"], rows: [
          ["Full rebuild every PR", "8 / 8", "100%"],
          ["Slim CI (<code>state:modified+</code>)", "3 / 8", "~38%"],
        ], note: "On a real project with thousands of models, the difference is minutes-and-cents vs. hours-and-dollars." },
        { t: "callout", variant: "info", title: "Try it below", html: "In the practice, click a model to mark it 'modified' and watch <code>state:modified+</code> light up exactly the models that must rebuild. Toggle <code>--defer</code> to see the rest borrow prod." },
      ],
      checks: [
        { kind: "mcq", q: "What does the trailing <code>+</code> in <code>state:modified+</code> add?", options: [
          { text: "All downstream descendants of the changed models — the blast radius.", correct: true, why: "modified+ = the changed nodes plus everything that depends on them, so nothing downstream is left stale." },
          { text: "All upstream parents of the changed models.", why: "That would be +state:modified (leading plus). Trailing + means downstream." },
          { text: "Nothing — it's decorative.", why: "It's a real selector operator: include descendants." },
        ], explain: "Trailing <code>+</code> = include downstream descendants." },
        { kind: "mcq", q: "What does <code>--defer</code> do for a ref to a model you're <em>not</em> building this run?", options: [
          { text: "Resolves that ref to the existing production relation instead of rebuilding it.", correct: true, why: "Deferral borrows prod for anything outside your selected set — that's the cost saving." },
          { text: "Skips the ref entirely, leaving a NULL.", why: "No — it points at the real prod table so your build is still correct." },
          { text: "Rebuilds it anyway, just later.", why: "The point of defer is to NOT rebuild it." },
        ], explain: "<code>--defer</code> reuses the prod relation for unbuilt refs." },
        { kind: "fill", q: "Complete the Slim CI selector that means 'changed models and everything downstream':", answer: "state:modified+", accept: ["state modified+", "state:modified +"], hint: "It's a selector with a trailing operator.", placeholder: "state:____", explain: "<code>state:modified+</code> — the workhorse selector of Slim CI." },
      ],
      practice: {
        type: "sandbox-dag",
        goal: "You edited <strong>only</strong> <code>stg_orders</code> in this PR. Mark it modified and turn on <code>--defer</code> so CI rebuilds just the blast radius and borrows prod for everything else. Then press <strong>Check my selection</strong>.",
        startModified: [], startDefer: false,
        target: { modified: ["stg_orders"], defer: true },
        successTitle: "That's Slim CI",
        successMsg: "Only stg_orders + its downstream (int_orders, fct_orders) rebuild — 3 of 8 models. Everything else defers to prod.",
        short: "state:modified+",
      },
    },

    /* ---------------- 3.5 ---------------- */
    {
      id: "5", num: "3.5", title: "Direct vs indirect promotion", subtitle: "Two deployment architectures — and when to pick each.", tags: ["Deployment"],
      learn: [
        { t: "lead", html: "How does a merged change actually reach production? Two patterns, trading speed against safety." },
        { t: "compare", good: { title: "Direct promotion", items: [
          "feature → PR → CI → merge to <code>main</code> → <strong>deploy straight to prod</strong>.",
          "Fast, simple, minimal branch management.",
          "Prod is only as safe as your PR review + CI.",
          "Best for smaller teams with strong CI.",
        ] }, bad: { title: "Indirect promotion", items: [
          "dev → <strong>staging/QA</strong> → prod, each its own long-lived branch/env.",
          "Changes are batched and validated in staging first.",
          "Extra safety, supports UAT / release batching.",
          "More complex, slower to prod, risk of environment drift.",
        ] } },
        { t: "callout", variant: "info", title: "Neither is 'right'", html: "Direct promotion isn't reckless and indirect isn't bureaucratic — they fit different risk profiles. The bad choice is a heavyweight staging chain for a two-person team, or shipping straight to prod for a regulated finance workload." },
        { t: "apply", who: "Data leadership + platform team choose the architecture; it shapes everyone's git workflow.", when: "Direct: smaller teams, strong CI, low blast radius. Indirect: larger/regulated teams, high-stakes prod, need for UAT.", where: "It's a branching + environment strategy: one long-lived <code>main</code> (direct) vs. a chain of promoted environments (indirect)." },
      ],
      checks: [
        { kind: "mcq", q: "A 3-person analytics team with solid CI wants to ship quickly. Which architecture fits?", options: [
          { text: "Direct promotion — merge to main deploys to prod.", correct: true, why: "Small team + strong CI is the textbook case for direct promotion: fast and simple." },
          { text: "Indirect with a QA and a staging environment.", why: "Overkill for three people — the extra environments add drift and slowness without proportional safety." },
          { text: "No CI at all, just careful reviews.", why: "Never skip CI; that's the safety net that makes direct promotion viable." },
        ], explain: "Small team + strong CI → direct promotion." },
        { kind: "mcq", q: "What's the main trade-off you accept with indirect promotion?", options: [
          { text: "More safety and validation, at the cost of complexity and slower delivery.", correct: true, why: "Extra environments buy validation/UAT but add branch management, drift risk, and latency." },
          { text: "Faster deploys but no testing.", why: "It's the opposite — slower but more validated." },
          { text: "It removes the need for CI.", why: "CI is still essential in both architectures." },
        ], explain: "Indirect trades speed/simplicity for extra validation — right for high-stakes prod." },
      ],
    },

    /* ---------------- BOSS ---------------- */
    {
      id: "boss", boss: true, num: "boss", title: "Boss: Configure the CI run", subtitle: "A trickier change — get the blast radius exactly right.", tags: ["Slim CI"],
      intro: [
        { t: "lead", html: "Final CI call. This PR changes <strong>only <code>stg_customers</code></strong>. But <code>stg_customers</code> feeds <em>two</em> marts — so its blast radius is bigger than the last one. Configure Slim CI to rebuild exactly the right set and defer the rest." },
        { t: "callout", variant: "key", title: "Think about downstream", html: "Which models read from <code>stg_customers</code>? Everything it flows into must rebuild; everything else defers to prod. Mark the modified model, set <code>--defer</code>, and check." },
      ],
      challenge: {
        type: "sandbox-dag",
        goal: "The PR modifies only <code>stg_customers</code>. Select it as modified and enable <code>--defer</code> so CI rebuilds its full blast radius (and nothing else). Then press <strong>Check my selection</strong>.",
        startModified: [], startDefer: false,
        target: { modified: ["stg_customers"], defer: true },
        successTitle: "Blast radius nailed",
        successMsg: "stg_customers rebuilds fct_orders AND dim_customers downstream — 3 models — while the rest defer to prod. That's a correct Slim CI run.",
        short: "blast radius",
      },
    },
  ],
});
