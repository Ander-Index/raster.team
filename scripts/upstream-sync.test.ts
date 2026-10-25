import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  isSafeRepoPath,
  runApply,
  runCheck,
  runRecord,
  runVerify,
  sealPlan,
  trackedFilesForCommit,
  type ChangedPath,
  type PlanOperation,
  type Processor,
  type SyncPlan,
  type ThemeManifest,
} from './upstream-sync';

const projectRoot = resolve(import.meta.dir, '..');
const manifestText = readFileSync(
  join(projectRoot, 'docs/maintenance/theme-manifest.json'),
  'utf8',
);
const manifest = JSON.parse(manifestText) as ThemeManifest;

interface Fixture {
  root: string;
  site: string;
  upstream: string;
  base: string;
  target: string;
}

interface FixtureOptions {
  base: Record<string, string>;
  target: Record<string, string>;
  local?: Record<string, string>;
  removeFromSite?: string[];
  baselineAstroMajor?: number;
  projectAstroSpec?: string;
  targetAstroSpec?: string;
  projectProcessor?: Processor;
  targetProcessor?: Processor;
  baselineProcessor?: Processor;
}

function git(repo: string, args: string[]): string {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function initRepo(path: string): void {
  mkdirSync(path, { recursive: true });
  git(path, ['init', '-q']);
  git(path, ['config', 'user.email', 'test@example.invalid']);
  git(path, ['config', 'user.name', 'Upstream Test']);
}

function writeFile(root: string, path: string, content: string): void {
  const absolute = join(root, path);
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, content);
}

function commitAll(repo: string, message: string): string {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '-m', message]);
  return git(repo, ['rev-parse', 'HEAD']);
}

function clearWorktree(repo: string): void {
  for (const entry of readdirSync(repo)) {
    if (entry === '.git') continue;
    rmSync(join(repo, entry), { recursive: true, force: true });
  }
}

function createFixture(options: FixtureOptions): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'chirping-upstream-test-'));
  const upstream = join(root, 'upstream');
  const site = join(root, 'site');
  initRepo(upstream);
  initRepo(site);

  const baselineMajor = options.baselineAstroMajor ?? 6;
  const projectSpec =
    options.projectAstroSpec ?? (baselineMajor === 6 ? '^6.4.3' : `^${baselineMajor}.0.0`);
  const targetSpec = options.targetAstroSpec ?? projectSpec;
  const projectProcessor = options.projectProcessor ?? 'unified';
  const targetProcessor = options.targetProcessor ?? projectProcessor;
  const baselineProcessor = options.baselineProcessor ?? projectProcessor;

  const base = { 'package.json': packageJson(projectSpec, baselineProcessor), ...options.base };
  for (const [path, content] of Object.entries(base)) writeFile(upstream, path, content);
  const baseCommit = commitAll(upstream, 'base');

  const target = { 'package.json': packageJson(targetSpec, targetProcessor), ...options.target };
  clearWorktree(upstream);
  for (const [path, content] of Object.entries(target)) writeFile(upstream, path, content);
  const targetCommit = commitAll(upstream, 'target');

  for (const [path, content] of Object.entries(base)) writeFile(site, path, content);
  writeFile(site, 'package.json', packageJson(projectSpec, projectProcessor));
  const siteBase = commitAll(site, 'site base');
  for (const [path, content] of Object.entries(options.local ?? {})) writeFile(site, path, content);
  for (const path of options.removeFromSite ?? []) rmSync(join(site, path));

  writeFile(site, 'docs/maintenance/theme-manifest.json', manifestText);
  const baseline = {
    schemaVersion: 1,
    upstreamRepository: 'https://example.invalid/chirping-astro',
    baselineCommit: baseCommit,
    version: '1.0.0',
    astroMajor: baselineMajor,
    processor: baselineProcessor,
    starterCommit: '0000000000000000000000000000000000000000',
    siteBaseCommit: siteBase,
    manifest: 'docs/maintenance/theme-manifest.json',
    recordedAt: '2026-01-01T00:00:00.000Z',
    files: trackedFilesForCommit(upstream, baseCommit, manifest),
    dispositions: {},
  };
  writeFile(
    site,
    'docs/maintenance/upstream-baseline.json',
    `${JSON.stringify(baseline, null, 2)}\n`,
  );
  writeFile(
    site,
    'docs/maintenance/upstream-overrides.json',
    '{\n  "schemaVersion": 1,\n  "decisions": {}\n}\n',
  );

  return { root, site, upstream, base: baseCommit, target: targetCommit };
}

