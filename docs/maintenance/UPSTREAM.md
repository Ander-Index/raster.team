# Upstream Sync Operator Guide

This guide is for updating the Chirping Astro theme in this site. It never merges Git
histories, commits, pushes, deploys or executes upstream code. All comparison output
lives under `.cache/upstream/`, which is ignored by Git.

## Preconditions

- Run from the repository root.
- Bun and Git are available.
- The application tree should be stable before `record`. `check` is safe on a dirty
  tree; `apply` refuses a plan if any compared file changed after the check.
- The recorded baseline is `ba3536df65693b1c238ea5e5ec318d572022d423` (Astro 6,
  unified Markdown processor).
- Upstream `main` currently uses Astro 7/Satteri. It is reported by `check` but cannot
  be applied or recorded while the project/baseline remain Astro 6/unified.
- The checks are generic: actual baseline, project and target must agree on Astro
  major and Markdown processor. A deliberately completed Astro 7 migration with a
  recorded Astro 7 baseline and a matching Astro 7 target is supported by the same
  tool. Do not migrate Astro in this workflow; update the baseline deliberately after
  the migration is validated.

## 1. Check upstream

```bash
bun scripts/upstream-sync.ts check
```

This fetches the official upstream into the ignored cache and writes a plan. The cache
is a complete bare clone; a cache left by an older partial-clone tool is refused. If
that happens, remove `.cache/upstream/chirping-astro.git` and run `check` again, or use
`--upstream-dir` with a complete clone. To check a specific commit or branch:

```bash
bun scripts/upstream-sync.ts check --ref <sha-or-branch>
```

For an already available local upstream clone (including offline work):

```bash
bun scripts/upstream-sync.ts check --upstream-dir <path-to-upstream-repo>
```

`check` prints every changed upstream path with a disposition:

| Disposition     | Meaning                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| `WRITE update`  | Local file equals base; safe upstream update candidate.                            |
| `WRITE merge`   | Both sides changed in non-overlapping regions; a real three-way merge is prepared. |
| `WRITE new`     | New upstream file inside an allowed source directory; review before applying.      |
| `DELETE delete` | Local file equals base and upstream removed it.                                    |
| `conflict`      | Overlapping edits or add/delete mismatch. The working file is not touched.         |
| `manual`        | Protected/manual path, binary file, mode change or unsafe new path.                |
| `out-of-scope`  | README/content/root files outside theme scope; never applied.                      |
| `integrated`    | Current bytes already equal target; no action.                                     |

The plan is at `.cache/upstream/plans/<target-sha>/plan.json`. Candidate file contents
are under `files/`; conflict material is under `conflicts/`.

If the target is Astro 7/Satteri, the output says `INCOMPATIBLE`. Do not edit metadata,
the manifest or the plan to bypass this. A manual port is a separate code change
outside this tool.

## 2. Review and apply

Dry run is the default. `apply` needs a complete upstream snapshot (the cache kept by
`check`, or an explicit `--upstream-dir`):

```bash
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json --upstream-dir <path-to-upstream-repo>
```

Write only after reviewing the plan and candidates:

```bash
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json --write
```

Before any site write, `apply` validates:

- plan integrity (`planId`), repository/base/target binding, manifest and baseline
  hashes, and actual baseline/project/target Astro-major and processor agreement;
- every current file hash/mode against the plan, so a stale plan or concurrent edit
  refuses the whole operation;
- the actual target commit/tree and its `package.json` Astro major and Markdown
  processor against the current project and recorded baseline; a resealed plan is
  not trusted;
- every candidate hash, path traversal, absolute/backslash paths, symlink escape,
  binary content, unsupported modes, missing parent directories and file/directory
  path-type transitions before any write;
- that `apply` never writes protected/manual paths, even in a modified plan.

`apply` does not commit, push, deploy or advance the baseline. It also does not run
`git merge`.

## 3. Handle conflicts

For overlapping edits, the working file stays exactly as it was. Review:

```text
.cache/upstream/plans/<sha>/conflicts/<path>/ours
.cache/upstream/plans/<sha>/conflicts/<path>/base
.cache/upstream/plans/<sha>/conflicts/<path>/theirs
.cache/upstream/plans/<sha>/conflicts/<path>/merged
```

Edit the working file yourself. For protected/manual paths, keep the site-owned
version unless you deliberately port the upstream change by hand. Then run the
project checks and record the decision.

If you change any file after the check, re-run `check`; `apply` will refuse the old
plan as stale. This is intentional.

## 4. Record the new baseline

`record` never runs automatically. It needs the upstream snapshot used by `check`
(the cache, or the same `--upstream-dir`) so it can verify target hashes.

```bash
bun scripts/upstream-sync.ts record \
  --plan .cache/upstream/plans/<sha>/plan.json
```

For every upstream-changed path that is not byte-identical to target, pass a
meaningful retained-local reason:

```bash
bun scripts/upstream-sync.ts record \
  --plan .cache/upstream/plans/<sha>/plan.json \
  --decline "src/i18n/ui.ts=keep the site's locale dictionaries" \
  --decline "src/config.ts=site identity is intentionally local"
```

A clean three-way merge is auto-retained only after its candidate was actually
applied (the current bytes must equal the validated candidate hash); otherwise
`record` refuses until you apply it or pass `--decline`. Conflicts, protected paths
and manual paths require an explicit decline. A local deletion can be recorded with a
`null` hash decision; pass `--decline "path=intentionally removed locally"`.
`out-of-scope` changes are recorded as ignored, not integrated.

