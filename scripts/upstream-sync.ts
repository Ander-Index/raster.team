#!/usr/bin/env bun
/**
 * Scoped upstream synchronization for raster.team.
 *
 * This tool never merges Git histories, commits, pushes or deploys. It compares
 * the recorded upstream baseline, the current site tree and a chosen upstream
 * ref, then writes a reviewable plan under .cache/upstream/. `apply` is the only
 * command that can write site files and is dry-run by default.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';

import { Buffer } from 'node:buffer';

const SCHEMA_VERSION = 1;
const PLAN_VERSION = 1;
const CACHE_RELATIVE = '.cache/upstream';
const BASELINE_PATH = 'docs/maintenance/upstream-baseline.json';
const MANIFEST_PATH = 'docs/maintenance/theme-manifest.json';
const OVERRIDES_PATH = 'docs/maintenance/upstream-overrides.json';
const DEFAULT_REF = 'main';
const MAX_GIT_BUFFER = 128 * 1024 * 1024;

export interface ThemeManifest {
  schemaVersion: number;
  allowedSourceDirs: string[];
  protectedPaths: string[];
  manualPaths: string[];
}

export type Processor = 'unified' | 'satteri';

export interface BaselineMetadata {
  schemaVersion: number;
  upstreamRepository: string;
  baselineCommit: string;
  version: string;
  astroMajor: number;
  processor: Processor;
  starterCommit: string;
  siteBaseCommit: string;
  manifest: string;
  recordedAt?: string;
  files: Record<string, string>;
  dispositions?: Record<string, Disposition>;
}

export interface Decision {
  status: 'declined';
  reason: string;
  /** sha256 of the retained local file, or null when the local file was deleted. */
  hash: string | null;
  targetCommit: string;
}

export interface OverridesMetadata {
  schemaVersion: number;
  decisions: Record<string, Decision>;
}

export interface Disposition {
  status: 'integrated' | 'declined' | 'ignored';
  reason?: string;
  hash?: string | null;
  targetCommit: string;
}

type OperationStatus =
  | 'update'
  | 'merge'
  | 'integrated'
  | 'new'
  | 'delete'
  | 'conflict'
  | 'manual'
  | 'out-of-scope';

type Scope = 'theme' | 'manual' | 'protected' | 'out-of-scope';

interface TreeEntry {
  mode: string;
  sha: string;
}

type CurrentKind = 'absent' | 'file' | 'symlink' | 'directory' | 'other';

interface CurrentEntry {
  exists: boolean;
  kind: CurrentKind;
  hash: string | null;
  mode: string | null;
}

export interface PlanOperation {
  path: string;
  status: OperationStatus;
  scope: Scope;
  action: 'write' | 'delete' | 'none';
  reason?: string;
  baseHash: string | null;
  oursHash: string | null;
  theirsHash: string | null;
  baseMode: string | null;
  oursMode: string | null;
  theirsMode: string | null;
  candidate?: string;
  candidateHash?: string;
  conflictDir?: string;
}

export interface ChangedPath {
  path: string;
  status: string;
  scope: Scope;
}

export interface SyncPlan {
  schemaVersion: number;
  planVersion: number;
  planId: string;
  createdAt: string;
  repository: string;
  baseCommit: string;
  targetCommit: string;
  targetRef: string;
  targetTree: string;
  targetVersion: string | null;
  targetAstroSpec: string | null;
  targetAstroMajor: number | null;
  targetProcessor: Processor | null;
  baselineAstroMajor: number | null;
  baselineProcessor: Processor | null;
  projectAstroMajor: number | null;
  projectProcessor: Processor | null;
  compatible: boolean;
  compatibilityReason: string;
  siteHead: string;
  manifestHash: string;
  baselineHash: string;
  changedPaths: ChangedPath[];
  operations: PlanOperation[];
  summary: Record<string, number>;
}

export interface CheckOptions {
  cwd: string;
  ref?: string;
  upstreamDir?: string;
  cacheDir?: string;
  quiet?: boolean;
  now?: Date;
}

export interface CheckResult {
  plan: SyncPlan;
  planPath: string;
  planDir: string;
}

export interface ApplyOptions {
  cwd: string;
  planPath: string;
  upstreamDir?: string;
  write?: boolean;
  quiet?: boolean;
}

export interface ApplyResult {
  wrote: string[];
  deleted: string[];
  skipped: string[];
  dryRun: boolean;
}

export interface RecordOptions {
  cwd: string;
  planPath: string;
  declines?: Map<string, string>;
  upstreamDir?: string;
  quiet?: boolean;
  now?: Date;
}

export interface RecordResult {
  baselinePath: string;
  overridesPath: string;
  targetCommit: string;
  integrated: number;
  declined: number;
  ignored: number;
}

export interface VerifyOptions {
  cwd: string;
  upstreamDir?: string;
  quiet?: boolean;
}

export interface VerifyResult {
  verifiedFiles: number;
  skippedTreeCheck: boolean;
}

/**
 * Counts actual conflict markers handled here; kept as a named type for
 * readability in the merge helper.
 */
interface MergeResult {
  clean: boolean;
  merged: Buffer;
  conflicts: number;
}

function fail(message: string): never {
  throw new Error(message);
}

function sha256(data: Buffer | string): string {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

function isSafeRepoPath(value: string): boolean {
  if (!value || value.includes('\0') || value.includes('\\')) return false;
  if (value.startsWith('/') || isAbsolute(value)) return false;
  if (/^[A-Za-z]:/.test(value)) return false;
  const normalized = posix.normalize(value);
  if (normalized === '.' || normalized === '..') return false;
  if (normalized !== value) return false;
  if (normalized.startsWith('../') || normalized.includes('/../')) return false;
  return true;
}

function assertSafeRepoPath(value: string): void {
  if (!isSafeRepoPath(value)) fail(`unsafe repository path: ${JSON.stringify(value)}`);
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function realRoot(cwd: string): string {
  const result = runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (result.status !== 0) fail(`not inside a Git repository: ${cwd}`);
  return realpathSync(result.stdout.toString('utf8').trim());
}

function runGit(
  repo: string | null,
  args: string[],
  options: { timeout?: number } = {},
): { status: number; stdout: Buffer; stderr: string } {
  const command = repo ? ['-C', repo, ...args] : args;
  const result = spawnSync('git', command, {
    encoding: 'buffer',
    maxBuffer: MAX_GIT_BUFFER,
    timeout: options.timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
  });
  if (result.error) fail(`git ${args.join(' ')} failed: ${result.error.message}`);
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr.toString('utf8').trim(),
  };
}

function gitText(repo: string, args: string[], timeout?: number): string {
  const result = runGit(repo, args, { timeout });
  if (result.status !== 0) {
    fail(`git ${args.join(' ')} failed: ${result.stderr || `exit ${result.status}`}`);
  }
  return result.stdout.toString('utf8').trim();
}

function resolveCommit(repo: string, ref: string): string {
  const result = runGit(repo, ['rev-parse', '--verify', `${ref}^{commit}`]);
  if (result.status !== 0) fail(`cannot resolve upstream ref ${JSON.stringify(ref)}`);
  return result.stdout.toString('utf8').trim();
}

function resolveUpstreamRepo(cwd: string, path: string): string {
  const unresolved = resolve(cwd, path);
  if (!existsSync(unresolved)) fail(`upstream snapshot not found: ${path}`);
  const absolute = realpathSync(unresolved);
  const result = runGit(absolute, ['rev-parse', '--git-dir']);
  if (result.status !== 0) fail(`not a Git repository: ${path}`);
  return absolute;
}

function gitShow(repo: string, rev: string, path: string): Buffer | null {
  // A partial-clone cache can briefly fail while a lazy blob fetch settles.
  // Retry once before treating a known baseline/target path as absent.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = runGit(repo, ['cat-file', '-p', `${rev}:${path}`]);
    if (result.status === 0) return result.stdout;
  }
  return null;
}

