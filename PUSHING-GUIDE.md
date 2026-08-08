# FieldFlix — pushing to repos guide

Reference for pushing frontend and backend changes safely. The workspace has **two separate git repos** — never treat `ff/` as one monorepo for commits.

---

## Repo map

| Repo | Local path | GitHub remote | Default branch | Role |
|------|------------|---------------|----------------|------|
| **Frontend (mobile + web)** | `frontend/FieldFlix-App/` | `https://github.com/DevionX-Technologies/FieldFlix-App.git` | `finalaapp` | Production app / OTA |
| **Backend (Nest API)** | `FieldFlix-Backend-clean/` | `https://github.com/DevionX-Technologies/FieldfFlix-Backend.git` | `main` | API + ECS deploy |

Note the backend repo name typo on GitHub: **FieldfFlix-Backend** (double `f`).

---

## Branch strategy (frontend)

| Branch | Push when | Do **not** use for |
|--------|-----------|-------------------|
| `finalaapp` | Production fixes, pricing, QR, profile, recordings UX | Experimental gamification |
| `gamification` | Points, leaderboard, coupons, FlickShort submit, admin gamification tabs | Shipping to production users without review |
| `main` | Rarely — upstream default; app work usually goes to `finalaapp` | Day-to-day mobile work |

**Rule:** If the user says “don’t touch `finalaapp`”, create or use another branch (e.g. `gamification`), commit there, and push only that branch:

```bash
cd frontend/FieldFlix-App
git checkout -b gamification    # or: git checkout gamification
git add <files>
git commit -m "feat(gamification): …"
git push -u origin gamification
git checkout finalaapp          # return without pushing finalaapp
```

Backend almost always pushes to **`main`**.

---

## Before every push

### 1. Check status (run in each repo)

```bash
cd frontend/FieldFlix-App && git status && git branch -vv
cd FieldFlix-Backend-clean && git status && git branch -vv
```

### 2. See what will ship

```bash
git diff --stat
git log origin/<branch>..HEAD --oneline   # unpushed commits
```

### 3. Never commit these

- `.env`, secrets, API keys, credentials
- `logs/*.json` / audit logs (backend)
- `node_modules/`, `dist/`, build artifacts
- Local-only experiments unless explicitly requested

### 4. Backend pre-commit hooks

Husky runs on commit:

- `npm run lint:check` (ESLint)
- `npm run format:check` (Prettier)

If format fails:

```bash
cd FieldFlix-Backend-clean
npx prettier --write path/to/file.ts
```

If build fails after push:

```bash
npm run build
```

---

## Push: frontend → `finalaapp` (production track)

```bash
cd frontend/FieldFlix-App
git checkout finalaapp
git pull origin finalaapp

git add <paths>
git commit -m "$(cat <<'EOF'
feat: short description of why.

One sentence on user-visible impact.
EOF
)"

git push origin finalaapp
```

After push, ship to devices with **EAS OTA** (production branch), e.g.:

```bash
npm run eas:update:production:branch
# or: eas update --branch production
```

---

## Push: frontend → `gamification` (feature track)

Use when work must **not** update `finalaapp`:

```bash
cd frontend/FieldFlix-App
git checkout finalaapp
git pull origin finalaapp
git checkout -b gamification   # skip if branch exists: git checkout gamification

git add <paths>
git commit -m "$(cat <<'EOF'
feat(gamification): …
EOF
)"

git push -u origin gamification
git checkout finalaapp           # optional: stay on feature branch if still developing
```

Open PR: `https://github.com/DevionX-Technologies/FieldFlix-App/compare/finalaapp...gamification`

---

## Push: backend → `main`

```bash
cd FieldFlix-Backend-clean
git checkout main
git pull origin main

git add <paths>
git commit -m "$(cat <<'EOF'
feat(area): short description.

What deploy verification should show at GET /.
EOF
)"

git push origin main
```

GitHub Actions deploys to ECS on push to `main` (when CI is healthy).

### Verify production deploy

Hit the API root:

```text
GET https://api.devionx.com/
```

Response includes a short message + `version=`, `sha=`, `built=`, `ref=`, `booted=`. Bump `VERSION` and the lead message in `src/app.service.ts` when you need to confirm a deploy landed.

---

## `.github/workflows/deploy.yml` (backend gotcha)

Pushing changes to `.github/workflows/deploy.yml` often fails with:

```text
refusing to allow an OAuth App to create or update workflow … without `workflow` scope
```

**Workaround used in this project:**

1. Commit and push all other backend files first.
2. Leave `deploy.yml` local, **or** push it from a token/CLI with `workflow` scope, **or** open a small PR on GitHub’s web UI.

Do not block a pricing/API fix because `deploy.yml` is dirty — stage only the files you need.

---

## Push both repos (typical session)

```bash
# Backend first (API must match app if contracts changed)
cd FieldFlix-Backend-clean
git add src/ ...
git commit -m "feat: …"
git push origin main

# Frontend second
cd ../frontend/FieldFlix-App
git checkout finalaapp   # or gamification
git add ...
git commit -m "feat: …"
git push origin finalaapp   # or: git push origin gamification
```

Order matters when the app depends on new API routes — **backend first**, then frontend OTA.

---

## Commit message style (this project)

- Prefix: `feat`, `fix`, `chore`, `feat(gamification)`, etc.
- First line: imperative, ≤ ~72 chars
- Body (optional): one sentence on **why** / user impact
- Use HEREDOC for multi-line messages (avoids shell escaping issues)

---

## Safety rules (always)

- **No force push** to `main` or `finalaapp` unless explicitly requested
- **No `git commit --amend`** after push to remote
- **No `--no-verify`** unless user asks to skip hooks
- **Only commit when asked** — don’t auto-commit drive-by changes
- **Don’t update `git config`** in automation

---

## Quick troubleshooting

| Problem | Fix |
|---------|-----|
| `index.lock` exists | `rm -f .git/index.lock` then retry (only if no other git process running) |
| ESLint unused import | Remove import or use the symbol |
| Prettier fail | `npx prettier --write <file>` |
| TS build fail on backend | `npm run build`, fix, recommit |
| Pushed wrong branch | Don’t force-push; add a revert commit or push correct branch |
| App still shows old UI | OTA not run yet, or device on wrong EAS branch |
| API still old | ECS deploy lag; check `GET /` version banner |

---

## Cheat sheet

```bash
# Where am I?
pwd && git branch --show-current && git status -sb

# Frontend production
cd frontend/FieldFlix-App && git push origin finalaapp

# Frontend gamification only
cd frontend/FieldFlix-App && git push origin gamification

# Backend
cd FieldFlix-Backend-clean && git push origin main

# Unpushed commits?
git log origin/$(git branch --show-current)..HEAD --oneline
```

---

*Last updated: June 2026 — reflects `finalaapp`, `gamification`, and `main` workflow used in this workspace.*
