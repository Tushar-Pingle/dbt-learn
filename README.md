# dbt Academy 🎓

An **interactive, hands-on course** for the advanced dbt skills that turn a working project into a *trustworthy* one:

1. **Model Governance** — groups, access modifiers, contracts & versions (treat mature models like APIs)
2. **Testing & Source Freshness** — generic / singular / custom tests, freshness SLAs, `dbt-utils` & `dbt-expectations`
3. **CI/CD & Slim CI** — dev vs prod, jobs, CI on every PR, and `state:modified+ --defer`

It's built for people who want to **understand the concepts and know when/where to apply them** — not to memorize syntax. Every concept comes with a "who / when / where to apply" card, interactive checks, and a **real in-browser sandbox** you practice in.

👉 It's a story-mode journey: 3 chapters → levels → boss challenges → a final capstone, with XP, badges, and progress saved in your browser.

---

## ✨ What makes it hands-on

- **Governance sandbox** — write real YAML; a rule engine (using [js-yaml](https://github.com/nodeca/js-yaml)) checks `ref()` legality across access boundaries and runs the three real **dbt-project-evaluator** governance rules.
- **SQL test sandbox** — write real SQL against seeded `customers` / `orders` / `payments` tables running in **SQLite compiled to WebAssembly** ([sql.js](https://github.com/sql-js/sql.js)). Watch "0 rows = pass" in action and catch the planted bad rows.
- **Slim CI simulator** — click models in a dependency graph to mark them "modified" and see exactly what `state:modified+` rebuilds vs. a full build.

Everything runs **locally in your browser**. No data leaves your machine, no backend, no build step.

---

## 🚀 Run it

### Option A — GitHub Pages (recommended)

**Quickest (deploy from a branch):**
1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source: "Deploy from a branch"**, pick your branch, folder **`/ (root)`**, and Save.
4. Your site goes live at `https://<your-username>.github.io/<repo>/` in a minute or two.

**Or via GitHub Actions** (auto-redeploys on every push to `main`):
1. **Settings → Pages → Source: "GitHub Actions"**.
2. Merge to `main` (or trigger the workflow manually from the **Actions** tab). The included [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes automatically.

> This is a *project* site served under `/<repo>/`, so all asset paths in the code are **relative** — it works correctly under the subpath, and an empty `.nojekyll` file makes GitHub serve every folder verbatim.

### Option B — Run locally

The sandboxes load a WebAssembly file, so serve over HTTP (not `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, etc.).

---

## 🗂️ Project structure

```
.
├── index.html                # app shell (loads vendored libs + app scripts)
├── css/styles.css            # design system (dark + light themes, dbt-orange)
├── js/
│   ├── state.js              # progress / XP / badges (localStorage)
│   ├── ui.js                 # icons, code editor, toasts, content renderer
│   ├── quiz.js               # interactive-check engine
│   ├── app.js                # hash router + screens (map, chapter, level)
│   ├── content/*.js          # lessons, checks & challenges (verified vs. dbt docs)
│   └── sandbox/*.js          # governance (YAML), testing (sql.js), ci/cd (DAG)
├── assets/fonts/             # self-hosted webfonts (Bricolage Grotesque, IBM Plex)
├── vendor/                   # js-yaml, sql.js (+wasm), Prism — all self-contained
└── .github/workflows/        # Pages deploy workflow
```

No frameworks, no bundler, no `npm install`. The `vendor/` libraries are committed so the site is fully self-contained (works offline after first load).

---

## 📚 Accuracy & attribution

Lesson content was written and cross-checked against the official [dbt documentation](https://docs.getdbt.com/) and the [dbt-project-evaluator](https://dbt-labs.github.io/dbt-project-evaluator/) governance rules. Version-sensitive details (e.g. `tests:` → `data_tests:` at dbt v1.8, `config:`-nested governance at v1.10) are called out in-app.

This is an **unofficial** community learning project and is **not affiliated with or endorsed by dbt Labs**. "dbt" is a trademark of dbt Labs, Inc.

Vendored libraries (all MIT-licensed): js-yaml, sql.js, Prism. Fonts: Bricolage Grotesque & IBM Plex (SIL Open Font License).