function listTree(repo: string, rev: string): Map<string, TreeEntry> {
  const output = runGit(repo, ['ls-tree', '-r', '-z', rev]).stdout.toString('utf8');
  const entries = new Map<string, TreeEntry>();
  for (const item of output.split('\0')) {
    if (!item) continue;
    const tab = item.indexOf('\t');
    if (tab < 0) continue;
    const [mode, type, sha] = item.slice(0, tab).split(' ');
    const path = item.slice(tab + 1);
    if (type === 'blob') entries.set(path, { mode, sha });
  }
  return entries;
}

function listChanges(repo: string, base: string, target: string): ChangedPath[] {
  const output = runGit(repo, [
    'diff',
    '--name-status',
    '--no-renames',
    '-z',
    base,
    target,
  ]).stdout.toString('utf8');
  const parts = output.split('\0').filter(Boolean);
  const changes: ChangedPath[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const status = parts[i];
    const path = parts[i + 1];
    if (!status || !path) continue;
    changes.push({ path, status: status[0] ?? '?', scope: 'out-of-scope' });
  }
  return changes;
}

function currentEntry(root: string, repoPath: string): CurrentEntry {
  assertSafeRepoPath(repoPath);
  const absolute = join(root, repoPath);
  if (!existsSync(absolute)) return { exists: false, kind: 'absent', hash: null, mode: null };
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink()) return { exists: true, kind: 'symlink', hash: null, mode: '120000' };
  if (stat.isDirectory()) return { exists: true, kind: 'directory', hash: null, mode: '040000' };
  if (!stat.isFile()) return { exists: true, kind: 'other', hash: null, mode: 'unsupported' };
  return {
    exists: true,
    kind: 'file',
    hash: sha256(readFileSync(absolute)),
    mode: (stat.mode & 0o111) !== 0 ? '100755' : '100644',
  };
}

function loadJson<T>(root: string, repoPath: string): T {
  const absolute = join(root, repoPath);
  if (!existsSync(absolute)) fail(`missing ${repoPath}`);
  try {
    return JSON.parse(readFileSync(absolute, 'utf8')) as T;
  } catch (error) {
    fail(`invalid JSON in ${repoPath}: ${(error as Error).message}`);
  }
}

function fileHash(root: string, repoPath: string): string {
  return sha256(readFileSync(join(root, repoPath)));
}

function loadManifest(root: string): ThemeManifest {
  const manifest = loadJson<ThemeManifest>(root, MANIFEST_PATH);
  if (manifest.schemaVersion !== SCHEMA_VERSION) fail('unsupported theme-manifest schemaVersion');
  for (const key of ['allowedSourceDirs', 'protectedPaths', 'manualPaths'] as const) {
    if (!Array.isArray(manifest[key])) fail(`theme-manifest.${key} must be an array`);
    for (const value of manifest[key]) assertSafeRepoPath(value.replace(/\/$/, ''));
  }
  return manifest;
}

function loadBaseline(root: string): BaselineMetadata {
  const baseline = loadJson<BaselineMetadata>(root, BASELINE_PATH);
  if (baseline.schemaVersion !== SCHEMA_VERSION)
    fail('unsupported upstream-baseline schemaVersion');
  for (const field of [
    'upstreamRepository',
    'baselineCommit',
    'version',
    'starterCommit',
    'siteBaseCommit',
    'manifest',
  ] as const) {
    if (typeof baseline[field] !== 'string' || !baseline[field]) {
      fail(`upstream-baseline.${field} is required`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(baseline.baselineCommit)) fail('baselineCommit must be a full SHA-1');
  if (!Number.isInteger(baseline.astroMajor) || baseline.astroMajor < 1) {
    fail('baseline astroMajor must be a positive integer');
  }
  if (baseline.processor !== 'unified' && baseline.processor !== 'satteri') {
    fail('baseline processor must be unified or satteri');
  }
  if (baseline.manifest !== MANIFEST_PATH) fail(`baseline manifest must be ${MANIFEST_PATH}`);
  if (typeof baseline.files !== 'object' || baseline.files === null)
    fail('baseline files is required');
  for (const [path, hash] of Object.entries(baseline.files)) {
    assertSafeRepoPath(path);
    if (!/^sha256:[0-9a-f]{64}$/.test(hash)) fail(`invalid baseline hash for ${path}`);
  }
  return baseline;
}

function loadOverrides(root: string): OverridesMetadata {
  if (!existsSync(join(root, OVERRIDES_PATH))) {
    return { schemaVersion: SCHEMA_VERSION, decisions: {} };
  }
  const overrides = loadJson<OverridesMetadata>(root, OVERRIDES_PATH);
  if (overrides.schemaVersion !== SCHEMA_VERSION)
    fail('unsupported upstream-overrides schemaVersion');
  if (typeof overrides.decisions !== 'object' || overrides.decisions === null) {
    fail('upstream-overrides.decisions is required');
  }
  for (const [path, decision] of Object.entries(overrides.decisions)) {
    assertSafeRepoPath(path);
    if (decision.status !== 'declined') fail(`unsupported decision status for ${path}`);
    if (typeof decision.reason !== 'string' || decision.reason.trim().length < 8) {
      fail(`decision reason for ${path} is too short`);
    }
    if (decision.hash !== null && !/^sha256:[0-9a-f]{64}$/.test(decision.hash)) {
      fail(`invalid decision hash for ${path}`);
    }
    if (!/^[0-9a-f]{40}$/.test(decision.targetCommit)) fail(`invalid decision target for ${path}`);
  }
  return overrides;
}

function isProtected(path: string, manifest: ThemeManifest): boolean {
  for (const pattern of manifest.protectedPaths) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (path === prefix || path.startsWith(prefix)) return true;
      continue;
    }
    if (path === pattern || path.startsWith(`${pattern.replace(/\/$/, '')}/`)) return true;
  }
  return false;
}

function isManual(path: string, manifest: ThemeManifest): boolean {
  return manifest.manualPaths.some(
    (candidate) => path === candidate || path.startsWith(`${candidate.replace(/\/$/, '')}/`),
  );
}

function scopeOf(path: string, manifest: ThemeManifest): Scope {
  if (isProtected(path, manifest)) return 'protected';
  if (isManual(path, manifest)) return 'manual';
  for (const dir of manifest.allowedSourceDirs) {
    if (path.startsWith(dir)) return 'theme';
  }
  return 'out-of-scope';
}

function isAllowedNewSourcePath(path: string, manifest: ThemeManifest): boolean {
  if (scopeOf(path, manifest) !== 'theme') return false;
  if (isProtected(path, manifest) || isManual(path, manifest)) return false;
  return manifest.allowedSourceDirs.some((dir) => path.startsWith(dir));
}

function isBinary(data: Buffer): boolean {
  return data.includes(0);
}

