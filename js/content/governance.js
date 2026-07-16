/* content/governance.js — Chapter 1: Model Governance. Initializes DBT.content. */
window.DBT = window.DBT || {};
DBT.content = DBT.content || { chapters: [], specialBadges: [] };

DBT.content.specialBadges.push(
  { id: "contract-enforcer", name: "Contract Enforcer", icon: "fileCheck", hint: "Add a contract to a public model" },
  { id: "zero-rows-hero", name: "Zero-Rows Hero", icon: "beaker", hint: "Clear the data-quality boss" },
  { id: "slim-ci-ninja", name: "Slim CI Ninja", icon: "gitBranch", hint: "Master state:modified+" }
);

DBT.content.chapters.push({
  id: "gov",
  order: 1,
  color: "#FF694A",
  icon: "shield",
  title: "Model Governance",
  subtitle: "Turn mature models into stable, owned APIs — with groups, access, contracts & versions.",
  blurb: "In a growing dbt project, everyone can ref everything — so one rename quietly breaks dashboards nobody told you about. Governance makes your important models behave like a public API: clearly owned, access-controlled, shape-guaranteed, and versioned when they must change.",
  badge: { id: "badge-gov", name: "Governance Guardian", icon: "shieldCheck", hint: "Finish Chapter 1" },
  levels: [
    /* ---------------- 1.1 ---------------- */
    {
      id: "1", num: "1.1", title: "Why govern models at all?", subtitle: "The problem governance solves — and when it's worth it.", tags: ["Concepts"],
      learn: [
        { t: "lead", html: "dbt's superpower — <code>ref()</code> — is also its liability. Because <em>any</em> model can reference <em>any</em> other, a mature warehouse turns into a web of hidden dependencies. Rename a column in a 'internal' model and you might break the CFO's dashboard three hops downstream." },
        { t: "h", text: "Governance = treating mature models like APIs" },
        { t: "p", html: "A public API has an owner, a stable shape, rules about who can call it, and a real process for breaking changes. Model governance gives your dbt models the same four guarantees:" },
        { t: "list", items: [
          "<strong>Groups</strong> — bundle models under one owning team.",
          "<strong>Access</strong> — control who is allowed to <code>ref()</code> a model.",
          "<strong>Contracts</strong> — guarantee a model's columns & types before it builds.",
          "<strong>Versions</strong> — give consumers a migration window for unavoidable breaking changes.",
        ] },
        { t: "callout", variant: "key", title: "The mental model", html: "Most of your models are <em>implementation detail</em>. A few are <em>products</em> other people depend on. Governance is how you tell the difference — and protect the products." },
        { t: "apply", who: "Data platform / analytics-engineering teams running a shared dbt project that other teams or BI tools consume.", when: "Once a project is big enough that you don't personally know every downstream consumer — usually the moment a second team starts building on your models.", where: "On your <strong>mature, widely-used</strong> models (marts, shared dimensions). Leave scratch/staging models ungoverned; governance has a cost." },
      ],
      checks: [
        { kind: "mcq", q: "Why is dbt's <code>ref()</code> both a strength and a risk in a large project?", options: [
          { text: "It lets any model reference any other, so dependencies (and breaking changes) can spread invisibly.", correct: true, why: "Exactly — unrestricted refs are convenient but let a change ripple to consumers you didn't know existed." },
          { text: "It makes builds slower as the project grows.", why: "Build performance is a separate concern (that's what Slim CI addresses). Governance is about dependency safety." },
          { text: "It prevents you from testing models.", why: "ref() has nothing to do with testing — you can test any model." },
        ], explain: "Governance exists to make those invisible dependencies explicit and safe." },
        { kind: "mcq", q: "Which model is the <em>best</em> candidate for governance?", options: [
          { text: "A shared <code>dim_customers</code> mart used by three teams and two BI dashboards.", correct: true, why: "Mature + widely depended-on = exactly what you want to protect as an API." },
          { text: "A one-off <code>tmp_debug_nulls</code> model you made this morning.", why: "Scratch models don't need governance overhead — nobody depends on them." },
          { text: "An intermediate model only its own group uses.", why: "This one wants privacy, but it isn't the flagship API — the shared mart is the clearest candidate." },
        ], explain: "Govern the models other people build on; skip the scratch work." },
      ],
    },

    /* ---------------- 1.2 ---------------- */
    {
      id: "2", num: "1.2", title: "Groups & ownership", subtitle: "Bundle models under one team so every model has a clear owner.", tags: ["Groups"],
      learn: [
        { t: "lead", html: "A <strong>group</strong> is a named bundle of models with a single <strong>owner</strong>. Groups turn the implicit DAG into explicit, owned territory — and they're the prerequisite for the <code>private</code> access level you'll meet next." },
        { t: "h", text: "Defining a group" },
        { t: "p", html: "Groups are declared with the <code>groups:</code> key in any <code>.yml</code> file — each has a <code>name</code> and an <code>owner</code>:" },
        { t: "code", lang: "yaml", file: "models/marts/_groups.yml", code: "groups:\n  - name: customer_success\n    owner:\n      name: Customer Success Team\n      email: cx@jaffle.shop" },
        { t: "h", text: "Putting a model in a group" },
        { t: "p", html: "Three ways, from broad to specific. The most common is a bulk assignment by folder in <code>dbt_project.yml</code>:" },
        { t: "code", lang: "yaml", file: "dbt_project.yml", code: "models:\n  jaffle_shop:\n    marts:\n      +group: customer_success   # everything in marts/ joins this group" },
        { t: "p", html: "…or per-model in its YAML config (this is the current v1.10+ form, nested under <code>config:</code>):" },
        { t: "code", lang: "yaml", file: "models/marts/_models.yml", code: "models:\n  - name: dim_customers\n    config:\n      group: customer_success" },
        { t: "callout", variant: "warn", title: "Two rules to remember", html: "A model belongs to <strong>exactly one</strong> group, and groups <strong>cannot be nested</strong>. A per-model <code>group</code> overrides a folder-level <code>+group</code>." },
        { t: "apply", who: "Whoever owns a data domain — often mapped to a team (finance, marketing) or a source system (github, salesforce).", when: "Set up groups <em>before</em> you start locking models down: <code>private</code> means 'same group only', so groups have to exist first.", where: "Bulk-assign with <code>+group</code> at the folder level in <code>dbt_project.yml</code>; override per-model only for the exceptions." },
      ],
      example: [
        { t: "h", text: "A realistic slice" },
        { t: "p", html: "One YAML file can declare the group and assign models to it. Here Customer Success owns three models:" },
        { t: "code", lang: "yaml", file: "models/marts/customers/_customers.yml", code: "groups:\n  - name: customer_success\n    owner:\n      name: Customer Success Team\n      email: cx@jaffle.shop\n\nmodels:\n  - name: dim_customers\n    config:\n      group: customer_success\n\n  - name: int_customer_history_rollup\n    config:\n      group: customer_success\n\n  - name: stg_customer__survey_results\n    config:\n      group: customer_success" },
        { t: "callout", variant: "tip", title: "Ownership is documentation too", html: "The <code>owner.email</code> shows up in generated docs and in dbt Explorer. When something breaks, the on-call engineer knows exactly whose Slack to ping." },
      ],
      checks: [
        { kind: "match", q: "Match each concept to its correct rule or definition.", pairs: [
          { left: "A group has…", leftTag: "GROUPS", right: "exactly one owner (name + email)", rightTag: "RULE" },
          { left: "A model can belong to…", leftTag: "GROUPS", right: "exactly one group", rightTag: "RULE" },
          { left: "Groups can be…", leftTag: "GROUPS", right: "never nested", rightTag: "RULE" },
          { left: "Bulk-assign a folder with…", leftTag: "SYNTAX", right: "+group in dbt_project.yml", rightTag: "SYNTAX" },
        ], explain: "Groups: one owner each, one group per model, no nesting, bulk-assign by folder." },
        { kind: "mcq", q: "You set <code>+group: finance</code> on the <code>marts/</code> folder, but one model in it has <code>config: group: marketing</code>. Which group wins for that model?", options: [
          { text: "marketing — the per-model config overrides the folder default.", correct: true, why: "Right: the most specific setting wins, so the per-model group overrides the folder-level +group." },
          { text: "finance — the folder setting always wins.", why: "It's the other way around — specific beats general." },
          { text: "Both — the model ends up in two groups.", why: "Impossible: a model belongs to exactly one group." },
        ], explain: "Specific overrides general: a per-model group beats a folder-level +group." },
      ],
    },

    /* ---------------- 1.3 ---------------- */
    {
      id: "3", num: "1.3", title: "Access modifiers", subtitle: "Control exactly who is allowed to ref() each model.", tags: ["Access"],
      learn: [
        { t: "lead", html: "Access modifiers answer one question: <strong>who is allowed to <code>ref()</code> this model?</strong> There are three levels, set with <code>access:</code> under <code>config:</code>." },
        { t: "table", head: ["access", "Who can ref() it", "Use for"], rows: [
          ["<code>private</code>", "Same <strong>group</strong> only", "Implementation-detail models (intermediate transforms)"],
          ["<code>protected</code>", "Same <strong>project</strong> (the <strong>default</strong>)", "Reusable inside your project, not a cross-team API"],
          ["<code>public</code>", "<strong>Any</strong> group, package, or project", "Stable data products others depend on"],
        ], note: "<code>protected</code> is the default — kept for backward compatibility. dbt <em>recommends</em> making new models <code>private</code> to avoid accidental cross-group dependencies." },
        { t: "h", text: "What happens when you break the rule" },
        { t: "p", html: "Reference a model you're not allowed to, and dbt raises a <code>DbtReferenceError</code> at <strong>parse time</strong> — before anything builds:" },
        { t: "code", lang: "text", file: "$ dbt parse", code: "DbtReferenceError: Parsing Error\n  Node model.jaffle_shop.marketing_model attempted to reference\n  node model.jaffle_shop.finance_model, which is not allowed because\n  the referenced node is private to the finance group." },
        { t: "callout", variant: "warn", title: "Two gotchas", html: "<code>ephemeral</code> models <strong>cannot</strong> be <code>public</code>. And access is <strong>not</strong> a database permission — <code>access: public</code> does not <code>grant select</code> to anyone; use the <code>grants</code> config for that." },
        { t: "apply", who: "The model's owning group decides its access — it's a deliberate 'is this part of our public surface?' choice.", when: "Set <code>private</code> for internals, <code>public</code> only for mature models you're willing to support for others. Default new models to <code>private</code>.", where: "In the model's YAML: <code>config: access: private|protected|public</code>. Changing to <code>public</code> means a prod job rerun to apply." },
      ],
      example: [
        { t: "h", text: "One group, three access levels" },
        { t: "code", lang: "yaml", file: "models/marts/customers/_customers.yml", code: "models:\n  # public — a stable, mature interface for other teams/projects\n  - name: dim_customers\n    config:\n      group: customer_success\n      access: public\n\n  # private — an intermediate transform, for this group ONLY\n  - name: int_customer_history_rollup\n    config:\n      group: customer_success\n      access: private\n\n  # protected — useful elsewhere in THIS project, not exposed outside\n  - name: stg_customer__survey_results\n    config:\n      group: customer_success\n      access: protected" },
        { t: "callout", variant: "info", title: "You'll see the legacy form too", html: "Before v1.10, <code>group</code> and <code>access</code> sat at the top level of the model (not under <code>config:</code>). Both forms work; the sandbox accepts either." },
      ],
      checks: [
        { kind: "refcheck", q: "Can <code>marketing_attribution</code> reference <code>fct_revenue</code>?", scenario: { type: "models", from: { name: "marketing_attribution", group: "marketing", access: "protected" }, to: { name: "fct_revenue", group: "finance", access: "private" } }, options: [
          { text: "No — fct_revenue is private to the finance group.", correct: true, why: "private = same group only. marketing is a different group, so this raises a DbtReferenceError." },
          { text: "Yes — they're in the same project.", why: "Same project would be enough for protected, but this target is private — group-scoped, not project-scoped." },
          { text: "Yes — protected models can ref anything.", why: "The consumer's access doesn't matter; what matters is the target's access. The target is private." },
        ], explain: "It's the <em>target's</em> access that gates the ref. private → same group only." },
        { kind: "refcheck", q: "Can <code>marketing_attribution</code> reference <code>fct_revenue</code> now?", scenario: { type: "models", from: { name: "marketing_attribution", group: "marketing", access: "protected" }, to: { name: "fct_revenue", group: "finance", access: "public" } }, options: [
          { text: "Yes — public models can be ref'd by any group or project.", correct: true, why: "Promoting the target to public opens it to everyone — that's exactly how you fix the earlier error." },
          { text: "No — different groups still can't share.", why: "public overrides group boundaries entirely." },
        ], explain: "Promote the target to <code>public</code> and cross-group refs are allowed." },
        { kind: "mcq", q: "What is the default access level for a model you create without specifying one?", options: [
          { text: "protected — same project can ref it.", correct: true, why: "protected is the backward-compatible default." },
          { text: "private — locked to its group.", why: "That's the recommended choice for new models, but not the default you get automatically." },
          { text: "public — open to everyone.", why: "public is never the default; that would defeat the purpose." },
        ], explain: "Default = protected; dbt recommends explicitly choosing private for new models." },
      ],
      practice: {
        type: "sandbox-governance", mode: "refcheck",
        goal: "The <code>marketing_attribution</code> model refs <code>fct_revenue</code>, but that ref is <strong>illegal</strong>. Fix the access so the reference is allowed — <em>without deleting the ref</em>.",
        starter: "# In real dbt, refs come from your SQL. Here we list them under `refs:` for the exercise.\ngroups:\n  - name: finance\n    owner: {name: Finance, email: fin@co}\n  - name: marketing\n    owner: {name: Marketing, email: mkt@co}\n\nmodels:\n  - name: stg_orders\n    config: {group: finance, access: protected}\n\n  - name: fct_revenue\n    config: {group: finance, access: private}   # 👈 change this\n    refs: [stg_orders]\n\n  - name: marketing_attribution\n    config: {group: marketing, access: protected}\n    refs: [fct_revenue]   # ❌ blocked: fct_revenue is private to finance\n",
        requires: [
          { label: "<code>marketing_attribution</code> still references <code>fct_revenue</code>", test: (r) => r.byName.marketing_attribution && (r.byName.marketing_attribution.refs || []).indexOf("fct_revenue") >= 0 },
          { label: "<code>fct_revenue</code> is reachable from another group (made <code>public</code>)", test: (r) => r.byName.fct_revenue && r.byName.fct_revenue.access === "public" },
        ],
      },
    },

    /* ---------------- 1.4 ---------------- */
    {
      id: "4", num: "1.4", title: "Model contracts", subtitle: "Guarantee a model's columns & types — before it builds.", tags: ["Contracts"], award: "contract-enforcer",
      learn: [
        { t: "lead", html: "A <strong>contract</strong> is a promise about a model's <em>shape</em>. Turn it on and dbt runs a <strong>preflight check</strong>: if the built columns and types don't match what you declared, the model <strong>fails to build</strong>. No silently-changed schema reaching downstream." },
        { t: "code", lang: "yaml", file: "models/marts/_models.yml", code: "models:\n  - name: dim_customers\n    config:\n      contract:\n        enforced: true          # 👈 the switch\n    columns:\n      - name: customer_id\n        data_type: int          # every column needs a data_type\n        constraints:\n          - type: not_null\n      - name: customer_name\n        data_type: string" },
        { t: "callout", variant: "key", title: "Contracts are all-or-nothing", html: "When <code>enforced: true</code>, <strong>every</strong> column must declare a <code>name</code> and a <code>data_type</code>. There's no partial contract." },
        { t: "h", text: "The platform caveat that trips people up" },
        { t: "p", html: "You can <em>declare</em> constraints (<code>not_null</code>, <code>primary_key</code>, <code>unique</code>, <code>foreign_key</code>, <code>check</code>) — but whether the warehouse <strong>enforces</strong> them varies a lot:" },
        { t: "table", head: ["Platform", "not_null", "primary_key / unique", "check"], rows: [
          ["Postgres", "<span class='yes'>enforced</span>", "<span class='yes'>enforced</span>", "<span class='yes'>enforced</span>"],
          ["Snowflake / Redshift / BigQuery", "<span class='yes'>enforced</span>", "<span class='no'>metadata only</span>", "<span class='no'>—</span>"],
          ["Databricks", "<span class='yes'>enforced</span>", "<span class='no'>metadata only</span>", "<span class='yes'>enforced</span>"],
        ], note: "On the big cloud warehouses, only <code>not_null</code> is truly enforced. Treat <code>primary_key</code>/<code>unique</code> constraints as documentation and back them with <strong>data tests</strong> (Chapter 2)." },
        { t: "callout", variant: "info", title: "Contract vs. test", html: "A <strong>contract</strong> validates <em>shape</em> at build time (wrong shape → won't build). A <strong>data test</strong> validates <em>content</em> after the build (e.g. 'are these values actually unique?'). You want both." },
        { t: "apply", who: "The owning team of any model other people build on — especially anything you're about to mark <code>public</code>.", when: "Add a contract when a model is a real interface: consumed by other groups/projects, or by BI/reports. Contracts are also the prerequisite for versioning.", where: "<code>config: contract: {enforced: true}</code> plus a typed <code>columns:</code> list. Supported for <code>table</code>/<code>incremental</code> (and <code>view</code>, names+types only)." },
      ],
      example: [
        { t: "h", text: "What the preflight actually catches" },
        { t: "p", html: "Say your contract promises a <code>total_amount</code> column of type <code>numeric</code>, but someone edits the SQL and it now returns <code>varchar</code>. On the next build:" },
        { t: "code", lang: "text", file: "$ dbt build --select dim_orders", code: "Compilation Error in model dim_orders\n  This model has an enforced contract that failed.\n  Please ensure the name, data_type, and number of columns in your\n  contract match the columns in your model's definition.\n\n  | column_name  | definition_type | contract_type | mismatch_reason    |\n  | total_amount | TEXT            | NUMERIC       | data type mismatch |" },
        { t: "callout", variant: "tip", title: "This is the whole point", html: "The build <strong>stops here</strong> instead of shipping a broken schema to every dashboard downstream. The contract turned a silent data incident into a loud, local build failure." },
      ],
      checks: [
        { kind: "mcq", q: "With <code>contract: enforced: true</code>, when does the shape check run?", options: [
          { text: "As a preflight at build time — a mismatch fails the build.", correct: true, why: "Right: it runs before/as the model builds, so bad shapes never reach downstream." },
          { text: "After the build, as a warning you can ignore.", why: "That's closer to how a data test behaves. A contract hard-fails the build." },
          { text: "Only when you run dbt docs.", why: "Docs generation is unrelated; the check happens on build." },
        ], explain: "Contract = build-time preflight; wrong shape → the model won't build." },
        { kind: "mcq", q: "On Snowflake, which constraint in a contract is actually <em>enforced</em> by the warehouse?", options: [
          { text: "not_null", correct: true, why: "On the big cloud warehouses, only not_null is truly enforced — the rest are metadata." },
          { text: "primary_key", why: "Declarable, but Snowflake doesn't enforce it — back it with a uniqueness data test." },
          { text: "check", why: "Snowflake doesn't enforce check constraints at all." },
        ], explain: "Cloud warehouses enforce only not_null; use data tests for uniqueness/PK guarantees." },
        { kind: "multi", q: "Which are true about model contracts? (select all)", options: [
          { text: "Every column must declare a data_type when the contract is enforced.", correct: true },
          { text: "A contract validates the model's shape, not its row-level content.", correct: true },
          { text: "You can enforce a contract on just some of the columns.", why: "No — contracts are all-or-nothing across all output columns." },
          { text: "Contracts are the prerequisite that makes versioning meaningful.", correct: true },
        ], explain: "All columns typed, shape-not-content, and contracts underpin versions." },
      ],
      practice: {
        type: "sandbox-governance", mode: "audit",
        goal: "<code>dim_customers</code> is <code>public</code> but the governance audit flags it. Make the audit clean: add an <strong>enforced contract</strong> and finish the <strong>documentation</strong> (every column needs a description).",
        starter: "models:\n  - name: stg_customers\n    config: {group: core, access: protected}\n\n  - name: dim_customers\n    description: One row per customer, with lifetime value.\n    config:\n      group: core\n      access: public\n      # 👇 add an enforced contract here\n    columns:\n      - {name: customer_id, data_type: int, description: Primary key}\n      - {name: email, data_type: string}          # 👈 missing a description\n    refs: [stg_customers]\n",
        requires: [
          { label: "<code>dim_customers</code> stays <code>public</code>", test: (r) => r.byName.dim_customers && r.byName.dim_customers.access === "public" },
          { label: "It has an <strong>enforced contract</strong>", test: (r) => r.byName.dim_customers && r.byName.dim_customers.contract === true },
        ],
      },
    },

    /* ---------------- 1.5 ---------------- */
    {
      id: "5", num: "1.5", title: "Model versions", subtitle: "A migration window for the breaking change you couldn't avoid.", tags: ["Versions"],
      learn: [
        { t: "lead", html: "Sometimes a breaking change is unavoidable — you must drop a column that outside consumers rely on. <strong>Versions</strong> let the old and new shape coexist for a while, so consumers migrate on their own schedule instead of all breaking at once." },
        { t: "code", lang: "yaml", file: "models/marts/_dim_customers.yml", code: "models:\n  - name: dim_customers\n    latest_version: 1\n    config:\n      materialized: table\n      contract: {enforced: true}\n    columns:\n      - name: customer_id\n        data_type: int\n      - name: country_name\n        data_type: varchar\n\n    versions:\n      - v: 1                      # matches the columns above\n      - v: 2                      # the breaking change:\n        columns:\n          - include: all\n            exclude: [country_name]   # v2 drops country_name" },
        { t: "h", text: "How consumers pin a version" },
        { t: "list", items: [
          "<code>ref('dim_customers', v=2)</code> → the explicit version 2.",
          "<code>ref('dim_customers')</code> → resolves to <code>latest_version</code>.",
          "Files default to <code>dim_customers_v2.sql</code> (override with <code>defined_in:</code>).",
        ] },
        { t: "callout", variant: "key", title: "The deprecation window", html: "Add <code>deprecation_date:</code> to the old version and dbt <strong>warns</strong> everyone still pinned to it. The workflow: ship the new version → bump <code>latest_version</code> → set a <code>deprecation_date</code> on the old one → let consumers migrate → remove the old version." },
        { t: "apply", who: "The owner of a mature, contracted, externally-depended-on model — the only kind worth versioning.", when: "<strong>Only</strong> for breaking changes (dropping/renaming a column, changing a type). Additive changes (a new column, a bugfix) should <em>not</em> get a new version.", where: "In the model's YAML via <code>versions:</code>. Keep it to ~2–3 live versions and bump on a predictable, communicated cadence (once or twice a year) — like a real web API." },
      ],
      example: [
        { t: "h", text: "Versions can differ in more than columns" },
        { t: "p", html: "Each version can be reconfigured independently — e.g. keep the old one cheap as a <code>view</code> while the new one is a <code>table</code>:" },
        { t: "code", lang: "yaml", file: "models/marts/_dim_customers.yml", code: "versions:\n  - v: 2\n    config:\n      materialized: table\n  - v: 1\n    config:\n      materialized: view       # thin, cheap shim during migration\n    deprecation_date: 2026-09-01" },
        { t: "callout", variant: "warn", title: "Don't over-version", html: "Versioning has a real cost (extra relations, extra surface to maintain). If a change is non-breaking, just ship it. Reserve versions for the genuinely breaking, externally-visible ones." },
      ],
      checks: [
        { kind: "mcq", q: "Which change actually justifies a <em>new version</em> of a contracted public model?", options: [
          { text: "Removing a column that outside teams currently select.", correct: true, why: "That's a breaking change to the interface — exactly what versions + a deprecation window are for." },
          { text: "Adding a brand-new column nobody references yet.", why: "Additive and non-breaking — just ship it, no version needed." },
          { text: "Fixing a bug that makes existing values more correct.", why: "Non-breaking to the shape; no version required (communicate it, sure)." },
        ], explain: "Version only breaking changes; ship additive/bugfix changes normally." },
        { kind: "mcq", q: "A consumer writes <code>ref('dim_customers')</code> with no <code>v=</code>. Which version do they get?", options: [
          { text: "Whatever is set as latest_version.", correct: true, why: "An unpinned ref always resolves to latest_version." },
          { text: "Always v1, the oldest.", why: "No — unpinned means latest, not oldest." },
          { text: "It errors until they pin a version.", why: "Unpinned refs are allowed; they resolve to latest_version." },
        ], explain: "Unpinned <code>ref()</code> → <code>latest_version</code>. Pin with <code>v=</code> to freeze." },
        { kind: "fill", q: "What YAML key do you add to the <em>old</em> version to start warning consumers that it's going away?", answer: "deprecation_date", accept: ["deprecation date", "deprecation_date:"], hint: "It's a date-valued key on the version.", placeholder: "e.g. some_key", explain: "<code>deprecation_date</code> triggers dbt's warnings and gives consumers a hard deadline." },
      ],
    },

    /* ---------------- BOSS ---------------- */
    {
      id: "boss", boss: true, num: "boss", title: "Boss: The Governance Audit", subtitle: "Clean up a messy project until it passes every governance rule.", tags: ["Audit"],
      intro: [
        { t: "lead", html: "Time to prove it. This project has <strong>public models with no contracts</strong>, an <strong>undocumented public model</strong>, and an <strong>exposure reading from a private model</strong> — the exact things <code>dbt-project-evaluator</code> flags under its <strong>Governance</strong> rules." },
        { t: "callout", variant: "key", title: "The three governance rules you must satisfy", html: "<code>fct_public_models_without_contract</code> · <code>fct_undocumented_public_models</code> (model <em>and</em> every-column descriptions) · <code>fct_exposures_dependent_on_private_models</code>." },
        { t: "p", html: "Edit the YAML on the left until the audit on the right is fully green. You'll need to add contracts, finish documentation, and promote the model an exposure depends on." },
      ],
      challenge: {
        type: "sandbox-governance", mode: "audit",
        goal: "Make the audit clean: fix <strong>all three</strong> governance-rule violations. Don't just delete things — the public models and the exposure must stay.",
        autorun: true,
        starter: "groups:\n  - name: core\n    owner: {name: Core Data, email: core@jaffle.shop}\n\nmodels:\n  - name: stg_orders\n    config: {group: core, access: protected}\n\n  # PUBLIC but no contract, and not fully documented\n  - name: fct_orders\n    config:\n      group: core\n      access: public\n    columns:\n      - {name: order_id, data_type: int}\n      - {name: amount, data_type: numeric}\n    refs: [stg_orders]\n\n  # An internal rollup the exec dashboard secretly depends on\n  - name: int_kpi_rollup\n    config: {group: core, access: private}\n    refs: [fct_orders]\n\nexposures:\n  - name: exec_dashboard\n    depends_on: [int_kpi_rollup]   # ❌ exposure on a private model\n",
        requires: [
          { label: "<code>fct_orders</code> stays <code>public</code>", test: (r) => r.byName.fct_orders && r.byName.fct_orders.access === "public" },
          { label: "The <code>exec_dashboard</code> exposure still exists", test: (r) => r.exposures.some((e) => e.name === "exec_dashboard") },
        ],
      },
    },
  ],
});