function packageJson(astro: string, processor: Processor): string {
  return `${JSON.stringify(
    {
      name: 'fixture',
      version: '1.0.0',
      dependencies: {
        astro,
        ...(processor === 'satteri'
          ? { '@astrojs/markdown-satteri': '^0.3.3', 'satteri-external-links': '^0.1.0' }
          : {}),
      },
    },
    null,
    2,
  )}\n`;
}

async function planFor(fixture: Fixture): Promise<{ plan: SyncPlan; planPath: string }> {
  const result = await runCheck({
    cwd: fixture.site,
    upstreamDir: fixture.upstream,
    ref: fixture.target,
    quiet: true,
  });
  return { plan: result.plan, planPath: result.planPath };
}

function operation(plan: SyncPlan, path: string) {
  const found = plan.operations.find((item: PlanOperation) => item.path === path);
  if (!found) throw new Error(`missing operation for ${path}`);
  return found;
}

function cleanup(fixture: Fixture): void {
  rmSync(fixture.root, { recursive: true, force: true });
}

describe('upstream-sync check', () => {
  it('classifies safe update, disjoint merge and overlap conflict', async () => {
    const fixture = createFixture({
      base: {
        'src/components/Update.astro': 'base update\n',
        'src/components/Merge.astro': 'line 1\nline 2\nline 3\nline 4\n',
        'src/components/Conflict.astro': 'alpha\nbeta\ngamma\n',
      },
      target: {
        'src/components/Update.astro': 'target update\n',
        'src/components/Merge.astro': 'line 1\nline 2\nline 3\nupstream line 4\n',
        'src/components/Conflict.astro': 'alpha\nupstream beta\ngamma\n',
      },
      local: {
        'src/components/Merge.astro': 'line 1\nlocal line 2\nline 3\nline 4\n',
        'src/components/Conflict.astro': 'alpha\nlocal beta\ngamma\n',
      },
    });
    try {
      const { plan } = await planFor(fixture);
      expect(plan.compatible).toBe(true);
      expect(operation(plan, 'src/components/Update.astro').status).toBe('update');
      expect(operation(plan, 'src/components/Merge.astro').status).toBe('merge');
      expect(operation(plan, 'src/components/Conflict.astro').status).toBe('conflict');
      expect(plan.changedPaths.length).toBe(3);
    } finally {
      cleanup(fixture);
    }
  });

  it('reports an incompatible Astro 7 target with the complete changed-path summary', async () => {
    const fixture = createFixture({
      base: {
        'src/components/Update.astro': 'base\n',
        'src/config.ts': 'export const site = "old";\n',
      },
      target: {
        'src/components/Update.astro': 'target\n',
        'src/config.ts': 'export const site = "new";\n',
      },
      targetAstroSpec: '^7.0.5',
      targetProcessor: 'satteri',
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(plan.compatible).toBe(false);
      expect(plan.targetAstroMajor).toBe(7);
      expect(plan.changedPaths.map((change: ChangedPath) => change.path)).toContain(
        'src/components/Update.astro',
      );
      expect(plan.changedPaths.map((change: ChangedPath) => change.path)).toContain(
        'src/config.ts',
      );
      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/incompatible/i);
      await expect(
        runRecord({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/incompatible/i);
      expect(readFileSync(join(fixture.site, 'src/components/Update.astro'), 'utf8')).toBe(
        'base\n',
      );
    } finally {
      cleanup(fixture);
    }
  });
});

describe('upstream-sync apply', () => {
  it('is dry-run by default, writes safe changes, merges disjoint edits and records retained merges', async () => {
    const fixture = createFixture({
      base: {
        'src/components/Update.astro': 'base update\n',
        'src/components/Merge.astro': 'line 1\nline 2\nline 3\nline 4\n',
      },
      target: {
        'src/components/Update.astro': 'target update\n',
        'src/components/Merge.astro': 'line 1\nline 2\nline 3\nupstream line 4\n',
      },
      local: {
        'src/components/Merge.astro': 'line 1\nlocal line 2\nline 3\nline 4\n',
      },
    });
    try {
      const { planPath } = await planFor(fixture);
      const updatePath = join(fixture.site, 'src/components/Update.astro');
      const mergePath = join(fixture.site, 'src/components/Merge.astro');
      const dry = await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
      });
      expect(dry.dryRun).toBe(true);
      expect(readFileSync(updatePath, 'utf8')).toBe('base update\n');

      const applied = await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      expect(applied.wrote).toContain('src/components/Update.astro');
      expect(applied.wrote).toContain('src/components/Merge.astro');
      expect(readFileSync(updatePath, 'utf8')).toBe('target update\n');
      const merged = readFileSync(mergePath, 'utf8');
      expect(merged).toContain('local line 2');
      expect(merged).toContain('upstream line 4');

      const recorded = await runRecord({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
      });
      expect(recorded.declined).toBe(1);
      const baseline = JSON.parse(
        readFileSync(join(fixture.site, 'docs/maintenance/upstream-baseline.json'), 'utf8'),
      ) as { baselineCommit: string; dispositions: Record<string, { status: string }> };
      expect(baseline.baselineCommit).toBe(fixture.target);
      expect(baseline.dispositions['src/components/Merge.astro']?.status).toBe('declined');
      const overrides = JSON.parse(
        readFileSync(join(fixture.site, 'docs/maintenance/upstream-overrides.json'), 'utf8'),
      ) as { decisions: Record<string, { hash: string; reason: string }> };
      expect(overrides.decisions['src/components/Merge.astro']?.hash).toMatch(/^sha256:/);
      expect(overrides.decisions['src/components/Merge.astro']?.reason.length).toBeGreaterThan(8);
      await expect(
        runVerify({ cwd: fixture.site, upstreamDir: fixture.upstream, quiet: true }),
      ).resolves.toBeDefined();
    } finally {
      cleanup(fixture);
    }
  });

  it('leaves overlapping conflicts untouched and requires an explicit decline before record', async () => {
    const fixture = createFixture({
      base: { 'src/components/Conflict.astro': 'alpha\nbase beta\ngamma\n' },
      target: { 'src/components/Conflict.astro': 'alpha\nupstream beta\ngamma\n' },
      local: { 'src/components/Conflict.astro': 'alpha\nlocal beta\ngamma\n' },
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      const conflict = operation(plan, 'src/components/Conflict.astro');
      expect(conflict.status).toBe('conflict');
      expect(conflict.conflictDir).toBeTruthy();
      const before = readFileSync(join(fixture.site, 'src/components/Conflict.astro'), 'utf8');

      await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      expect(readFileSync(join(fixture.site, 'src/components/Conflict.astro'), 'utf8')).toBe(
        before,
      );
      expect(
        existsSync(
          join(
            fixture.site,
            '.cache/upstream/plans',
            fixture.target.slice(0, 12),
            'conflicts',
            'src/components/Conflict.astro',
            'merged',
          ),
        ),
      ).toBe(true);

      await expect(
        runRecord({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/unresolved upstream change/);
      await runRecord({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
        declines: new Map([
          ['src/components/Conflict.astro', 'manual review keeps local beta wording'],
        ]),
      });
      expect(readFileSync(join(fixture.site, 'src/components/Conflict.astro'), 'utf8')).toBe(
        before,
      );
    } finally {
      cleanup(fixture);
    }
  });

  it('supports add/change/delete while retaining local-only files', async () => {
    const fixture = createFixture({
      base: {
        'src/components/Update.astro': 'base\n',
        'src/components/Old.astro': 'old\n',
      },
      target: {
        'src/components/Update.astro': 'target\n',
        'src/components/New.astro': 'new\n',
      },
      local: { 'src/components/Local.astro': 'local only\n' },
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(operation(plan, 'src/components/New.astro').status).toBe('new');
      expect(operation(plan, 'src/components/Old.astro').status).toBe('delete');
      expect(operation(plan, 'src/components/Update.astro').status).toBe('update');
      const applied = await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      expect(applied.wrote).toContain('src/components/New.astro');
      expect(applied.deleted).toContain('src/components/Old.astro');
      expect(readFileSync(join(fixture.site, 'src/components/New.astro'), 'utf8')).toBe('new\n');
      expect(readFileSync(join(fixture.site, 'src/components/Update.astro'), 'utf8')).toBe(
        'target\n',
      );
      expect(readFileSync(join(fixture.site, 'src/components/Local.astro'), 'utf8')).toBe(
        'local only\n',
      );
      expect(existsSync(join(fixture.site, 'src/components/Old.astro'))).toBe(false);
    } finally {
      cleanup(fixture);
    }
  });

  it('never applies protected/manual changes and requires a recorded decline', async () => {
    const fixture = createFixture({
      base: { 'src/config.ts': 'export const old = true;\n' },
      target: { 'src/config.ts': 'export const changed = true;\n' },
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(operation(plan, 'src/config.ts').scope).toBe('protected');
      expect(operation(plan, 'src/config.ts').status).toBe('manual');
      await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      expect(readFileSync(join(fixture.site, 'src/config.ts'), 'utf8')).toBe(
        'export const old = true;\n',
      );
      await expect(
        runRecord({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/unresolved upstream change/);
      await runRecord({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
        declines: new Map([['src/config.ts', 'site identity is intentionally local']]),
      });
    } finally {
      cleanup(fixture);
    }
  });

  it('refuses a stale plan before writing any file', async () => {
    const fixture = createFixture({
      base: {
        'src/components/A.astro': 'base A\n',
        'src/components/B.astro': 'base B\n',
      },
      target: {
        'src/components/A.astro': 'target A\n',
        'src/components/B.astro': 'target B\n',
      },
    });
    try {
      const { planPath } = await planFor(fixture);
      writeFileSync(join(fixture.site, 'src/components/A.astro'), 'dirty A\n');
      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/stale/i);
      expect(readFileSync(join(fixture.site, 'src/components/A.astro'), 'utf8')).toBe('dirty A\n');
      expect(readFileSync(join(fixture.site, 'src/components/B.astro'), 'utf8')).toBe('base B\n');
    } finally {
      cleanup(fixture);
    }
  });

  it('refuses path traversal and symlink escapes', async () => {
    expect(isSafeRepoPath('../evil')).toBe(false);
    expect(isSafeRepoPath('/tmp/evil')).toBe(false);
    expect(isSafeRepoPath('src\\evil')).toBe(false);

    const fixture = createFixture({
      base: { 'src/components/Safe.astro': 'base\n' },
      target: {
        'src/components/Safe.astro': 'target\n',
        'src/components/Link.astro': 'target link\n',
      },
    });
    const outside = join(fixture.root, 'outside.txt');
    writeFileSync(outside, 'outside original\n');
    try {
      // A symlink at the destination must be treated as manual and never followed.
      symlinkSync(outside, join(fixture.site, 'src/components/Link.astro'));
      const { planPath } = await planFor(fixture);
      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/symlink|stale|non-regular|unsafe/i);
      expect(readFileSync(outside, 'utf8')).toBe('outside original\n');

      // Tampering with a plan path must fail even if the plan is resealed.
      const plan = JSON.parse(readFileSync(planPath, 'utf8')) as SyncPlan;
      plan.operations[0].path = '../evil';
      const withoutId = { ...plan };
      delete (withoutId as Partial<SyncPlan>).planId;
      const tampered = sealPlan(withoutId);
      writeFileSync(planPath, `${JSON.stringify(tampered, null, 2)}\n`);
      await expect(
        runApply({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/unsafe/i);
    } finally {
      cleanup(fixture);
    }
  });

  it('refuses binary and mode-changing targets', async () => {
    const fixture = createFixture({
      base: { 'src/components/Binary.astro': 'base\n' },
      target: { 'src/components/Binary.astro': 'target\0binary\n' },
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(operation(plan, 'src/components/Binary.astro').status).toBe('manual');
      await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      expect(readFileSync(join(fixture.site, 'src/components/Binary.astro'), 'utf8')).toBe(
        'base\n',
      );
    } finally {
      cleanup(fixture);
    }

    const executable = createFixture({
      base: { 'src/components/Mode.astro': 'base\n' },
      target: { 'src/components/Mode.astro': 'target\n' },
    });
    try {
      chmodSync(join(executable.upstream, 'src/components/Mode.astro'), 0o755);
      git(executable.upstream, ['add', '-A']);
      git(executable.upstream, ['commit', '-q', '-m', 'mode change']);
      const target = git(executable.upstream, ['rev-parse', 'HEAD']);
      const result = await runCheck({
        cwd: executable.site,
        upstreamDir: executable.upstream,
        ref: target,
        quiet: true,
      });
      expect(operation(result.plan, 'src/components/Mode.astro').status).toBe('manual');
      await runApply({
        cwd: executable.site,
        planPath: result.planPath,
        upstreamDir: executable.upstream,
        write: true,
        quiet: true,
      });
      expect(readFileSync(join(executable.site, 'src/components/Mode.astro'), 'utf8')).toBe(
        'base\n',
      );
    } finally {
      cleanup(executable);
    }
  });
});

describe('upstream-sync regression coverage', () => {
  it('refuses record of a planned merge before apply', async () => {
    const fixture = createFixture({
      base: { 'src/components/Merge.astro': 'line 1\nline 2\nline 3\nline 4\n' },
      target: { 'src/components/Merge.astro': 'line 1\nline 2\nline 3\nupstream line 4\n' },
      local: { 'src/components/Merge.astro': 'line 1\nlocal line 2\nline 3\nline 4\n' },
    });
    try {
      const { planPath } = await planFor(fixture);
      await expect(
        runRecord({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/unresolved upstream change|planned merge/i);
      const before = readFileSync(join(fixture.site, 'src/components/Merge.astro'), 'utf8');
      expect(before).toBe('line 1\nlocal line 2\nline 3\nline 4\n');
      await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      await runRecord({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
      });
    } finally {
      cleanup(fixture);
    }
  });

  it('applies a new file inside a new nested directory', async () => {
    const fixture = createFixture({
      base: { 'src/components/Existing.astro': 'base\n' },
      target: {
        'src/components/Existing.astro': 'target\n',
        'src/components/newdir/New.astro': 'new\n',
      },
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(operation(plan, 'src/components/newdir/New.astro').status).toBe('new');
      await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      expect(readFileSync(join(fixture.site, 'src/components/newdir/New.astro'), 'utf8')).toBe(
        'new\n',
      );
    } finally {
      cleanup(fixture);
    }
  });

  it('rejects a file-to-directory transition before any pending write', async () => {
    const fixture = createFixture({
      base: {
        'src/components/A.astro': 'base A\n',
        'src/components/foo': 'base foo file\n',
      },
      target: {
        'src/components/A.astro': 'target A\n',
        'src/components/foo/bar.astro': 'new nested\n',
      },
    });
    try {
      const { planPath } = await planFor(fixture);
      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/parent path is not a directory|not a regular file/i);
      expect(readFileSync(join(fixture.site, 'src/components/A.astro'), 'utf8')).toBe('base A\n');
      expect(readFileSync(join(fixture.site, 'src/components/foo'), 'utf8')).toBe(
        'base foo file\n',
      );
      expect(
        readdirSync(join(fixture.site, 'src/components')).some((name) => name.includes('.tmp-')),
      ).toBe(false);
    } finally {
      cleanup(fixture);
    }
  });

  it('rejects a directory-to-file transition before any pending write', async () => {
    const fixture = createFixture({
      base: {
        'src/components/A.astro': 'base A\n',
        'src/components/foo/bar.astro': 'base child\n',
      },
      target: {
        'src/components/A.astro': 'target A\n',
        'src/components/foo': 'target foo file\n',
      },
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      const planDir = dirname(planPath);
      const foo = operation(plan, 'src/components/foo');
      expect(foo.status).toBe('conflict');
      // Force the plan to attempt the file write, then prove preflight rejects
      // it before the unrelated A.astro update is touched.
      foo.status = 'new';
      foo.action = 'write';
      foo.candidate = 'files/foo';
      foo.candidateHash = foo.theirsHash ?? '';
      writeFileSync(join(planDir, 'files/foo'), 'target foo file\n');
      const withoutId = { ...plan };
      delete (withoutId as Partial<SyncPlan>).planId;
      const resealed = sealPlan(withoutId);
      writeFileSync(planPath, `${JSON.stringify(resealed, null, 2)}\n`);

      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/destination is not a regular file|parent path/i);
      expect(readFileSync(join(fixture.site, 'src/components/A.astro'), 'utf8')).toBe('base A\n');
      expect(readFileSync(join(fixture.site, 'src/components/foo/bar.astro'), 'utf8')).toBe(
        'base child\n',
      );
      expect(
        readdirSync(join(fixture.site, 'src/components')).some((name) => name.includes('.tmp-')),
      ).toBe(false);
    } finally {
      cleanup(fixture);
    }
  });

  it('refuses a resealed plan whose self-reported Astro 7 fields are forged', async () => {
    const fixture = createFixture({
      base: { 'src/components/Update.astro': 'base\n' },
      target: { 'src/components/Update.astro': 'target\n' },
      targetAstroSpec: '^7.0.5',
      targetProcessor: 'satteri',
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      plan.targetAstroMajor = 6;
      plan.targetAstroSpec = '^6.4.3';
      plan.targetProcessor = 'unified';
      plan.compatible = true;
      plan.compatibilityReason = 'forged';
      const withoutId = { ...plan };
      delete (withoutId as Partial<SyncPlan>).planId;
      const resealed = sealPlan(withoutId);
      writeFileSync(planPath, `${JSON.stringify(resealed, null, 2)}\n`);
      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/incompatible|snapshot/i);
      await expect(
        runRecord({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/incompatible|snapshot/i);
      expect(readFileSync(join(fixture.site, 'src/components/Update.astro'), 'utf8')).toBe(
        'base\n',
      );
    } finally {
      cleanup(fixture);
    }
  });

  it('supports a deliberately migrated same-major Astro 7 project and target', async () => {
    const fixture = createFixture({
      base: { 'src/components/Update.astro': 'base\n' },
      target: { 'src/components/Update.astro': 'target\n' },
      baselineAstroMajor: 7,
      projectAstroSpec: '^7.0.5',
      targetAstroSpec: '^7.0.5',
      projectProcessor: 'unified',
      targetProcessor: 'unified',
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(plan.compatible).toBe(true);
      expect(plan.targetAstroMajor).toBe(7);
      expect(plan.targetProcessor).toBe('unified');
      await runApply({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      await runRecord({
        cwd: fixture.site,
        planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
      });
      const baseline = JSON.parse(
        readFileSync(join(fixture.site, 'docs/maintenance/upstream-baseline.json'), 'utf8'),
      ) as { astroMajor: number; processor: string; baselineCommit: string };
      expect(baseline.astroMajor).toBe(7);
      expect(baseline.processor).toBe('unified');
      expect(baseline.baselineCommit).toBe(fixture.target);
      await runVerify({ cwd: fixture.site, upstreamDir: fixture.upstream, quiet: true });
    } finally {
      cleanup(fixture);
    }
  });

  it('refuses a same-major processor mismatch', async () => {
    const fixture = createFixture({
      base: { 'src/components/Update.astro': 'base\n' },
      target: { 'src/components/Update.astro': 'target\n' },
      baselineAstroMajor: 7,
      projectAstroSpec: '^7.0.5',
      targetAstroSpec: '^7.0.5',
      projectProcessor: 'unified',
      targetProcessor: 'satteri',
    });
    try {
      const { plan, planPath } = await planFor(fixture);
      expect(plan.compatible).toBe(false);
      expect(plan.compatibilityReason).toMatch(/processor/i);
      await expect(
        runApply({
          cwd: fixture.site,
          planPath,
          upstreamDir: fixture.upstream,
          write: true,
          quiet: true,
        }),
      ).rejects.toThrow(/incompatible/i);
      await expect(
        runRecord({ cwd: fixture.site, planPath, upstreamDir: fixture.upstream, quiet: true }),
      ).rejects.toThrow(/incompatible/i);
    } finally {
      cleanup(fixture);
    }
  });

  it('retains declined decisions across later targets and represents a local deletion', async () => {
    const fixture = createFixture({
      base: {
        'src/components/P.astro': 'base P\n',
        'src/components/Q.astro': 'base Q\n',
      },
      target: {
        'src/components/P.astro': 'target P\n',
        'src/components/Q.astro': 'base Q\n',
      },
      local: { 'src/components/P.astro': 'local P\n' },
    });
    try {
      const first = await planFor(fixture);
      await runRecord({
        cwd: fixture.site,
        planPath: first.planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
        declines: new Map([['src/components/P.astro', 'intentionally retained local P']]),
      });
      const firstOverrides = JSON.parse(
        readFileSync(join(fixture.site, 'docs/maintenance/upstream-overrides.json'), 'utf8'),
      ) as { decisions: Record<string, { hash: string | null }> };
      expect(firstOverrides.decisions['src/components/P.astro']?.hash).toMatch(/^sha256:/);

      writeFile(fixture.upstream, 'src/components/Q.astro', 'target Q\n');
      const targetC = commitAll(fixture.upstream, 'target C');
      const second = await runCheck({
        cwd: fixture.site,
        upstreamDir: fixture.upstream,
        ref: targetC,
        quiet: true,
      });
      await runApply({
        cwd: fixture.site,
        planPath: second.planPath,
        upstreamDir: fixture.upstream,
        write: true,
        quiet: true,
      });
      await runRecord({
        cwd: fixture.site,
        planPath: second.planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
      });
      const secondOverrides = JSON.parse(
        readFileSync(join(fixture.site, 'docs/maintenance/upstream-overrides.json'), 'utf8'),
      ) as { decisions: Record<string, { hash: string | null; targetCommit: string }> };
      expect(secondOverrides.decisions['src/components/P.astro']?.hash).toMatch(/^sha256:/);
      expect(secondOverrides.decisions['src/components/P.astro']?.targetCommit).toBe(targetC);

      rmSync(join(fixture.site, 'src/components/P.astro'));
      writeFile(fixture.upstream, 'src/components/P.astro', 'target P again\n');
      const targetD = commitAll(fixture.upstream, 'target D');
      const third = await runCheck({
        cwd: fixture.site,
        upstreamDir: fixture.upstream,
        ref: targetD,
        quiet: true,
      });
      await runRecord({
        cwd: fixture.site,
        planPath: third.planPath,
        upstreamDir: fixture.upstream,
        quiet: true,
        declines: new Map([
          ['src/components/P.astro', 'intentionally removed the local P article'],
        ]),
      });
      const thirdOverrides = JSON.parse(
        readFileSync(join(fixture.site, 'docs/maintenance/upstream-overrides.json'), 'utf8'),
      ) as { decisions: Record<string, { hash: string | null }> };
      expect(thirdOverrides.decisions['src/components/P.astro']?.hash).toBeNull();
      await runVerify({ cwd: fixture.site, upstreamDir: fixture.upstream, quiet: true });
    } finally {
      cleanup(fixture);
    }
  });

  it('emits pure valid JSON for check --json and functional help', async () => {
    const fixture = createFixture({
      base: { 'src/components/A.astro': 'base\n' },
      target: { 'src/components/A.astro': 'target\n' },
    });
    try {
      const result = spawnSync(
        'bun',
        [
          join(projectRoot, 'scripts/upstream-sync.ts'),
          'check',
          '--json',
          '--upstream-dir',
          fixture.upstream,
          '--ref',
          fixture.target,
        ],
        { cwd: fixture.site, encoding: 'utf8' },
      );
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout) as SyncPlan;
      expect(parsed.targetCommit).toBe(fixture.target);
      const help = spawnSync('bun', [join(projectRoot, 'scripts/upstream-sync.ts'), '--help'], {
        cwd: fixture.site,
        encoding: 'utf8',
      });
      expect(help.status).toBe(0);
      expect(help.stdout).toContain('Usage:');
    } finally {
      cleanup(fixture);
    }
  });
});