function parseAstroMajor(spec: string | undefined): number | null {
  if (!spec) return null;
  const match = spec.match(/(\d+)(?:\.\d+)*/);
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

interface PackageInfo {
  version: string | null;
  astroSpec: string | null;
  astroMajor: number | null;
  processor: Processor;
}

function detectProcessor(dependencies: Record<string, unknown> | undefined): Processor {
  if (
    dependencies &&
    ('@astrojs/markdown-satteri' in dependencies ||
      'satteri-external-links' in dependencies ||
      '@nullpinter/satteri-katex' in dependencies)
  ) {
    return 'satteri';
  }
  return 'unified';
}

function readProjectPackage(root: string): PackageInfo {
  const data = loadJson<{
    version?: unknown;
    dependencies?: Record<string, unknown>;
  }>(root, 'package.json');
  const spec =
    data.dependencies && typeof data.dependencies.astro === 'string'
      ? data.dependencies.astro
      : null;
  return {
    version: typeof data.version === 'string' ? data.version : null,
    astroSpec: spec,
    astroMajor: parseAstroMajor(spec ?? undefined),
    processor: detectProcessor(data.dependencies),
  };
}

function readUpstreamPackage(repo: string, commit: string): PackageInfo {
  const raw = gitShow(repo, commit, 'package.json');
  if (!raw) return { version: null, astroSpec: null, astroMajor: null, processor: 'unified' };
  try {
    const data = JSON.parse(raw.toString('utf8')) as {
      version?: unknown;
      dependencies?: Record<string, unknown>;
    };
    const spec =
      data.dependencies && typeof data.dependencies.astro === 'string'
        ? data.dependencies.astro
        : null;
    return {
      version: typeof data.version === 'string' ? data.version : null,
      astroSpec: spec,
      astroMajor: parseAstroMajor(spec ?? undefined),
      processor: detectProcessor(data.dependencies),
    };
  } catch {
    return { version: null, astroSpec: null, astroMajor: null, processor: 'unified' };
  }
}

function isCompatible(
  baseline: BaselineMetadata,
  baselinePackage: PackageInfo,
  project: PackageInfo,
  target: PackageInfo,
): { compatible: boolean; reason: string } {
  if (
    baselinePackage.astroMajor === null ||
    project.astroMajor === null ||
    target.astroMajor === null
  ) {
    return {
      compatible: false,
      reason: 'cannot determine Astro major from baseline/project/target',
    };
  }
  if (baselinePackage.astroMajor !== baseline.astroMajor) {
    return {
      compatible: false,
      reason: `recorded baseline Astro ${baseline.astroMajor} does not match snapshot Astro ${baselinePackage.astroMajor}`,
    };
  }
  if (baselinePackage.processor !== baseline.processor) {
    return {
      compatible: false,
      reason: `recorded baseline processor ${baseline.processor} does not match snapshot ${baselinePackage.processor}`,
    };
  }
  if (project.astroMajor !== baseline.astroMajor || project.processor !== baseline.processor) {
    return {
      compatible: false,
      reason: `project Astro ${project.astroMajor}/${project.processor} does not match recorded baseline ${baseline.astroMajor}/${baseline.processor}; complete a deliberate major migration and baseline record first`,
    };
  }
  if (target.astroMajor !== project.astroMajor) {
    return {
      compatible: false,
      reason: `target Astro ${target.astroMajor} is incompatible with project Astro ${project.astroMajor}`,
    };
  }
  if (target.processor !== project.processor) {
    return {
      compatible: false,
      reason: `target markdown processor ${target.processor} is incompatible with project processor ${project.processor}`,
    };
  }
  return {
    compatible: true,
    reason: `Astro ${project.astroMajor} / ${project.processor} target is compatible`,
  };
}

function mergeText(ours: Buffer, base: Buffer, theirs: Buffer): MergeResult {
  const dir = mkdtempSync(join(tmpdir(), 'chirping-upstream-merge-'));
  const oursPath = join(dir, 'ours');
  const basePath = join(dir, 'base');
  const theirsPath = join(dir, 'theirs');
  try {
    writeFileSync(oursPath, ours);
    writeFileSync(basePath, base);
    writeFileSync(theirsPath, theirs);
    const result = spawnSync(
      'git',
      [
        'merge-file',
        '-p',
        '--diff3',
        '-L',
        'ours',
        '-L',
        'base',
        '-L',
        'theirs',
        oursPath,
        basePath,
        theirsPath,
      ],
      { encoding: 'buffer', maxBuffer: MAX_GIT_BUFFER },
    );
    if (result.error) fail(`git merge-file failed: ${result.error.message}`);
    if (result.status === 0) {
      return { clean: true, merged: result.stdout, conflicts: 0 };
    }
    if (result.status !== null && result.status > 0 && result.status < 128) {
      return { clean: false, merged: result.stdout, conflicts: result.status };
    }
    fail(`git merge-file failed with exit ${String(result.status)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalValue(item));
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) result[key] = canonicalValue(source[key]);
    return result;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function planIdFor(plan: Omit<SyncPlan, 'planId'>): string {
  return sha256(canonicalJson(plan));
}

export function sealPlan(plan: Omit<SyncPlan, 'planId'>): SyncPlan {
  return { ...plan, planId: planIdFor(plan) };
}

function atomicWrite(absolute: string, data: Buffer | string, mode = 0o644): void {
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(temporary, data, { mode });
    renameSync(temporary, absolute);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
}

function writePlanDirectory(path: string, data: Buffer | string): void {
  const absolute = join(path);
  atomicWrite(absolute, data);
}

function writeConflictMaterial(
  planDir: string,
  path: string,
  material: { ours: Buffer | null; base: Buffer | null; theirs: Buffer | null; merged?: Buffer },
): string | undefined {
  if (!isSafeRepoPath(path)) return undefined;
  const directory = join(planDir, 'conflicts', path);
  mkdirSync(directory, { recursive: true });
  if (material.ours) writeFileSync(join(directory, 'ours'), material.ours);
  if (material.base) writeFileSync(join(directory, 'base'), material.base);
  if (material.theirs) writeFileSync(join(directory, 'theirs'), material.theirs);
  if (material.merged) writeFileSync(join(directory, 'merged'), material.merged);
  return posix.join('conflicts', path);
}

function ensureUpstreamCache(cwd: string, repository: string, cacheDir: string): string {
  const cache = resolve(cwd, cacheDir);
  const target = join(cache, 'chirping-astro.git');
  mkdirSync(cache, { recursive: true });
  if (!existsSync(target)) {
    const clone = runGit(null, ['clone', '--bare', repository, target], {
      timeout: 180_000,
    });
    if (clone.status !== 0)
      fail(`cannot clone ${repository}: ${clone.stderr || 'git clone failed'}`);
  }
  const fetch = runGit(
    target,
    ['fetch', '--prune', 'origin', '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*'],
    { timeout: 180_000 },
  );
  if (fetch.status !== 0) fail(`cannot fetch ${repository}: ${fetch.stderr || 'git fetch failed'}`);
  assertCompleteSnapshot(target);
  return target;
}

function asRepoPath(relativePath: string): string {
  return relativePath.split(sep).join('/');
}

function candidateRelative(path: string): string {
  return posix.join('files', path);
}

function makeOperation(
  path: string,
  scope: Scope,
  status: OperationStatus,
  action: PlanOperation['action'],
  values: {
    baseHash: string | null;
    oursHash: string | null;
    theirsHash: string | null;
    baseMode: string | null;
    oursMode: string | null;
    theirsMode: string | null;
  },
  reason?: string,
): PlanOperation {
  return {
    path,
    scope,
    status,
    action,
    baseHash: values.baseHash,
    oursHash: values.oursHash,
    theirsHash: values.theirsHash,
    baseMode: values.baseMode,
    oursMode: values.oursMode,
    theirsMode: values.theirsMode,
    ...(reason ? { reason } : {}),
  };
}

function buildOperation(
  root: string,
  planDir: string,
  upstreamRepo: string,
  baseCommit: string,
  targetCommit: string,
  path: string,
  scope: Scope,
  baseEntries: Map<string, TreeEntry>,
  targetEntries: Map<string, TreeEntry>,
  manifest: ThemeManifest,
): PlanOperation {
  const base = baseEntries.get(path);
  const target = targetEntries.get(path);
  const ours = currentEntry(root, path);
  const baseHash = base ? sha256(gitShow(upstreamRepo, baseCommit, path) ?? Buffer.alloc(0)) : null;
  const theirsHash = target
    ? sha256(gitShow(upstreamRepo, targetCommit, path) ?? Buffer.alloc(0))
    : null;
  const values = {
    baseHash,
    oursHash: ours.hash,
    theirsHash,
    baseMode: base?.mode ?? null,
    oursMode: ours.mode,
    theirsMode: target?.mode ?? null,
  };

  if (scope === 'protected' || scope === 'manual') {
    if (
      ours.kind === 'file' &&
      ours.hash &&
      ours.hash === theirsHash &&
      ours.mode === (target?.mode ?? null)
    ) {
      return makeOperation(
        path,
        scope,
        'integrated',
        'none',
        values,
        `${scope} path already matches target; no write needed`,
      );
    }
    return makeOperation(
      path,
      scope,
      'manual',
      'none',
      values,
      `${scope} path: manual review required; never auto-applied`,
    );
  }

  if (scope === 'out-of-scope') {
    if (ours.kind === 'file' && ours.hash && ours.hash === theirsHash) {
      return makeOperation(path, scope, 'integrated', 'none', values, 'already matches target');
    }
    return makeOperation(
      path,
      scope,
      'out-of-scope',
      'none',
      values,
      'outside the theme sync scope; upstream copy is not applied',
    );
  }

  if (target === undefined) {
    if (ours.kind === 'absent') {
      return makeOperation(path, scope, 'integrated', 'none', values, 'already absent');
    }
    if (ours.kind === 'file' && base && ours.hash === baseHash) {
      return makeOperation(path, scope, 'delete', 'delete', values);
    }
    return makeOperation(
      path,
      scope,
      'conflict',
      'none',
      values,
      `upstream deleted a locally ${ours.kind} path`,
    );
  }

  if (base === undefined) {
    if (ours.kind === 'absent') {
      if (!isAllowedNewSourcePath(path, manifest)) {
        return makeOperation(
          path,
          scope,
          'manual',
          'none',
          values,
          'new upstream file is outside the allowed source directories',
        );
      }
      if (!target || target.mode !== '100644') {
        return makeOperation(
          path,
          scope,
          'manual',
          'none',
          values,
          'new upstream file has an unsupported mode',
        );
      }
      const content = gitShow(upstreamRepo, targetCommit, path);
      if (!content)
        return makeOperation(path, scope, 'manual', 'none', values, 'cannot read new file');
      if (isBinary(content)) {
        return makeOperation(
          path,
          scope,
          'manual',
          'none',
          values,
          'new binary file is not auto-applied',
        );
      }
      const candidate = candidateRelative(path);
      writePlanDirectory(join(planDir, candidate), content);
      return {
        ...makeOperation(path, scope, 'new', 'write', values),
        candidate,
        candidateHash: sha256(content),
      };
    }
    if (ours.kind === 'file' && ours.hash === theirsHash) {
      return makeOperation(
        path,
        scope,
        'integrated',
        'none',
        values,
        'local file already matches target',
      );
    }
    return makeOperation(
      path,
      scope,
      'conflict',
      'none',
      values,
      `upstream added a file but the local path is ${ours.kind}`,
    );
  }

  if (ours.kind !== 'file') {
    return makeOperation(
      path,
      scope,
      'conflict',
      'none',
      values,
      `local path is ${ours.kind}; upstream path is a regular file`,
    );
  }

  if (!target || target.mode !== '100644' || base.mode !== target.mode) {
    return makeOperation(
      path,
      scope,
      'manual',
      'none',
      values,
      'upstream changed a file mode or uses an unsupported mode',
    );
  }

  if (ours.mode !== '100644' && ours.mode !== '100755') {
    return makeOperation(
      path,
      scope,
      'manual',
      'none',
      values,
      'working file is a symlink or non-regular file',
    );
  }

  if (ours.hash === theirsHash) {
    return makeOperation(path, scope, 'integrated', 'none', values, 'already matches target');
  }

  if (ours.hash === baseHash) {
    const content = gitShow(upstreamRepo, targetCommit, path);
    if (!content)
      return makeOperation(path, scope, 'manual', 'none', values, 'cannot read target file');
    if (isBinary(content)) {
      return makeOperation(
        path,
        scope,
        'manual',
        'none',
        values,
        'binary update is not auto-applied',
      );
    }
    const candidate = candidateRelative(path);
    writePlanDirectory(join(planDir, candidate), content);
    return {
      ...makeOperation(path, scope, 'update', 'write', values),
      candidate,
      candidateHash: sha256(content),
    };
  }

  const baseContent = gitShow(upstreamRepo, baseCommit, path);
  const oursContent = readFileSync(join(root, path));
  const theirsContent = gitShow(upstreamRepo, targetCommit, path);
  if (!baseContent || !theirsContent) {
    return makeOperation(path, scope, 'manual', 'none', values, 'cannot read merge inputs');
  }
  if (isBinary(baseContent) || isBinary(oursContent) || isBinary(theirsContent)) {
    return makeOperation(
      path,
      scope,
      'manual',
      'none',
      values,
      'binary three-way merge is not supported',
    );
  }
  const merged = mergeText(oursContent, baseContent, theirsContent);
  const conflictDir = writeConflictMaterial(planDir, path, {
    ours: oursContent,
    base: baseContent,
    theirs: theirsContent,
    ...(merged.clean ? {} : { merged: merged.merged }),
  });
  if (!merged.clean) {
    return {
      ...makeOperation(
        path,
        scope,
        'conflict',
        'none',
        values,
        `overlapping three-way merge (${merged.conflicts} conflict marker(s))`,
      ),
      ...(conflictDir ? { conflictDir } : {}),
    };
  }
  const candidate = candidateRelative(path);
  writePlanDirectory(join(planDir, candidate), merged.merged);
  return {
    ...makeOperation(
      path,
      scope,
      'merge',
      'write',
      values,
      'three-way merge with disjoint local changes',
    ),
    candidate,
    candidateHash: sha256(merged.merged),
    ...(conflictDir ? { conflictDir } : {}),
  };
}

function summarize(operations: PlanOperation[]): Record<string, number> {
  const summary: Record<string, number> = {
    changed: operations.length,
    write: 0,
    delete: 0,
    merge: 0,
    conflict: 0,
    manual: 0,
    integrated: 0,
    outOfScope: 0,
  };
  for (const operation of operations) {
    if (operation.action === 'write') summary.write += 1;
    if (operation.action === 'delete') summary.delete += 1;
    if (operation.status === 'merge') summary.merge += 1;
    if (operation.status === 'conflict') summary.conflict += 1;
    if (operation.status === 'manual') summary.manual += 1;
    if (operation.status === 'integrated') summary.integrated += 1;
    if (operation.status === 'out-of-scope') summary.outOfScope += 1;
  }
  return summary;
}

function findProjectRoot(cwd: string): string {
  return realRoot(resolve(cwd));
}

function loadInputs(root: string): {
  manifest: ThemeManifest;
  baseline: BaselineMetadata;
  overrides: OverridesMetadata;
} {
  return {
    manifest: loadManifest(root),
    baseline: loadBaseline(root),
    overrides: loadOverrides(root),
  };
}

export async function runCheck(options: CheckOptions): Promise<CheckResult> {
  const root = findProjectRoot(options.cwd);
  const inputs = loadInputs(root);
  const upstreamDir = options.upstreamDir ? resolve(options.cwd, options.upstreamDir) : null;
  const cacheDir = options.cacheDir ?? CACHE_RELATIVE;
  const upstreamRepo = upstreamDir
    ? resolveUpstreamRepo(options.cwd, options.upstreamDir ?? upstreamDir)
    : ensureUpstreamCache(root, inputs.baseline.upstreamRepository, cacheDir);
  if (upstreamDir) assertCompleteSnapshot(upstreamRepo);
  const ref = options.ref ?? DEFAULT_REF;
  const baseCommit = resolveCommit(upstreamRepo, inputs.baseline.baselineCommit);
  const targetCommit = resolveCommit(upstreamRepo, ref);
  const targetTree = gitText(upstreamRepo, ['rev-parse', `${targetCommit}^{tree}`]);
  const projectPackage = readProjectPackage(root);
  const baselinePackage = readUpstreamPackage(upstreamRepo, baseCommit);
  const targetPackage = readUpstreamPackage(upstreamRepo, targetCommit);
  const compatibility = isCompatible(
    inputs.baseline,
    baselinePackage,
    projectPackage,
    targetPackage,
  );

  const baseEntries = listTree(upstreamRepo, baseCommit);
  const targetEntries = listTree(upstreamRepo, targetCommit);
  const changes = listChanges(upstreamRepo, baseCommit, targetCommit);
  const planDir = join(root, cacheDir, 'plans', targetCommit.slice(0, 12));
  rmSync(planDir, { recursive: true, force: true });
  mkdirSync(planDir, { recursive: true });

  const operations: PlanOperation[] = [];
  for (const change of changes) {
    assertSafeRepoPath(change.path);
    const scope = scopeOf(change.path, inputs.manifest);
    change.scope = scope;
    operations.push(
      buildOperation(
        root,
        planDir,
        upstreamRepo,
        baseCommit,
        targetCommit,
        change.path,
        scope,
        baseEntries,
        targetEntries,
        inputs.manifest,
      ),
    );
  }

  const siteHead = gitText(root, ['rev-parse', 'HEAD']);
  const planWithoutId: Omit<SyncPlan, 'planId'> = {
    schemaVersion: SCHEMA_VERSION,
    planVersion: PLAN_VERSION,
    createdAt: (options.now ?? new Date()).toISOString(),
    repository: inputs.baseline.upstreamRepository,
    baseCommit,
    targetCommit,
    targetRef: ref,
    targetTree,
    targetVersion: targetPackage.version,
    targetAstroSpec: targetPackage.astroSpec,
    targetAstroMajor: targetPackage.astroMajor,
    targetProcessor: targetPackage.processor,
    baselineAstroMajor: baselinePackage.astroMajor,
    baselineProcessor: baselinePackage.processor,
    projectAstroMajor: projectPackage.astroMajor,
    projectProcessor: projectPackage.processor,
    compatible: compatibility.compatible,
    compatibilityReason: compatibility.reason,
    siteHead,
    manifestHash: fileHash(root, MANIFEST_PATH),
    baselineHash: fileHash(root, BASELINE_PATH),
    changedPaths: changes,
    operations,
    summary: summarize(operations),
  };
  const plan = sealPlan(planWithoutId);
  const planPath = join(planDir, 'plan.json');
  atomicWrite(planPath, `${JSON.stringify(plan, null, 2)}\n`);

  if (!options.quiet) printCheck(plan, planPath, root);
  return { plan, planPath, planDir };
}

function printCheck(plan: SyncPlan, planPath: string, root: string): void {
  const relativePlan = asRepoPath(relative(root, planPath));
  console.log('Upstream check');
  console.log(`  repository:    ${plan.repository}`);
  console.log(`  base:          ${plan.baseCommit}`);
  console.log(`  target:        ${plan.targetCommit} (${plan.targetRef})`);
  console.log(
    `  target Astro:  ${plan.targetAstroMajor ?? 'unknown'}/${plan.targetProcessor ?? 'unknown'} (project ${plan.projectAstroMajor ?? 'unknown'}/${plan.projectProcessor ?? 'unknown'})`,
  );
  console.log(
    `  compatibility: ${plan.compatible ? 'compatible' : 'INCOMPATIBLE'} — ${plan.compatibilityReason}`,
  );
  console.log(
    `  changed:       ${plan.summary.changed} paths; write ${plan.summary.write}, delete ${plan.summary.delete}, merge ${plan.summary.merge}, conflict ${plan.summary.conflict}, manual ${plan.summary.manual}, integrated ${plan.summary.integrated}, out-of-scope ${plan.summary.outOfScope}`,
  );
  for (const operation of plan.operations) {
    const action =
      operation.action === 'write' ? 'WRITE' : operation.action === 'delete' ? 'DELETE' : 'SKIP';
    console.log(`  ${action.padEnd(6)} ${operation.status.padEnd(12)} ${operation.path}`);
    if (operation.reason) console.log(`         ${operation.reason}`);
  }
  console.log(`  plan:          ${relativePlan}`);
  if (!plan.compatible) {
    console.log(
      '  apply/record:  REFUSED for this target (major/processor mismatch). Manual port only.',
    );
  }
  console.log('  site files:    unchanged (check writes only ignored cache)');
}

interface ValidatedPlan {
  plan: SyncPlan;
  planDir: string;
}

function parsePlan(value: unknown): SyncPlan {
  if (!value || typeof value !== 'object') fail('plan must be an object');
  const plan = value as SyncPlan;
  if (plan.schemaVersion !== SCHEMA_VERSION || plan.planVersion !== PLAN_VERSION) {
    fail('unsupported plan version');
  }
  if (typeof plan.planId !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(plan.planId)) {
    fail('planId is invalid');
  }
  for (const field of [
    'repository',
    'baseCommit',
    'targetCommit',
    'targetTree',
    'siteHead',
  ] as const) {
    if (typeof plan[field] !== 'string' || !plan[field]) fail(`plan.${field} is required`);
  }
  if (!Array.isArray(plan.operations) || !Array.isArray(plan.changedPaths)) {
    fail('plan operations/changedPaths must be arrays');
  }
  if (!Number.isInteger(plan.targetAstroMajor) || !Number.isInteger(plan.projectAstroMajor)) {
    fail('plan Astro major fields are required');
  }
  if (!Number.isInteger(plan.baselineAstroMajor)) {
    fail('plan baseline Astro major is required');
  }
  if (plan.targetProcessor !== 'unified' && plan.targetProcessor !== 'satteri') {
    fail('plan target processor is invalid');
  }
  if (plan.projectProcessor !== 'unified' && plan.projectProcessor !== 'satteri') {
    fail('plan project processor is invalid');
  }
  if (plan.baselineProcessor !== 'unified' && plan.baselineProcessor !== 'satteri') {
    fail('plan baseline processor is invalid');
  }
  if (typeof plan.compatible !== 'boolean') fail('plan compatible flag is required');
  return plan;
}

function partialCloneFilter(repo: string): string | null {
  const result = runGit(repo, ['config', '--get', 'remote.origin.partialclonefilter']);
  if (result.status !== 0) return null;
  const value = result.stdout.toString('utf8').trim();
  return value || null;
}

function assertCompleteSnapshot(repo: string): void {
  const filter = partialCloneFilter(repo);
  if (filter) {
    fail(
      `upstream snapshot is a partial clone (${filter}); use a complete clone via check or --upstream-dir`,
    );
  }
}

function resolveSnapshot(root: string, upstreamDir?: string): string {
  if (upstreamDir) {
    const repo = resolveUpstreamRepo(root, upstreamDir);
    assertCompleteSnapshot(repo);
    return repo;
  }
  const cache = join(root, CACHE_RELATIVE, 'chirping-astro.git');
  if (!existsSync(cache)) {
    fail('a complete upstream snapshot is required; run check first or pass --upstream-dir <path>');
  }
  assertCompleteSnapshot(cache);
  return cache;
}

function validatePlanAgainstSnapshot(
  root: string,
  plan: SyncPlan,
  upstreamRepo: string,
): {
  baseline: BaselineMetadata;
  manifest: ThemeManifest;
  targetPackage: PackageInfo;
} {
  const inputs = loadInputs(root);
  if (plan.repository !== inputs.baseline.upstreamRepository) {
    fail('plan repository does not match baseline');
  }
  if (plan.baseCommit !== inputs.baseline.baselineCommit) {
    fail('plan base does not match baseline');
  }
  if (plan.manifestHash !== fileHash(root, MANIFEST_PATH)) fail('plan manifest hash is stale');
  if (plan.baselineHash !== fileHash(root, BASELINE_PATH)) fail('plan baseline hash is stale');

  const actualBase = resolveCommit(upstreamRepo, plan.baseCommit);
  if (actualBase !== plan.baseCommit) fail('plan base commit is not in the upstream snapshot');
  const actualTarget = resolveCommit(upstreamRepo, plan.targetCommit);
  if (actualTarget !== plan.targetCommit)
    fail('plan target commit is not in the upstream snapshot');
  const actualTree = gitText(upstreamRepo, ['rev-parse', `${plan.targetCommit}^{tree}`]);
  if (actualTree !== plan.targetTree) fail('plan target tree does not match the upstream snapshot');

  const baselinePackage = readUpstreamPackage(upstreamRepo, plan.baseCommit);
  const targetPackage = readUpstreamPackage(upstreamRepo, plan.targetCommit);
  const projectPackage = readProjectPackage(root);
  if (plan.baselineAstroMajor !== baselinePackage.astroMajor) {
    fail('plan baseline Astro major does not match the snapshot');
  }
  if (plan.baselineProcessor !== baselinePackage.processor) {
    fail('plan baseline processor does not match the snapshot');
  }
  if (plan.targetAstroMajor !== targetPackage.astroMajor) {
    fail('plan target Astro major does not match the snapshot');
  }
  if (plan.targetProcessor !== targetPackage.processor) {
    fail('plan target processor does not match the snapshot');
  }
  if (plan.projectAstroMajor !== projectPackage.astroMajor) {
    fail('project Astro major changed since check');
  }
  if (plan.projectProcessor !== projectPackage.processor) {
    fail('project markdown processor changed since check');
  }
  const compatibility = isCompatible(
    inputs.baseline,
    baselinePackage,
    projectPackage,
    targetPackage,
  );
  if (!compatibility.compatible) fail(`target is incompatible: ${compatibility.reason}`);
  if (plan.compatible !== true) fail(`plan is marked incompatible: ${plan.compatibilityReason}`);
  return { baseline: inputs.baseline, manifest: inputs.manifest, targetPackage };
}

function loadPlanFile(planPath: string): ValidatedPlan {
  const absolute = resolve(planPath);
  if (!existsSync(absolute)) fail(`plan not found: ${planPath}`);
  const plan = parsePlan(loadJsonAbsolute(absolute));
  const withoutId = { ...plan } as Partial<SyncPlan>;
  delete withoutId.planId;
  if (planIdFor(withoutId as Omit<SyncPlan, 'planId'>) !== plan.planId)
    fail('plan integrity check failed');
  const planDir = dirname(absolute);
  return { plan, planDir };
}

function loadJsonAbsolute(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    fail(`invalid plan JSON: ${(error as Error).message}`);
  }
}

function assertCandidate(planDir: string, operation: PlanOperation): Buffer {
  if (!operation.candidate) fail(`missing candidate for ${operation.path}`);
  assertSafeRepoPath(operation.candidate);
  const absolute = resolve(planDir, operation.candidate);
  if (!isInside(realpathSync(planDir), realpathSync(dirname(absolute)))) {
    fail(`candidate escapes plan cache: ${operation.candidate}`);
  }
  if (!existsSync(absolute)) fail(`missing candidate: ${operation.candidate}`);
  if (!lstatSync(absolute).isFile())
    fail(`candidate is not a regular file: ${operation.candidate}`);
  const data = readFileSync(absolute);
  if (sha256(data) !== operation.candidateHash)
    fail(`candidate hash mismatch: ${operation.candidate}`);
  if (isBinary(data)) fail(`candidate is binary: ${operation.path}`);
  return data;
}

function assertNoSymlinkEscape(root: string, repoPath: string): void {
  assertSafeRepoPath(repoPath);
  const rootReal = realpathSync(root);
  let cursor = rootReal;
  const parts = repoPath.split('/');
  for (let i = 0; i < parts.length; i += 1) {
    cursor = join(cursor, parts[i]);
    if (!existsSync(cursor)) {
      // A missing component is fine for a new file/directory; nothing further
      // can exist to escape through.
      break;
    }
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      const resolved = realpathSync(cursor);
      if (!isInside(rootReal, resolved)) fail(`symlink escapes repository: ${repoPath}`);
    }
  }
}

function validateOperationCurrent(root: string, operation: PlanOperation): CurrentEntry {
  assertSafeRepoPath(operation.path);
  assertNoSymlinkEscape(root, operation.path);
  const current = currentEntry(root, operation.path);
  if (current.hash !== operation.oursHash || current.mode !== operation.oursMode) {
    fail(
      `current file is stale for ${operation.path} (expected ${operation.oursHash ?? 'absent'}, got ${current.hash ?? 'absent'})`,
    );
  }
  return current;
}

function assertWritableDestination(root: string, repoPath: string): void {
  assertNoSymlinkEscape(root, repoPath);
  let cursor = root;
  const parts = repoPath.split('/');
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = join(cursor, parts[i]);
    if (!existsSync(cursor)) return;
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      const resolved = realpathSync(cursor);
      if (!isInside(realpathSync(root), resolved) || !statSync(resolved).isDirectory()) {
        fail(`unsafe symlink parent for ${repoPath}`);
      }
      continue;
    }
    if (!stat.isDirectory()) fail(`parent path is not a directory for ${repoPath}`);
  }
  const destination = join(root, repoPath);
  if (!existsSync(destination)) return;
  const final = lstatSync(destination);
  if (!final.isFile()) fail(`destination is not a regular file for ${repoPath}`);
}

function assertDeleteDestination(root: string, repoPath: string): void {
  assertNoSymlinkEscape(root, repoPath);
  const current = currentEntry(root, repoPath);
  if (current.kind !== 'file') fail(`delete target is not a regular file: ${repoPath}`);
}

function removeEmptyParents(root: string, repoPath: string): void {
  let current = dirname(join(root, repoPath));
  const rootReal = realpathSync(root);
  while (current !== rootReal && isInside(rootReal, current)) {
    try {
      if (readdirSync(current).length > 0) return;
      rmSync(current);
    } catch {
      return;
    }
    current = dirname(current);
  }
}

function preflightApply(
  root: string,
  plan: SyncPlan,
  planDir: string,
  manifest: ThemeManifest,
): { writes: Map<string, Buffer>; deletes: string[] } {
  const writes = new Map<string, Buffer>();
  const deletes: string[] = [];
  for (const operation of plan.operations) {
    assertSafeRepoPath(operation.path);
    if (scopeOf(operation.path, manifest) !== operation.scope) {
      fail(`plan scope does not match the current manifest for ${operation.path}`);
    }
    if (
      (operation.scope === 'protected' || operation.scope === 'manual') &&
      operation.action !== 'none'
    ) {
      fail(`plan attempts to write ${operation.scope} path: ${operation.path}`);
    }
    const current = validateOperationCurrent(root, operation);
    if (operation.action === 'write') {
      if (
        operation.status !== 'update' &&
        operation.status !== 'merge' &&
        operation.status !== 'new'
      ) {
        fail(`unexpected write status for ${operation.path}: ${operation.status}`);
      }
      assertWritableDestination(root, operation.path);
      writes.set(operation.path, assertCandidate(planDir, operation));
    } else if (operation.action === 'delete') {
      if (operation.status !== 'delete') fail(`unexpected delete status for ${operation.path}`);
      if (current.kind !== 'file') fail(`delete target is not a regular file: ${operation.path}`);
      assertDeleteDestination(root, operation.path);
      deletes.push(operation.path);
    }
  }
  return { writes, deletes };
}

export async function runApply(options: ApplyOptions): Promise<ApplyResult> {
  const root = findProjectRoot(options.cwd);
  const validated = loadPlanFile(resolve(options.cwd, options.planPath));
  const { plan, planDir } = validated;
  const upstreamRepo = resolveSnapshot(root, options.upstreamDir);
  const { manifest } = validatePlanAgainstSnapshot(root, plan, upstreamRepo);
  const currentHead = gitText(root, ['rev-parse', 'HEAD']);
  if (currentHead !== plan.siteHead) fail('plan is stale: repository HEAD changed since check');
  const { writes, deletes } = preflightApply(root, plan, planDir, manifest);
  const skipped = plan.operations
    .filter((operation) => operation.action === 'none')
    .map((operation) => operation.path);

  if (!options.write) {
    if (!options.quiet) {
      console.log('Dry run (no site files written). Re-run with --write after review.');
      for (const path of writes.keys()) console.log(`  WOULD WRITE ${path}`);
      for (const path of deletes) console.log(`  WOULD DELETE ${path}`);
      for (const operation of plan.operations) {
        if (operation.action === 'none' && operation.status === 'conflict') {
          console.log(`  CONFLICT ${operation.path} -> ${operation.conflictDir ?? 'cache'}`);
        }
      }
    }
    return { wrote: [], deleted: [], skipped, dryRun: true };
  }

  for (const path of [...deletes].sort((a, b) => b.split('/').length - a.split('/').length)) {
    assertDeleteDestination(root, path);
    rmSync(join(root, path));
    removeEmptyParents(root, path);
  }
  for (const [path, data] of writes) {
    assertWritableDestination(root, path);
    const absolute = join(root, path);
    const current = existsSync(absolute) ? lstatSync(absolute) : null;
    atomicWrite(absolute, data, current ? current.mode & 0o777 : 0o644);
  }

  if (!options.quiet) {
    for (const path of writes.keys()) console.log(`  WROTE  ${path}`);
    for (const path of deletes) console.log(`  DELETED ${path}`);
    for (const operation of plan.operations) {
      if (
        operation.action === 'none' &&
        operation.status !== 'integrated' &&
        operation.status !== 'out-of-scope'
      ) {
        console.log(`  KEPT ${operation.path} (${operation.status})`);
      }
    }
    console.log('  baseline: not advanced; run record explicitly after review');
  }
  return { wrote: [...writes.keys()], deleted: deletes, skipped, dryRun: false };
}

function currentMatchesTarget(current: CurrentEntry, operation: PlanOperation): boolean {
  if (operation.theirsHash === null) return current.kind === 'absent';
  if (operation.theirsMode !== '100644') return false;
  return (
    current.kind === 'file' &&
    current.hash === operation.theirsHash &&
    current.mode === operation.theirsMode
  );
}

function decisionMatchesCurrent(current: CurrentEntry, decision: Decision): boolean {
  if (decision.hash === null) return current.kind === 'absent';
  return current.kind === 'file' && current.hash === decision.hash;
}

function dispositionMatchesCurrent(current: CurrentEntry, disposition: Disposition): boolean {
  if (disposition.hash === null || disposition.hash === undefined) {
    return current.kind === 'absent';
  }
  return current.kind === 'file' && current.hash === disposition.hash;
}

function parseDeclineMap(declines: Map<string, string> | undefined): Map<string, string> {
  const result = new Map<string, string>();
  for (const [path, reason] of declines ?? []) {
    assertSafeRepoPath(path);
    if (reason.trim().length < 8)
      fail(`decline reason for ${path} must be meaningful (8+ characters)`);
    result.set(path, reason.trim());
  }
  return result;
}

function mergeCandidateApplied(root: string, planDir: string, operation: PlanOperation): boolean {
  if (operation.status !== 'merge' || !operation.candidateHash) return false;
  const current = currentEntry(root, operation.path);
  if (current.kind !== 'file' || current.hash !== operation.candidateHash) return false;
  assertCandidate(planDir, operation);
  return true;
}

export async function runRecord(options: RecordOptions): Promise<RecordResult> {
  const root = findProjectRoot(options.cwd);
  const validated = loadPlanFile(resolve(options.cwd, options.planPath));
  const { plan, planDir } = validated;
  const upstreamRepo = resolveSnapshot(root, options.upstreamDir);
  const { baseline, manifest, targetPackage } = validatePlanAgainstSnapshot(
    root,
    plan,
    upstreamRepo,
  );
  const overrides = loadOverrides(root);
  const declines = parseDeclineMap(options.declines);
  const operationPaths = new Set(plan.operations.map((operation) => operation.path));
  for (const path of declines.keys()) {
    if (!operationPaths.has(path)) fail(`decline path is not part of this plan: ${path}`);
  }

  const decisions: Record<string, Decision> = {};
  const dispositions: Record<string, Disposition> = {};
  let integrated = 0;
  let declined = 0;
  let ignored = 0;

  // Keep prior retained-local decisions for paths that this (later) upstream
  // target did not touch. Their bytes must still match; otherwise the ledger is
  // stale rather than silently erased.
  for (const [path, existing] of Object.entries(overrides.decisions)) {
    if (operationPaths.has(path)) continue;
    const current = currentEntry(root, path);
    if (!decisionMatchesCurrent(current, existing)) {
      fail(`stale decision for ${path}: current file hash changed`);
    }
    decisions[path] = { ...existing, targetCommit: plan.targetCommit };
    dispositions[path] = {
      status: 'declined',
      reason: existing.reason,
      hash: current.hash,
      targetCommit: plan.targetCommit,
    };
  }

  // Retain prior ignored dispositions for paths outside the current plan too.
  for (const [path, previous] of Object.entries(baseline.dispositions ?? {})) {
    if (operationPaths.has(path) || decisions[path]) continue;
    const current = currentEntry(root, path);
    if (!dispositionMatchesCurrent(current, previous)) {
      fail(`stale disposition for ${path}: current file hash changed`);
    }
    dispositions[path] = { ...previous, targetCommit: plan.targetCommit };
  }

  for (const operation of plan.operations) {
    assertSafeRepoPath(operation.path);
    if (scopeOf(operation.path, manifest) !== operation.scope) {
      fail(`plan scope does not match the current manifest for ${operation.path}`);
    }
    const current = currentEntry(root, operation.path);
    if (currentMatchesTarget(current, operation)) {
      integrated += 1;
      continue;
    }
    const explicit = declines.get(operation.path);
    const existing = overrides.decisions[operation.path];
    let reason: string | null = explicit ?? null;
    if (!reason && existing) {
      if (!decisionMatchesCurrent(current, existing)) {
        fail(`stale decision for ${operation.path}: current file hash changed`);
      }
      reason = existing.reason;
    }
    if (!reason && mergeCandidateApplied(root, planDir, operation)) {
      reason = 'three-way merge applied; local customization retained';
    }
    if (!reason && operation.scope === 'out-of-scope') {
      reason = 'outside the theme sync scope; upstream copy is not applied';
    }
    if (!reason) {
      fail(
        `unresolved upstream change for ${operation.path} (${operation.status}); run apply or pass --decline "${operation.path}=<reason>"`,
      );
    }
    if (reason.trim().length < 8) fail(`decline reason for ${operation.path} is too short`);
    const normalizedReason = reason.trim();
    if (operation.scope === 'out-of-scope') {
      dispositions[operation.path] = {
        status: 'ignored',
        reason: normalizedReason,
        hash: current.hash,
        targetCommit: plan.targetCommit,
      };
      ignored += 1;
      continue;
    }
    if (current.kind !== 'file' && current.kind !== 'absent') {
      fail(`cannot record a non-regular retained path (${current.kind}): ${operation.path}`);
    }
    decisions[operation.path] = {
      status: 'declined',
      reason: normalizedReason,
      hash: current.hash,
      targetCommit: plan.targetCommit,
    };
    dispositions[operation.path] = {
      status: 'declined',
      reason: normalizedReason,
      hash: current.hash,
      targetCommit: plan.targetCommit,
    };
    declined += 1;
  }

  const actualTargetTree = gitText(upstreamRepo, ['rev-parse', `${plan.targetCommit}^{tree}`]);
  if (actualTargetTree !== plan.targetTree) {
    fail('plan target tree does not match the upstream snapshot');
  }
  const targetEntries = listTree(upstreamRepo, plan.targetCommit);
  const files: Record<string, string> = {};
  for (const [path, entry] of targetEntries) {
    const scope = scopeOf(path, manifest);
    if (scope !== 'theme' && scope !== 'manual') continue;
    if (entry.mode !== '100644') continue;
    const content = gitShow(upstreamRepo, plan.targetCommit, path);
    if (!content) continue;
    files[path] = sha256(content);
  }

  if (targetPackage.astroMajor === null) fail('target Astro major is unknown');
  const now = (options.now ?? new Date()).toISOString();
  const nextBaseline: BaselineMetadata = {
    schemaVersion: SCHEMA_VERSION,
    upstreamRepository: baseline.upstreamRepository,
    baselineCommit: plan.targetCommit,
    version: targetPackage.version ?? plan.targetVersion ?? baseline.version,
    astroMajor: targetPackage.astroMajor,
    processor: targetPackage.processor,
    starterCommit: baseline.starterCommit,
    siteBaseCommit: gitText(root, ['rev-parse', 'HEAD']),
    manifest: MANIFEST_PATH,
    recordedAt: now,
    files,
    dispositions,
  };
  const nextOverrides: OverridesMetadata = {
    schemaVersion: SCHEMA_VERSION,
    decisions,
  };
  atomicWrite(join(root, BASELINE_PATH), `${JSON.stringify(nextBaseline, null, 2)}\n`);
  atomicWrite(join(root, OVERRIDES_PATH), `${JSON.stringify(nextOverrides, null, 2)}\n`);
  if (!options.quiet) {
    console.log(`Recorded upstream baseline ${plan.targetCommit}`);
    console.log(`  integrated: ${integrated}, declined: ${declined}, ignored: ${ignored}`);
    console.log(`  files tracked: ${Object.keys(files).length}`);
    console.log(`  ${BASELINE_PATH}`);
    console.log(`  ${OVERRIDES_PATH}`);
  }
  return {
    baselinePath: BASELINE_PATH,
    overridesPath: OVERRIDES_PATH,
    targetCommit: plan.targetCommit,
    integrated,
    declined,
    ignored,
  };
}

export async function runVerify(options: VerifyOptions): Promise<VerifyResult> {
  const root = findProjectRoot(options.cwd);
  const inputs = loadInputs(root);
  const project = readProjectPackage(root);
  if (inputs.baseline.astroMajor !== project.astroMajor) {
    fail(
      `baseline Astro ${inputs.baseline.astroMajor} does not match project Astro ${project.astroMajor}`,
    );
  }
  if (inputs.baseline.processor !== project.processor) {
    fail(
      `baseline processor ${inputs.baseline.processor} does not match project processor ${project.processor}`,
    );
  }
  for (const [path, hash] of Object.entries(inputs.baseline.files)) {
    assertSafeRepoPath(path);
    if (!/^sha256:[0-9a-f]{64}$/.test(hash)) fail(`invalid baseline hash for ${path}`);
  }
  for (const [path, decision] of Object.entries(inputs.overrides.decisions)) {
    if (decision.targetCommit !== inputs.baseline.baselineCommit) {
      fail(
        `override decision targets ${decision.targetCommit}, not baseline ${inputs.baseline.baselineCommit}`,
      );
    }
    const current = currentEntry(root, path);
    if (!decisionMatchesCurrent(current, decision)) {
      fail(`override decision for ${path} no longer matches the current file`);
    }
  }

  const cache = join(root, CACHE_RELATIVE, 'chirping-astro.git');
  let upstreamRepo: string | null = null;
  if (options.upstreamDir) {
    upstreamRepo = resolveUpstreamRepo(options.cwd, options.upstreamDir);
    assertCompleteSnapshot(upstreamRepo);
  } else if (existsSync(cache)) {
    upstreamRepo = cache;
    assertCompleteSnapshot(cache);
  }
  let verifiedFiles = 0;
  const skippedTreeCheck = upstreamRepo === null;

  if (upstreamRepo) {
    const base = resolveCommit(upstreamRepo, inputs.baseline.baselineCommit);
    if (base !== inputs.baseline.baselineCommit) fail('baseline commit does not resolve');
    const packageInfo = readUpstreamPackage(upstreamRepo, base);
    if (packageInfo.astroMajor !== inputs.baseline.astroMajor) {
      fail('baseline snapshot Astro major does not match metadata');
    }
    if (packageInfo.processor !== inputs.baseline.processor) {
      fail('baseline snapshot processor does not match metadata');
    }
    for (const [path, expected] of Object.entries(inputs.baseline.files)) {
      const content = gitShow(upstreamRepo, base, path);
      if (!content) fail(`baseline file is missing from snapshot: ${path}`);
      if (sha256(content) !== expected) fail(`baseline hash mismatch: ${path}`);
      verifiedFiles += 1;
    }
  }

  if (!options.quiet) {
    console.log('Upstream metadata verify');
    console.log(`  baseline:  ${inputs.baseline.baselineCommit}`);
    console.log(`  astro:     ${inputs.baseline.astroMajor} / ${inputs.baseline.processor}`);
    console.log(`  files:     ${Object.keys(inputs.baseline.files).length}`);
    console.log(`  decisions: ${Object.keys(inputs.overrides.decisions).length}`);
    console.log(
      skippedTreeCheck
        ? '  snapshot:  not available; metadata/current-decision checks only'
        : `  snapshot:  ${verifiedFiles} file hashes verified`,
    );
    console.log('  OK');
  }
  return { verifiedFiles, skippedTreeCheck };
}

function parseArgs(args: string[]): { command: string; values: Map<string, string[]> } {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    return { command: 'help', values: new Map() };
  }
  const booleanFlags = new Set(['--write', '--json']);
  const values = new Map<string, string[]>();
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith('--')) fail(`unexpected argument: ${arg}`);
    if (booleanFlags.has(arg)) {
      values.set(arg, ['true']);
      continue;
    }
    const value = rest[++i];
    if (value === undefined) fail(`missing value for ${arg}`);
    const existing = values.get(arg) ?? [];
    existing.push(value);
    values.set(arg, existing);
  }
  return { command, values };
}

function one(values: Map<string, string[]>, key: string): string | undefined {
  const list = values.get(key);
  if (!list) return undefined;
  if (list.length > 1) fail(`${key} may only be used once`);
  return list[0];
}

function many(values: Map<string, string[]>, key: string): string[] {
  return values.get(key) ?? [];
}

function parseDeclineValues(values: string[]): Map<string, string> {
  const declines = new Map<string, string>();
  for (const value of values) {
    const equals = value.indexOf('=');
    if (equals <= 0) fail('--decline must be path=reason');
    const path = value.slice(0, equals);
    const reason = value.slice(equals + 1);
    if (declines.has(path)) fail(`duplicate --decline for ${path}`);
    declines.set(path, reason);
  }
  return declines;
}

function help(): void {
  console.log(`Usage: bun scripts/upstream-sync.ts <command> [options]

Commands:
  check   Compare recorded baseline with an upstream ref; writes only .cache/upstream.
          --ref <ref|sha>          upstream ref (default: main)
          --upstream-dir <path>    use an existing local repo instead of fetching
          --json                   print the plan JSON to stdout
  apply   Validate a plan and show/write local changes (dry-run by default).
          --plan <path>            plan.json produced by check (required)
          --upstream-dir <path>    complete snapshot used to verify target (or cache)
          --write                  explicitly write site files
  record  Advance the recorded baseline after reconciliation.
          --plan <path>            plan.json produced by check (required)
          --decline <path=reason>  retain a local divergence (repeatable)
          --upstream-dir <path>    snapshot used for target hashes (or keep cache)
  verify  Validate metadata/hashes offline when a snapshot is available.
          --upstream-dir <path>    optional snapshot for hash verification

Examples:
  bun scripts/upstream-sync.ts check
  bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json
  bun scripts/upstream-sync.ts apply --plan .cache/upstream/plans/<sha>/plan.json --write
  bun scripts/upstream-sync.ts record --plan .cache/upstream/plans/<sha>/plan.json
  bun scripts/upstream-sync.ts verify

No command merges Git histories, commits, pushes, deploys, or executes upstream code.`);
}

async function main(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const cwd = process.cwd();
  switch (parsed.command) {
    case 'help':
      help();
      return;
    case 'check': {
      const json = parsed.values.has('--json');
      const result = await runCheck({
        cwd,
        ref: one(parsed.values, '--ref'),
        upstreamDir: one(parsed.values, '--upstream-dir'),
        cacheDir: one(parsed.values, '--cache-dir'),
        quiet: json,
      });
      if (json) console.log(JSON.stringify(result.plan, null, 2));
      return;
    }
    case 'apply': {
      const planPath = one(parsed.values, '--plan');
      if (!planPath) fail('apply requires --plan <path>');
      await runApply({
        cwd,
        planPath,
        upstreamDir: one(parsed.values, '--upstream-dir'),
        write: parsed.values.has('--write'),
      });
      return;
    }
    case 'record': {
      const planPath = one(parsed.values, '--plan');
      if (!planPath) fail('record requires --plan <path>');
      await runRecord({
        cwd,
        planPath,
        declines: parseDeclineValues(many(parsed.values, '--decline')),
        upstreamDir: one(parsed.values, '--upstream-dir'),
      });
      return;
    }
    case 'verify':
      await runVerify({ cwd, upstreamDir: one(parsed.values, '--upstream-dir') });
      return;
    default:
      fail(`unknown command: ${parsed.command}`);
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(`upstream-sync: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

/** Exported for the initial metadata build and focused tests. */
export function trackedFilesForCommit(
  upstreamRepo: string,
  commit: string,
  manifest: ThemeManifest,
): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [path, entry] of listTree(upstreamRepo, commit)) {
    const scope = scopeOf(path, manifest);
    if (scope !== 'theme' && scope !== 'manual') continue;
    if (entry.mode !== '100644') continue;
    const content = gitShow(upstreamRepo, commit, path);
    if (!content) continue;
    files[path] = sha256(content);
  }
  return files;
}

export { isSafeRepoPath, parseAstroMajor };