Prior retained-local decisions are carried forward to later targets while their
current hashes still match. A changed local hash/stale decision is refused, never
silently dropped.

`record` refuses if:

- a conflict/manual path has no decision;
- a carried decision's current hash no longer matches;
- a reason is missing or too short;
- the current file changed since a decision was made;
- the actual target major/processor is incompatible with the recorded baseline/project.

Recording advances the **snapshot base**, not a claim that every upstream byte was
applied. `docs/maintenance/upstream-baseline.json` stores the new commit and target
hashes; `docs/maintenance/upstream-overrides.json` stores retained-local decisions
with their hashes.

Do not hand-edit commit hashes or per-file hashes. Use `record`. The manifest may be
edited deliberately to change scope, followed by a fresh `check` and `record`.

## 5. Verify and roll back

Metadata/decision verification (snapshot optional):

```bash
bun scripts/upstream-sync.ts verify
```

With a snapshot, also verify every recorded base hash and decision against the
current files:

```bash
bun scripts/upstream-sync.ts verify --upstream-dir <path-to-upstream-repo>
```

`verify` does not claim that current source files equal the upstream baseline. The
committed `files` map is the upstream target snapshot; retained-local decisions are
checked against current bytes (or absence). Without a snapshot it performs
metadata/current-decision checks only and says so.

Rollback is explicit and narrow. `apply` leaves changes in the working tree, so review
with `git diff -- <paths>` and restore only the paths in the plan you want to undo:

```bash
git restore -- <explicit-path>
```

Never use a whole-tree reset/checkout; other site work may be present. If a `record`
was just made and should be undone, restore only the two metadata files:

```bash
git restore -- docs/maintenance/upstream-baseline.json docs/maintenance/upstream-overrides.json
```

## 6. Astro dependency updates (separate workflow)

Upstream sync and dependency upgrades are separate decisions. Keep Astro 6 and one
authoritative `bun.lock`; do not add `package-lock.json`, run `bun update --latest`, or
port Astro 7/Satteri as part of a theme sync.

`bun install` alone reproduces the existing range/lock resolution; it does not check for
newer compatible versions. To update the Astro-related packages deliberately, stay
within the ranges already declared in `package.json`:

```bash
bun install --frozen-lockfile
bun outdated
# Compatible update: only newer versions allowed by the current ranges
bun update astro @astrojs/mdx @astrojs/markdown-remark
```

Review the `package.json`/`bun.lock` diff and run the full project check before
accepting the result:

```bash
git diff -- package.json bun.lock
bun run check
```

If the update is not wanted, restore only the dependency files:

```bash
git restore -- package.json bun.lock
```

This is not an automatic or seamless upgrade: a minor/patch update can still surface
behavior changes, so the lock diff and full `bun run check` are required. A major Astro
upgrade (for example Astro 7/Satteri) needs its own explicit migration plan, code
changes and validation; do not use `--latest` wholesale to force it, and do not smuggle
it in through an upstream `check`. Routine CI/dependency automation is outside this
tool. After the migration is complete and validated, record the new baseline
deliberately; the updater then requires target and project to share the new major and
processor.

## 7. Current verification (tooling)

At the time this tooling was added:

- `bun test scripts/upstream-sync.test.ts`: 18 pass, 0 fail. Covers safe updates,
  disjoint merges, refusal to record before applying a merge, overlapping conflicts,
  nested-directory adds, file/directory transitions with zero partial writes,
  add/delete, local-only retention, protected/manual decisions, incompatible Astro 7,
  resealed forged plans, Astro 7 same-major success, processor mismatch, stale plans,
  traversal, symlink escape, binary/mode changes, durable decisions and a local
  deletion.
- `bun scripts/upstream-sync.ts verify --upstream-dir .cache/upstream/chirping-astro.git`:
  59 recorded baseline files verified.
- Default `check` against `4585c2d` reported 45 changed paths and `INCOMPATIBLE`
  (7/satteri vs 6/unified); `apply` and `record` refused the target against the actual
  snapshot.
- `check --json` emits only valid JSON; `--help` and command errors are functional.
- Full `bun test`: 53 pass, 0 fail across 9 files (including the 18 upstream fixture tests).
- Full `bun run lint` and `bun run typecheck`: pass at the final check.
- The upstream tooling itself passes ESLint, Prettier and a standalone strict
  TypeScript check (including the fixture tests).

## 8. 中文操作提示

```bash
# 只读检查，不改站点文件
bun scripts/upstream-sync.ts check

# 默认只预览；确认后才写入
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json --write

# 记录基线；保留本地文件时必须写原因
bun scripts/upstream-sync.ts record --plan .cache/upstream/plans/<sha>/plan.json \
  --decline "src/config.ts=站点身份配置，保留本地版本"
```

- 当前 6/unified 与 7/satteri 会明确显示 `INCOMPATIBLE`，工具拒绝应用；不要改元数据绕过。
- 完成并验证主版本迁移、正式更新基线后，同主版本且同处理器的新目标可继续使用同一工具。
- 冲突文件在 `.cache/upstream/.../conflicts/`，工作区文件不会被覆盖。
- 回滚只恢复本次计划明确列出的路径，不要 `git reset --hard` 或整树 `git restore`。
