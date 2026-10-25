# Upstream Maintenance Plan

Scope: keeping this Chirping Astro site current with its upstream theme without
overwriting site content, identity, deployment, dependency or build contracts.
Application source, tests, lint and CI are outside this tooling change.

## Decision

Use a **recorded-snapshot, scoped three-way sync**. Do not merge Git histories.

- `base`: theme files at recorded upstream commit
  `ba3536df65693b1c238ea5e5ec318d572022d423` (`v1.0.0`, Astro 6, unified
  Markdown processor).
- `ours`: the current site tree.
- `theirs`: a chosen upstream ref, normally an Astro 6-compatible commit.
- Per path: take upstream if `ours == base`; keep local if `theirs == base`;
  run a real text three-way merge when both changed; report conflicts when edits
  overlap. A conflict never overwrites the working file.
- `apply` never advances the baseline. It requires a complete upstream snapshot and
  re-reads the actual target tree/package rather than trusting plan fields.
- `record` advances the baseline only after every changed path is equal to the target
  or explicitly retained with a reason and current hash. A merge is auto-retained only
  after its validated candidate was actually applied.

## Baseline evidence

The site was imported from the official starter, not through an upstream Git merge.

| Item                      | Value                                                     |
| ------------------------- | --------------------------------------------------------- |
| Current site base         | `c8f596ac3edfa8e38b140277e0fa0a3deeecf58f`                |
| Local Astro import        | `2ea166e3af827f4f9f926741946eddff447ebf8a`                |
| Starter snapshot          | `4c39e9370c4872d7a14a9d3c6b44727a9a9544f9`                |
| Starter's upstream source | `chirping-astro@ba3536df65693b1c238ea5e5ec318d572022d423` |
| Baseline Astro            | 6 `unified` (`astro: ^6.4.3`)                             |

- All 77 files imported at `2ea166e3` are byte-identical to starter `4c39e93`.
- After excluding `src/content/**` and `src/assets/**`, **62 theme source/config
  files are byte-identical to both starter `4c39e93` and upstream `ba3536d`, with
  0 differences.**
- `git merge-base HEAD upstream/main` returns no base and exits 1. Native merge is
  rejected; no ancestry is fabricated.
- Upstream `main` currently points at `4585c2d78f1c429e5c3092ed79e68cc839413964`
  (`v1.2.0`, Astro 7 + Satteri). That target is incompatible with this Astro 6 site.
  `check` still reports its full changed-path summary, but **`apply` and `record`
  refuse the incompatible target as a whole**. There is no compatibility bypass.
- The last pre-Astro-7 upstream main commit, `f0d8908fed8295765dd7c6443837a30d8b835b4e`,
  differs from `ba3536d` only in `README.md`.

## Path policy

Never auto-applied: `src/content/**`, `src/assets/**`, `public/**`, `.env*`,
`.github/**`, `src/config.ts`, `src/content.config.ts`, `src/tag-groups.ts`,
`astro.config.mjs`, `package.json`, `bun.lock`, `docs/**`, `scripts/**`.

These are reported as manual decisions; they still require an explicit retained-local
decision before `record` when upstream changes them.

Theme implementation files under `src/components`, `src/layouts`, `src/pages`,
`src/plugins`, `src/styles`, `src/types`, `src/utils` and `src/i18n` are eligible for
the three-way merge, including `Topbar.astro`, `global.css` and `i18n/utils.ts`.
`src/i18n/ui.ts` is manual to avoid unwanted locale-dictionary replacement.
New files are accepted only under those known source directories; new top-level
executable, workflow or configuration files are never copied.

The wide-screen topbar blur fix at `c8f596ac` is preserved unless a reviewed merge
explicitly keeps both it and a compatible upstream change.

## Commands

```bash
bun scripts/upstream-sync.ts check
bun scripts/upstream-sync.ts check --ref <sha>
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json
bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json --write
bun scripts/upstream-sync.ts record --plan .cache/upstream/plans/<sha>/plan.json
bun scripts/upstream-sync.ts verify
```

- `check` writes only the ignored `.cache/upstream` plan/candidate/conflict area.
- `apply` is dry-run by default; `--write` is explicit.
- `record` takes `--decline "<path>=<reason>"` for each retained local divergence,
  including a local deletion (recorded with a `null` hash).
- `apply`/`record` need the complete upstream snapshot (`--upstream-dir <path>` or the
  cache kept by `check`) to verify target tree/package hashes.
- Prior retained-local decisions are carried forward to later targets while their
  current hashes still match; stale hashes are refused, not erased.
- `verify` checks metadata offline; with a snapshot it also verifies every recorded
  base hash.

Full operator instructions, conflict handling, rollback and the separate Bun/Astro
dependency workflow are in [UPSTREAM.md](./UPSTREAM.md).

## Record semantics

`record` may advance the baseline only when every changed path has one of these
dispositions:

1. current bytes equal target bytes (integrated), or
2. a retained-local decline with a meaningful reason and the current SHA256.

Merged disjoint edits normally differ from target, so they are recorded as a
reviewed retained-local decision. The ledger keeps that disposition; advancing the
baseline never means "all upstream bytes are integrated". Unresolved conflicts,
stale hashes, stale target decisions and missing reasons are refused.

The baseline `files` map records target-tree hashes for the theme/manual scope.
It is not a claim about current site bytes, site content, assets, public games or
deployment files. `verify` checks decisions against current bytes and the baseline
map against the snapshot.

The major/processor gate is generic: actual baseline, project and target must agree.
Current Astro 6/unified versus Astro 7/Satteri is blocked. A deliberately completed
Astro 7 migration with a recorded Astro 7 baseline and matching target is supported by
the same tool; no bypass flag exists.

## Dependency policy

Current project and baseline stay on Astro 6/unified for this tooling cycle. One
authoritative `bun.lock`; no npm lock.
Routine checks are `bun install --frozen-lockfile`, `bun outdated`, then
`bun test`, `bun run typecheck`, `bun run lint`, `bun run build`. Do not run
`bun update --latest` or move to Astro 7/Satteri as part of an upstream sync.
See UPSTREAM.md for the rollback-safe Bun workflow.

## Verification status

- 18 fixture tests cover safe update, disjoint merge, refusal to record before
  applying a merge, overlapping conflict, nested-directory adds, file/directory
  transitions with zero partial writes, add/delete, local-only retention,
  protected/manual decisions, incompatible Astro 7 refusal, resealed forged plans,
  same-major Astro 7 success, processor mismatch, stale plans, traversal, symlink
  escape, binary/mode changes, durable decisions and local deletion.
- Metadata verify against the recorded `ba3536d` snapshot passed for all 59 tracked
  base files.
- Full `bun test` passed 53 tests; full `bun run lint` and `bun run typecheck` passed.
  The tooling also passes a standalone strict TypeScript check.
- `check` against upstream `4585c2d` reported the full 45-path changed summary and
  marked 7/satteri incompatible with 6/unified; `apply` and `record` refused it against
  the actual snapshot. `check --json` is pure JSON.

## 中文速查

- 检查：`bun scripts/upstream-sync.ts check`
- 试运行：`apply --plan ...`（默认不写站点文件）
- 确认写入：`apply --plan ... --write`
- 记录新基线：`record --plan ...`；保留本地差异时加 `--decline "路径=原因"`
- 离线校验：`verify`
- 当前 6/unified 与 7/satteri 不兼容，工具拒绝；只能先完成并验证迁移、再手动更新基线。
- 同主版本、同 Markdown 处理器的目标才可应用；没有绕过开关。
- 永远不要用整树 reset/revert 回滚；只恢复本次计划明确列出的路径。
