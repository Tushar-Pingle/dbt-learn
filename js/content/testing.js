/* content/testing.js — Chapter 2: Testing & Source Freshness. */
window.DBT = window.DBT || {};
DBT.content = DBT.content || { chapters: [], specialBadges: [] };

DBT.content.chapters.push({
  id: "test",
  order: 2,
  color: "#34C77B",
  icon: "beaker",
  title: "Testing & Source Freshness",
  subtitle: "Automated quality gates: generic tests, singular tests, custom tests, and freshness SLAs.",
  blurb: "A model that builds isn't the same as a model you can trust. dbt tests are assertions about your data that run automatically — every test compiles to one idea: a query that returns the rows that break your rule. Zero rows returned = pass. This chapter covers the four built-in tests, custom SQL tests, reusable macro tests, and how source freshness stops stale upstream data before it poisons everything downstream.",
  badge: { id: "badge-test", name: "Quality Gatekeeper", icon: "listChecks", hint: "Finish Chapter 2" },
  levels: [
    /* ---------------- 2.1 ---------------- */
    {
      id: "1", num: "2.1", title: "The one idea behind every test", subtitle: "Why 'zero rows returned = pass' is the whole mental model.", tags: ["Concepts"],
      learn: [
        { t: "lead", html: "Every dbt test — built-in or custom — boils down to a single query: <strong>select the rows that violate your rule</strong>. dbt runs it and counts the results. <strong>Zero rows = pass.</strong> One or more rows = fail (and, in a <code>dbt build</code>, that failure stops downstream models)." },
        { t: "code", lang: "sql", file: "the shape of every test", code: "-- \"no payment should be negative\"\nselect *\nfrom payments\nwhere amount_cents < 0    -- ← returns only the BAD rows\n-- 0 rows back  → the assertion holds → PASS" },
        { t: "callout", variant: "key", title: "Flip your intuition", html: "You don't write a query that finds <em>good</em> data. You write one that finds <em>bad</em> data, and hope it comes back empty. Empty result = clean data." },
        { t: "h", text: "Two flavors of test" },
        { t: "list", items: [
          "<strong>Generic tests</strong> — reusable, configured in YAML (<code>unique</code>, <code>not_null</code>, …). One line, applied to a column.",
          "<strong>Singular tests</strong> — a bespoke <code>.sql</code> file for a one-off rule. Just the 'find the bad rows' query.",
        ] },
        { t: "apply", who: "Every analytics engineer — testing isn't optional polish, it's how you catch data incidents before stakeholders do.", when: "Add tests as you build each model (keys, not-nulls, valid values, referential integrity). Run them in CI on every PR and in production on every build.", where: "Generic tests live in YAML next to the model; singular tests live in the <code>tests/</code> folder. Both run via <code>dbt test</code> or as part of <code>dbt build</code>." },
      ],
      checks: [
        { kind: "mcq", q: "A dbt test query returns <strong>0 rows</strong>. What does that mean?", options: [
          { text: "The test passes — no rows violate the rule.", correct: true, why: "Zero failing rows = the assertion holds = pass." },
          { text: "The test failed to run.", why: "0 rows is a successful run with nothing wrong; a run error is different." },
          { text: "The table is empty.", why: "The test query returns only violating rows, not the whole table." },
        ], explain: "0 failing rows = pass. That's the core mental model." },
        { kind: "mcq", q: "Where does a <em>singular</em> test live?", options: [
          { text: "As a .sql file in the tests/ directory.", correct: true, why: "Singular tests are standalone SQL files under tests/." },
          { text: "As a line of YAML under a column.", why: "That's a generic test. Singular tests are their own SQL files." },
          { text: "Inside the model's SQL itself.", why: "Tests are separate from the model definition." },
        ], explain: "Singular = a .sql file in tests/; generic = a line in YAML." },
      ],
    },

    /* ---------------- 2.2 ---------------- */
    {
      id: "2", num: "2.2", title: "The four generic tests", subtitle: "unique, not_null, accepted_values, relationships — your everyday workhorses.", tags: ["Generic tests"],
      learn: [
        { t: "lead", html: "Generic tests are pre-built assertions you attach to a column in YAML. Four cover the vast majority of real checks. Since dbt <strong>v1.8</strong> they live under the <code>data_tests:</code> key (the old <code>tests:</code> still works as an alias)." },
        { t: "code", lang: "yaml", file: "models/marts/_orders.yml", code: "models:\n  - name: orders\n    columns:\n      - name: order_id\n        data_tests:\n          - unique\n          - not_null\n\n      - name: status\n        data_tests:\n          - accepted_values:\n              values: ['placed', 'shipped', 'completed', 'returned', 'pending']\n\n      - name: customer_id\n        data_tests:\n          - relationships:\n              to: ref('customers')\n              field: customer_id" },
        { t: "table", head: ["Test", "Asserts that…", "Fails when it finds…"], rows: [
          ["<code>unique</code>", "no value repeats in the column", "duplicate values"],
          ["<code>not_null</code>", "the column has no NULLs", "NULL values"],
          ["<code>accepted_values</code>", "every value is in a fixed set", "any out-of-set value"],
          ["<code>relationships</code>", "every value exists in a parent table", "orphan / dangling references"],
        ] },
        { t: "callout", variant: "info", title: "Version footnote", html: "On dbt <strong>v1.10.5+</strong> the current docs nest test args under an <code>arguments:</code> key. The flat form shown above works on every 1.x version — learn it first." },
        { t: "apply", who: "The model author — attach tests as you write each model's YAML.", when: "Put <code>unique</code>+<code>not_null</code> on every primary key, <code>accepted_values</code> on every status/enum column, and <code>relationships</code> on every foreign key.", where: "In the model's properties YAML, under each column's <code>data_tests:</code> list." },
      ],
      example: [
        { t: "h", text: "How a generic test compiles" },
        { t: "p", html: "That one-line <code>relationships</code> test compiles to exactly the 'find the bad rows' query you'd write by hand:" },
        { t: "code", lang: "sql", file: "compiled: relationships(customer_id → customers)", code: "select o.customer_id\nfrom orders o\nleft join customers c on o.customer_id = c.customer_id\nwhere c.customer_id is null    -- orders pointing at a missing customer" },
        { t: "callout", variant: "tip", title: "This is why the sandbox works", html: "dbt can't run on SQLite — but every generic test <em>is</em> just a SQL query like this. In the practice below you run the compiled query directly and watch it catch (or miss) the planted bad rows." },
      ],
      checks: [
        { kind: "match", q: "Match each column problem to the generic test that catches it.", pairs: [
          { left: "Duplicate primary keys", leftTag: "PROBLEM", right: "unique", rightTag: "TEST" },
          { left: "A NULL in a required column", leftTag: "PROBLEM", right: "not_null", rightTag: "TEST" },
          { left: "status = 'refunded' (not allowed)", leftTag: "PROBLEM", right: "accepted_values", rightTag: "TEST" },
          { left: "order points to a missing customer", leftTag: "PROBLEM", right: "relationships", rightTag: "TEST" },
        ], explain: "unique/not_null for keys, accepted_values for enums, relationships for foreign keys." },
        { kind: "mcq", q: "Since dbt v1.8, what is the canonical YAML key for attaching tests?", options: [
          { text: "data_tests: (tests: still works as an alias)", correct: true, why: "v1.8 introduced data_tests: to disambiguate from unit tests; tests: remains a valid alias." },
          { text: "assertions:", why: "Not a dbt key." },
          { text: "checks:", why: "Not a dbt key either." },
        ], explain: "Use <code>data_tests:</code>; <code>tests:</code> is the legacy alias." },
      ],
      practice: {
        type: "sandbox-testing", expect: "find", findCount: 1, mustContain: ["status"], short: "accepted_values",
        goal: "The <code>orders</code> table has one row with an invalid <code>status</code>. Write (or load) the test that catches it. A good test returns exactly that one bad row. Try the other templates too — see which ones come back empty.",
        starter: "-- accepted_values on orders.status\n-- return rows whose status is NOT in the allowed set\nselect *\nfrom orders\nwhere status not in ('placed', 'shipped', 'completed', 'returned', 'pending');",
        templates: [
          { label: "unique(order_id)", sql: "select order_id, count(*) as n\nfrom orders\ngroup by order_id\nhaving count(*) > 1;" },
          { label: "not_null(order_id)", sql: "select *\nfrom orders\nwhere order_id is null;" },
          { label: "accepted_values(status)", sql: "select *\nfrom orders\nwhere status not in ('placed', 'shipped', 'completed', 'returned', 'pending');" },
          { label: "relationships(customer_id)", sql: "select o.*\nfrom orders o\nleft join customers c on o.customer_id = c.customer_id\nwhere c.customer_id is null;" },
        ],
      },
    },

    /* ---------------- 2.3 ---------------- */
    {
      id: "3", num: "2.3", title: "Singular tests", subtitle: "A custom SQL file for the rule no built-in covers.", tags: ["Singular tests"],
      learn: [
        { t: "lead", html: "When no generic test fits, write a <strong>singular test</strong>: a plain <code>.sql</code> file in <code>tests/</code> containing a <code>SELECT</code> that returns the offending rows. Same rule as always — 0 rows returned = pass." },
        { t: "code", lang: "sql", file: "tests/assert_no_negative_payments.sql", code: "-- fails if any payment has a negative amount\nselect\n    payment_id,\n    amount_cents\nfrom {{ ref('stg_payments') }}\nwhere amount_cents < 0" },
        { t: "p", html: "Drop that file in <code>tests/</code>, run <code>dbt test</code>, and dbt executes it and counts the rows. It's the most direct expression of the whole testing idea: describe the bad data, and assert there is none." },
        { t: "callout", variant: "tip", title: "When to reach for singular", html: "Business rules that span columns or tables — \"a shipped order must have a payment\", \"refund_amount ≤ order_amount\". If you find yourself writing the same singular test twice, that's your cue to promote it to a <em>custom generic</em> test (next level)." },
        { t: "apply", who: "Any engineer encoding a business rule the built-ins can't express.", when: "For one-off, model-specific assertions — especially multi-column or cross-table logic.", where: "A <code>.sql</code> file under the <code>tests/</code> directory. Reference models with <code>{{ ref(...) }}</code> just like a normal model." },
      ],
      checks: [
        { kind: "mcq", q: "Your singular test's SELECT returns 4 rows during <code>dbt build</code>. What happens?", options: [
          { text: "The test fails, and downstream models depending on it are skipped.", correct: true, why: "In dbt build, a failing test halts the affected part of the DAG — bad data doesn't flow downstream." },
          { text: "Nothing — singular tests only warn.", why: "By default a returning-rows test errors; build stops the affected path." },
          { text: "dbt auto-deletes the 4 bad rows.", why: "dbt never mutates your data — it reports, you fix." },
        ], explain: "Returning rows = failure; in <code>build</code> it protects downstream models by stopping." },
        { kind: "fill", q: "In a singular test file, what SQL keyword must the file start with (the thing that returns the failing rows)?", answer: "select", accept: ["a select", "select statement"], hint: "It's the query that surfaces bad rows.", placeholder: "one word", explain: "A singular test is just a <code>SELECT</code> that returns violating rows." },
      ],
      practice: {
        type: "sandbox-testing", expect: "find", findCount: 1, mustContain: ["payments", "amount_cents"], short: "singular test",
        goal: "Write a singular test that catches any payment with a <strong>negative amount</strong>. It should return exactly the one bad row from <code>payments</code>.",
        starter: "-- singular test: no payment may be negative\n-- complete the WHERE clause so it returns only bad rows\nselect payment_id, amount_cents\nfrom payments\nwhere /* your condition */ ;",
      },
    },

    /* ---------------- 2.4 ---------------- */
    {
      id: "4", num: "2.4", title: "Custom generic tests", subtitle: "Write a test once (with Jinja), reuse it everywhere.", tags: ["Macros"],
      learn: [
        { t: "lead", html: "A <strong>custom generic test</strong> is a singular test with the specifics pulled out into parameters. You write it once as a Jinja <code>{% test %}</code> block, then apply it to any column in YAML — this is the reusable 'macro' skill." },
        { t: "code", lang: "sql", file: "tests/generic/not_negative.sql", code: "{% test not_negative(model, column_name) %}\n\nselect *\nfrom {{ model }}\nwhere {{ column_name }} < 0\n\n{% endtest %}" },
        { t: "p", html: "The special args <code>model</code> and <code>column_name</code> are filled in by dbt. Now attach it like any built-in:" },
        { t: "code", lang: "yaml", file: "models/_models.yml", code: "models:\n  - name: payments\n    columns:\n      - name: amount_cents\n        data_tests:\n          - not_negative      # your custom test, reused" },
        { t: "h", text: "Add your own arguments" },
        { t: "code", lang: "sql", file: "tests/generic/at_most.sql", code: "{% test at_most(model, column_name, max_value) %}\nselect * from {{ model }}\nwhere {{ column_name }} > {{ max_value }}\n{% endtest %}" },
        { t: "code", lang: "yaml", file: "attach with an argument", code: "      - name: amount_cents\n        data_tests:\n          - at_most:\n              max_value: 1000000" },
        { t: "apply", who: "The team, once — then everyone reuses it. This is how you standardize data-quality rules across a project.", when: "The moment you write the same singular test a second time. Parameterize it and reuse.", where: "In <code>tests/generic/</code> (or <code>macros/</code>) as a <code>{% test %}</code> block; apply from any model's YAML by its name." },
      ],
      checks: [
        { kind: "mcq", q: "What signals that you should turn a singular test into a <em>custom generic</em> one?", options: [
          { text: "You're about to copy-paste the same test logic onto a second column/model.", correct: true, why: "Repetition is the trigger: parameterize it once, reuse everywhere." },
          { text: "The test is slow.", why: "Performance isn't the reason to generalize; reuse is." },
          { text: "The test has a syntax error.", why: "Unrelated — fix the bug regardless of test type." },
        ], explain: "Reuse drives the jump from singular → custom generic." },
        { kind: "mcq", q: "In <code>{% test not_negative(model, column_name) %}</code>, where do <code>model</code> and <code>column_name</code> come from?", options: [
          { text: "dbt fills them in based on where you attach the test in YAML.", correct: true, why: "They're standard arguments dbt injects — the model relation and the column you attached it to." },
          { text: "You hardcode them inside the test.", why: "No — that would defeat reuse. dbt provides them per attachment." },
          { text: "They're random placeholders.", why: "They're meaningful, dbt-provided arguments." },
        ], explain: "<code>model</code> and <code>column_name</code> are supplied by dbt per attachment — that's what makes it reusable." },
      ],
    },

    /* ---------------- 2.5 ---------------- */
    {
      id: "5", num: "2.5", title: "Source freshness", subtitle: "Catch stale upstream data before it poisons every model.", tags: ["Freshness"],
      learn: [
        { t: "lead", html: "Tests check the data you build. <strong>Source freshness</strong> checks the data arriving <em>into</em> your warehouse — has the upstream load actually happened recently enough? If your ingestion silently broke last night, freshness catches it before you transform yesterday's stale rows into today's 'fresh' dashboard." },
        { t: "code", lang: "yaml", file: "models/staging/_sources.yml", code: "sources:\n  - name: jaffle_shop\n    database: raw\n    loaded_at_field: _etl_loaded_at\n    freshness:\n      warn_after:  {count: 12, period: hour}   # warn if newest row > 12h old\n      error_after: {count: 24, period: hour}   # error if newest row > 24h old\n    tables:\n      - name: orders\n        freshness:                              # per-table override\n          warn_after:  {count: 6,  period: hour}\n          error_after: {count: 12, period: hour}" },
        { t: "p", html: "Run it with <code>dbt source freshness</code>. dbt looks at the newest <code>loaded_at_field</code> timestamp and compares its age to your thresholds:" },
        { t: "list", items: [
          "<strong>warn</strong> — surfaces a warning, the run <em>continues</em>.",
          "<strong>error</strong> — non-zero exit, the job <em>fails</em>. Wire this as a gate before your build and stale data never gets transformed.",
        ] },
        { t: "callout", variant: "info", title: "Nice modern touches", html: "<code>period</code> is <code>minute</code>/<code>hour</code>/<code>day</code>. On metadata-capable warehouses you can omit <code>loaded_at_field</code> and dbt uses table metadata. An optional <code>filter</code> prunes partitions so the check stays cheap." },
        { t: "apply", who: "Whoever owns the pipeline's reliability — freshness is an SLA on your <em>inputs</em>.", when: "On every source that feeds important models, run <code>dbt source freshness</code> on a schedule (and as a gate before production builds).", where: "Under <code>freshness:</code> in your <code>sources:</code> YAML — source-level defaults with per-table overrides; set <code>freshness: null</code> to disable a table." },
      ],
      checks: [
        { kind: "predict", q: "Given the thresholds below, what does <code>dbt source freshness</code> report?", scenario: { type: "freshness", lastLoaded: "8 hours ago", warn: "12 hours", error: "24 hours", age: "8 hours", gapHours: 8, warnHours: 12, errorHours: 24 }, options: [
          { text: "Pass — the data is fresher than the warn threshold.", correct: true, why: "8h < 12h warn threshold, so it's well within SLA. Pass." },
          { text: "Warn", why: "Warn only starts once age passes 12h." },
          { text: "Error", why: "Error is for age past 24h." },
        ], explain: "Age (8h) is below warn (12h) → pass." },
        { kind: "predict", q: "And now?", scenario: { type: "freshness", lastLoaded: "18 hours ago", warn: "12 hours", error: "24 hours", age: "18 hours", gapHours: 18, warnHours: 12, errorHours: 24 }, options: [
          { text: "Warn — past warn_after (12h) but not yet error_after (24h).", correct: true, why: "18h sits between the two thresholds → warning, run continues." },
          { text: "Pass", why: "18h is older than the 12h warn threshold." },
          { text: "Error", why: "Not yet — error kicks in after 24h." },
        ], explain: "Between warn and error thresholds → warn (run continues)." },
        { kind: "predict", q: "One more — the overnight load clearly failed:", scenario: { type: "freshness", lastLoaded: "30 hours ago", warn: "12 hours", error: "24 hours", age: "30 hours", gapHours: 30, warnHours: 12, errorHours: 24 }, options: [
          { text: "Error — past error_after (24h); the freshness job fails.", correct: true, why: "30h > 24h error threshold → error → non-zero exit, blocking the build gate." },
          { text: "Warn", why: "It's past the error threshold, not just warn." },
          { text: "Pass", why: "30h stale is exactly what freshness exists to catch." },
        ], explain: "Past error_after → error → the job fails, stopping stale data downstream." },
      ],
    },

    /* ---------------- 2.6 ---------------- */
    {
      id: "6", num: "2.6", title: "Packages: don't reinvent tests", subtitle: "dbt-utils & dbt-expectations give you dozens of pre-built tests.", tags: ["Packages"],
      learn: [
        { t: "lead", html: "Before writing a custom test, check whether a package already has it. Two are near-universal: <strong>dbt-utils</strong> and <strong>dbt-expectations</strong>. Add them to <code>packages.yml</code>, run <code>dbt deps</code>, and dozens of tests are yours." },
        { t: "code", lang: "yaml", file: "packages.yml", code: "packages:\n  - package: dbt-labs/dbt_utils\n    version: 1.3.0\n  - package: metaplane/dbt_expectations   # maintainership moved to metaplane/\n    version: 0.10.10" },
        { t: "code", lang: "yaml", file: "using them in a model", code: "models:\n  - name: order_items\n    data_tests:\n      - dbt_utils.unique_combination_of_columns:\n          combination_of_columns: [order_id, product_id]\n    columns:\n      - name: amount\n        data_tests:\n          - dbt_expectations.expect_column_values_to_be_between:\n              min_value: 0\n              max_value: 10000" },
        { t: "table", head: ["Need", "Reach for"], rows: [
          ["Uniqueness across multiple columns", "<code>dbt_utils.unique_combination_of_columns</code>"],
          ["Value within a numeric range", "<code>dbt_utils.accepted_range</code>"],
          ["Value between bounds (expectations style)", "<code>dbt_expectations.expect_column_values_to_be_between</code>"],
          ["Matches a regex / string length", "<code>dbt_expectations.expect_column_values_to_match_regex</code>"],
        ] },
        { t: "callout", variant: "warn", title: "Pin, and check the source", html: "Package versions move — confirm the current version on hub.getdbt.com and pin it. (<code>dbt_expectations</code> pulls in <code>dbt_utils</code>/<code>dbt_date</code> transitively.)" },
        { t: "apply", who: "The whole team — packages standardize tests and save you writing macros.", when: "Reach for a package test before writing a custom one. Custom generic tests are for the rules packages don't cover.", where: "Declared in <code>packages.yml</code> + <code>dbt deps</code>; referenced as <code>package_name.test_name</code> in YAML." },
      ],
      checks: [
        { kind: "mcq", q: "You need to assert that <code>(order_id, product_id)</code> is unique <em>together</em>. Best tool?", options: [
          { text: "dbt_utils.unique_combination_of_columns", correct: true, why: "Purpose-built for multi-column uniqueness — no custom SQL needed." },
          { text: "A plain unique test on order_id", why: "That would wrongly reject legitimate repeats of order_id across products." },
          { text: "Write a brand-new custom generic test", why: "Unnecessary — the package already ships exactly this." },
        ], explain: "Check packages first; <code>unique_combination_of_columns</code> is the ready-made fit." },
        { kind: "mcq", q: "How do you install packages so their tests become available?", options: [
          { text: "List them in packages.yml, then run dbt deps.", correct: true, why: "packages.yml + dbt deps installs them into dbt_packages/." },
          { text: "pip install dbt-utils", why: "dbt packages aren't Python packages; they're installed via dbt deps." },
          { text: "Copy the test SQL into your repo by hand.", why: "That defeats the purpose — use the package manager." },
        ], explain: "<code>packages.yml</code> + <code>dbt deps</code>." },
      ],
    },

    /* ---------------- BOSS ---------------- */
    {
      id: "boss", boss: true, num: "boss", title: "Boss: The Data-Quality Gauntlet", subtitle: "Hunt down the orphaned orders with a relationships test.", tags: ["Referential integrity"], award: "zero-rows-hero",
      intro: [
        { t: "lead", html: "The <code>orders</code> table has an order pointing at a <strong>customer that doesn't exist</strong> — a dangling foreign key that would quietly drop rows from every customer-level join downstream. Catch it." },
        { t: "callout", variant: "key", title: "Your weapon: the relationships test", html: "Return every <code>orders</code> row whose <code>customer_id</code> has no match in <code>customers</code>. That's a <code>LEFT JOIN … WHERE parent IS NULL</code>. Exactly one row is broken." },
      ],
      challenge: {
        type: "sandbox-testing", expect: "find", findCount: 1, mustContain: ["customers", "join"], short: "referential integrity",
        goal: "Write the <code>relationships</code> test: return the <code>orders</code> row whose <code>customer_id</code> doesn't exist in <code>customers</code>. Catch exactly the one orphan.",
        starter: "-- relationships: orders.customer_id must exist in customers.customer_id\nselect o.*\nfrom orders o\nleft join customers c on o.customer_id = c.customer_id\nwhere /* which rows are orphans? */ ;",
      },
    },
  ],
});
