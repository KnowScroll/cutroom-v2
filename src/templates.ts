import { createHash } from 'node:crypto';
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { Gate, ReviewScores, TemplatePatch } from './record.ts';
import { renameRetry } from './proc.ts';

// design §5: the harness keeps working copies of templates/ (the originals) and may patch them.

export const PATCHABLE_SECTIONS = [
  'story',
  'plan',
  'sound',
  'look',
  'motion',
  'assets',
  'shots',
] as const;
export type PatchableSection = (typeof PATCHABLE_SECTIONS)[number];

export type Checkpoint = 'facts.json' | 'spine.json' | 'plan.json';

// design §5.4, from the guide() calls: facts reads story (writer.mjs:185); spine and script read story, plan,
// sound (writer.mjs:125); the production plan reads plan, sound, look, motion, assets, shots (asset_reel.mjs:351);
// kit, assets, sheet review and shots read look, motion, assets, shots (asset_reel.mjs:593, 603, 633, 674, 775).
export const RERUN_FROM: Record<PatchableSection, Checkpoint> = {
  story: 'facts.json',
  plan: 'spine.json',
  sound: 'spine.json',
  look: 'plan.json',
  motion: 'plan.json',
  assets: 'plan.json',
  shots: 'plan.json',
};

const ManifestEntry = z.object({
  source_sha256: z.string(),
  working_sha256: z.string(),
  patched: z.boolean(),
});
export const Manifest = z.record(z.string(), ManifestEntry);
export type Manifest = z.infer<typeof Manifest>;

export const HistoryEntry = z.object({
  k: z.number().int().positive(),
  kind: z.string(),
  job: z.string(),
  cut: z.number().int().positive(),
  // the fix round that applies the patch (§6.1, D20): round 1 follows cut 1's review and makes cut 2; no round 0
  round: z.number().int().positive(),
  t: z.string(),
  patches: z.array(TemplatePatch),
  rejected: z.array(z.object({ patch: TemplatePatch, reason: z.string() })),
  gates: z.array(Gate),
  scores: ReviewScores,
  sha_before: z.string(),
  sha_after: z.string(),
  next: z
    .object({ cut: z.number().int().positive(), gates: z.array(Gate), scores: ReviewScores })
    .nullable(),
  /** The working copy went back to `<k>.md`: the next cut was not better (design §5.3). */
  reverted: z.boolean().default(false),
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

function hasCode(err: unknown, code: string): boolean {
  return err instanceof Error && 'code' in err && err.code === code;
}

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

async function writeAtomic(path: string, data: string | Buffer): Promise<void> {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, data);
  await renameRetry(tmp, path);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown; // untyped JSON; every caller parses it with zod
}

async function mdFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort();
}

async function shaOfFile(path: string): Promise<string | null> {
  try {
    return sha256(await readFile(path));
  } catch (err) {
    if (hasCode(err, 'ENOENT')) return null;
    throw err;
  }
}

export async function readManifest(workingDir: string): Promise<Manifest> {
  try {
    return Manifest.parse(await readJson(join(workingDir, 'manifest.json')));
  } catch (err) {
    if (hasCode(err, 'ENOENT')) return {};
    throw err;
  }
}

async function writeManifest(workingDir: string, manifest: Manifest): Promise<void> {
  await writeAtomic(join(workingDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

// ---------- sync (D5, D15) ----------

export type SyncAction = 'copied' | 'replaced' | 'matched' | 'conflict' | 'kept';
export interface SyncEvent {
  action: SyncAction;
  file: string;
  detail: string;
}
export interface SyncResult {
  events: SyncEvent[];
  /** One line per conflict, for run.json `sync_conflicts` and the report. */
  conflicts: string[];
}

/**
 * Brings the working copies in line with the originals (`*.md` only, so `.log` files stay behind):
 * a new original is copied; a changed original replaces a copy that was never changed; if both changed,
 * the copy stays and a conflict is returned (and returned again by every sync until a developer deletes
 * the copy or makes the original equal to it); a deleted original leaves its copy in place.
 * Every action is returned and appended to `sync.log`.
 */
export async function syncTemplates(
  originalsDir: string,
  workingDir: string,
  now = new Date(),
): Promise<SyncResult> {
  await mkdir(workingDir, { recursive: true });
  const manifest = await readManifest(workingDir);
  const originals = await mdFiles(originalsDir);
  const events: SyncEvent[] = [];
  for (const file of originals) {
    const data = await readFile(join(originalsDir, file));
    const src = sha256(data);
    const dst = join(workingDir, file);
    const work = await shaOfFile(dst);
    const entry = manifest[file];
    const fresh = { source_sha256: src, working_sha256: src, patched: false };
    if (work === null) {
      await writeAtomic(dst, data);
      manifest[file] = fresh;
      const detail = entry === undefined ? 'new original' : 'working copy was missing';
      events.push({ action: 'copied', file, detail });
    } else if (work === src) {
      const same = entry?.source_sha256 === src && entry.working_sha256 === src && !entry.patched;
      if (!same) {
        manifest[file] = fresh;
        events.push({ action: 'matched', file, detail: 'working copy equals the original' });
      }
    } else if (entry === undefined) {
      // no record of where this copy came from: treated as both changed, so it is never overwritten
      events.push({
        action: 'conflict',
        file,
        detail: 'working copy differs from the original and has no manifest record; copy kept',
      });
    } else if (src === entry.source_sha256) {
      // original unchanged: the copy (patched or not) stays
    } else if (!entry.patched && work === entry.working_sha256) {
      await writeAtomic(dst, data);
      manifest[file] = fresh;
      events.push({ action: 'replaced', file, detail: 'original changed; copy was never patched' });
    } else {
      events.push({
        action: 'conflict',
        file,
        detail: `original changed and the copy was ${entry.patched ? 'patched' : 'edited'}; copy kept`,
      });
    }
  }
  for (const file of await mdFiles(workingDir)) {
    if (!originals.includes(file)) {
      events.push({ action: 'kept', file, detail: 'original deleted; working copy kept' });
    }
  }
  await writeManifest(workingDir, manifest);
  if (events.length > 0) {
    const t = now.toISOString();
    const lines = events.map((e) => `${t} ${e.action} ${e.file}: ${e.detail}\n`).join('');
    await appendFile(join(workingDir, 'sync.log'), lines);
  }
  return {
    events,
    conflicts: events.filter((e) => e.action === 'conflict').map((e) => `${e.file}: ${e.detail}`),
  };
}

// ---------- topic words (§5.3) ----------

// Function words, and the words that frame a request ("make a 45 second reel explaining how X works").
// Everything else of 3 or more letters or digits, or 2 capitals ("AI", "UK"), is a content word.
const STOPWORDS = new Set(
  `the and but for nor yet not all any are was were been being has have had having does did doing done
  can could will would shall should may might must its our ours your yours you his her hers him she they
  them their theirs this that these those there here then than who whom whose what which when where why
  how with without within from into onto upon about above below over under after before between through
  during against among around across along off out very just only also too more most much many some such
  each every both few own same other another again once ever never always because while until via per
  like one two three four five six seven eight nine ten first last next new way ways thing things get
  got let lets make makes made making want wants need needs please use uses using used show shows
  showing tell tells telling explain explains explained explaining explainer work works real true
  reel reels video videos short shorts clip clips story stories second seconds minute minutes vertical
  style styles template templates viewer viewers audience`.split(/\s+/),
);

/** The content words of a text, lower-cased: not stopwords, 3+ letters or digits, or 2 capitals. */
export function contentWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of text.match(/[\p{L}\p{N}]+/gu) ?? []) {
    const w = t.toLowerCase();
    const acronym = t.length === 2 && t === t.toUpperCase() && /\p{Lu}/u.test(t);
    if ((w.length >= 3 || acronym) && !STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

// a word and its singular guesses (-s, -es, -ies -> y), so "volcanoes" meets "volcano", "batteries" "battery"
function stems(word: string): string[] {
  if (word.length <= 3) return [word];
  const out = [word];
  if (word.endsWith('ies')) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith('es')) out.push(word.slice(0, -2));
  if (word.endsWith('s')) out.push(word.slice(0, -1));
  return out;
}

/**
 * The words of `text` that share a stem with a content word of `request` (§5.3: M3 copies examples
 * literally, so no topic word may enter a template). Every word of the text counts, in any case.
 */
export function topicWordsIn(text: string, request: string): string[] {
  const topic = new Set([...contentWords(request)].flatMap(stems));
  const found = new Set<string>();
  for (const t of text.match(/[\p{L}\p{N}]+/gu) ?? []) {
    const w = t.toLowerCase();
    if (stems(w).some((s) => topic.has(s))) found.add(w);
  }
  return [...found];
}

// ---------- patches (§5.3, D16) ----------

// the engine's section heading (asset_reel.mjs parseMd)
const HEADING = /^##\s+(\w+)\s*$/;

/** The engine's parseMd: `## name` starts a section; a repeated name starts it again. */
export function sectionsOf(text: string): Map<string, string> {
  const lines = new Map<string, string[]>();
  let cur: string[] | null = null;
  for (const ln of text.split(/\r?\n/)) {
    const m = HEADING.exec(ln);
    if (m?.[1] !== undefined) {
      cur = [];
      lines.set(m[1].toLowerCase(), cur);
    } else if (cur !== null) cur.push(ln);
  }
  return new Map([...lines].map(([k, v]) => [k, v.join('\n').trim()]));
}

interface Heading {
  name: string;
  line: number;
}

function headings(lines: readonly string[]): Heading[] {
  const out: Heading[] = [];
  lines.forEach((l, line) => {
    const m = HEADING.exec(l);
    if (m?.[1] !== undefined) out.push({ name: m[1].toLowerCase(), line });
  });
  return out;
}

function occurrences(haystack: string, needle: string): number {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) n++;
  return n;
}

function isPatchable(section: string): section is PatchableSection {
  return (PATCHABLE_SECTIONS as readonly string[]).includes(section);
}

type Checked =
  { ok: true; text: string; section: PatchableSection } | { ok: false; reason: string };

function patchText(template: string, patch: TemplatePatch, request: string): Checked {
  const section = patch.section.trim().toLowerCase();
  if (!isPatchable(section)) {
    return {
      ok: false,
      reason: `section "${patch.section}" may not be patched (D16: only ${PATCHABLE_SECTIONS.join(', ')})`,
    };
  }
  const found = topicWordsIn(patch.text, request);
  if (found.length > 0) {
    return {
      ok: false,
      reason: `text holds content words of the request: ${found.map((w) => `"${w}"`).join(', ')}`,
    };
  }
  const eol = template.includes('\r\n') ? '\r\n' : '\n';
  const lines = template.split(/\r?\n/);
  const heads = headings(lines);
  const at = heads.filter((h) => h.name === section);
  const first = at[0];
  if (at.length > 1)
    return { ok: false, reason: `the template has ${String(at.length)} "## ${section}" sections` };
  const start = first === undefined ? -1 : first.line + 1;
  const end = heads.find((h) => h.line >= start)?.line ?? lines.length;
  let out: string[];
  let expected = heads.map((h) => h.name);
  if (patch.op === 'append') {
    const text = patch.text.trim();
    if (text === '') return { ok: false, reason: 'append needs a text' };
    if (/[\r\n]/.test(text))
      return { ok: false, reason: 'append adds one bullet: one line of text' };
    const bullet = /^[-*]\s/.test(text) ? text : `- ${text}`;
    if (first === undefined) {
      const body = [...lines];
      while (body.length > 0 && body[body.length - 1]?.trim() === '') body.pop();
      out = [...body, '', `## ${section}`, bullet, ''];
      expected = [...expected, section];
    } else {
      let last = end - 1;
      while (last >= start && lines[last]?.trim() === '') last--;
      out = [...lines.slice(0, last + 1), bullet, ...lines.slice(last + 1)];
    }
  } else {
    const old = patch.old ?? '';
    if (old === '') return { ok: false, reason: 'replace needs an "old" text' };
    if (first === undefined)
      return { ok: false, reason: `the template has no "## ${section}" section` };
    const body = lines.slice(start, end).join('\n');
    const n = occurrences(body, old);
    if (n !== 1) {
      return {
        ok: false,
        reason: `"old" occurs ${String(n)} times in "## ${section}"; it must occur exactly once`,
      };
    }
    const next = body.replace(old, () => patch.text);
    out = [...lines.slice(0, start), ...next.split(/\r?\n/), ...lines.slice(end)];
  }
  // a patch may only change text inside its section: a heading in the text would add, move or override a section
  if (
    headings(out)
      .map((h) => h.name)
      .join(',') !== expected.join(',')
  ) {
    return { ok: false, reason: 'text would change the sections of the template' };
  }
  return { ok: true, text: out.join(eol), section };
}

export interface PatchContext {
  job: string;
  cut: number;
  round: number;
  request: string;
  gates: readonly Gate[];
  scores: ReviewScores;
  now?: Date;
}
export interface RejectedPatch {
  patch: TemplatePatch;
  reason: string;
}
export interface PatchResult {
  /** The history entry (`history/<kind>/<k>.md` and `.json`), or null when nothing was applied. */
  k: number | null;
  applied: TemplatePatch[];
  rejected: RejectedPatch[];
  /** The sections that changed, for invalidateCheckpoints. */
  sections: PatchableSection[];
}

function checkKind(kind: string): void {
  if (kind.startsWith('_')) throw new Error(`${kind}.md is never patched (D16)`);
  if (!/^[\w-]+$/.test(kind)) throw new Error(`"${kind}" is not a template name`);
}

function historyDir(workingDir: string, kind: string): string {
  checkKind(kind);
  return join(workingDir, 'history', kind);
}

// counts both files, so a snapshot left without its entry (a crash between the writes) is never reused
async function nextK(dir: string): Promise<number> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (err) {
    if (hasCode(err, 'ENOENT')) return 1;
    throw err;
  }
  const ks = names
    .map((f) => /^(\d+)\.(md|json)$/.exec(f)?.[1])
    .filter((k) => k !== undefined)
    .map(Number);
  return Math.max(0, ...ks) + 1;
}

/**
 * Checks each patch of one review against the working copy of `kind` (D16 sections, `old` exactly once,
 * no content word of the request) and applies the ones that pass, in order. Before the copy changes, the
 * old text is saved to `history/<kind>/<k>.md` and the entry to `<k>.json`; the manifest marks the copy patched.
 */
export async function applyPatches(
  workingDir: string,
  kind: string,
  patches: readonly TemplatePatch[],
  ctx: PatchContext,
): Promise<PatchResult> {
  checkKind(kind);
  const file = join(workingDir, `${kind}.md`);
  const before = await readFile(file, 'utf8');
  const entry = (await readManifest(workingDir))[`${kind}.md`];
  if (entry === undefined) throw new Error(`${kind}.md has no manifest record: sync first`);

  let text = before;
  const applied: TemplatePatch[] = [];
  const rejected: RejectedPatch[] = [];
  const sections: PatchableSection[] = [];
  for (const patch of patches) {
    const r = patchText(text, patch, ctx.request);
    if (!r.ok) {
      rejected.push({ patch, reason: r.reason });
      continue;
    }
    text = r.text;
    applied.push(patch);
    if (!sections.includes(r.section)) sections.push(r.section);
  }
  if (applied.length === 0) return { k: null, applied, rejected, sections };

  const dir = historyDir(workingDir, kind);
  const k = await nextK(dir);
  // checked before the first write, so a bad entry (say round 0) leaves no history and no change
  const record = HistoryEntry.parse({
    k,
    kind,
    job: ctx.job,
    cut: ctx.cut,
    round: ctx.round,
    t: (ctx.now ?? new Date()).toISOString(),
    patches: applied,
    rejected,
    gates: [...ctx.gates],
    scores: ctx.scores,
    sha_before: sha256(before),
    sha_after: sha256(text),
    next: null,
    reverted: false,
  } satisfies HistoryEntry);
  await mkdir(dir, { recursive: true });
  // 'wx': the history is the trail (D19), never overwritten
  await writeFile(join(dir, `${String(k)}.md`), before, { flag: 'wx' });
  await writeFile(join(dir, `${String(k)}.json`), `${JSON.stringify(record, null, 2)}\n`, {
    flag: 'wx',
  });
  await writeAtomic(file, text);
  const manifest = await readManifest(workingDir);
  manifest[`${kind}.md`] = {
    source_sha256: entry.source_sha256,
    working_sha256: record.sha_after,
    patched: true,
  };
  await writeManifest(workingDir, manifest);
  return { k, applied, rejected, sections };
}

/**
 * The history entry `job` already wrote for `round` (the latest, when a torn one was followed by a retry): a restart after
 * the patch was applied (§8). The patch is never applied twice, even when later jobs have changed the working copy
 * since. Torn case: the entry was written but the copy still has its sha_before, so null and the round applies again.
 */
export async function findAppliedPatch(
  workingDir: string,
  kind: string,
  job: string,
  round: number,
): Promise<HistoryEntry | null> {
  const dir = historyDir(workingDir, kind);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (err) {
    if (hasCode(err, 'ENOENT')) return null;
    throw err;
  }
  const now = await shaOfFile(join(workingDir, `${kind}.md`));
  const mine: HistoryEntry[] = [];
  for (const name of names.filter((f) => f.endsWith('.json'))) {
    const entry = HistoryEntry.parse(await readJson(join(dir, name)));
    if (entry.job === job && entry.round === round) mine.push(entry);
  }
  const latest = mine.sort((a, b) => b.k - a.k)[0];
  return latest === undefined || latest.sha_before === now ? null : latest;
}

/** Adds the gates and scores of the cut made after patch entry `k` (when that cut is reviewed). */
export async function recordNextCut(
  workingDir: string,
  kind: string,
  k: number,
  next: { cut: number; gates: readonly Gate[]; scores: ReviewScores },
): Promise<HistoryEntry> {
  const path = join(historyDir(workingDir, kind), `${String(k)}.json`);
  const entry = HistoryEntry.parse(await readJson(path));
  const updated: HistoryEntry = {
    ...entry,
    next: { cut: next.cut, gates: [...next.gates], scores: next.scores },
  };
  await writeAtomic(path, `${JSON.stringify(HistoryEntry.parse(updated), null, 2)}\n`);
  return updated;
}

/**
 * Puts the working copy back to the text before patch entry `k` (design §5.3: a patch stays only if the next cut is
 * better) and marks the entry reverted. Only while the copy still holds that patch's result: a copy changed since (a
 * later patch) is left alone. Returns what happened; a repeat after a resume finds the entry already reverted.
 */
export async function revertPatch(
  workingDir: string,
  kind: string,
  k: number,
): Promise<'reverted' | 'already' | 'changed'> {
  const dir = historyDir(workingDir, kind);
  const path = join(dir, `${String(k)}.json`);
  const entry = HistoryEntry.parse(await readJson(path));
  if (entry.reverted) return 'already';
  const file = join(workingDir, `${kind}.md`);
  const now = await shaOfFile(file);
  // sha_before: a revert that stopped before its entry was marked
  if (now !== entry.sha_after && now !== entry.sha_before) return 'changed';
  if (now === entry.sha_after) {
    const before = await readFile(join(dir, `${String(k)}.md`));
    if (sha256(before) !== entry.sha_before) {
      throw new Error(`${kind} history ${String(k)}.md does not match its sha_before`);
    }
    await writeAtomic(file, before);
  }
  const manifest = await readManifest(workingDir);
  const record = manifest[`${kind}.md`];
  if (record === undefined) throw new Error(`${kind}.md has no manifest record`);
  manifest[`${kind}.md`] = {
    source_sha256: record.source_sha256,
    working_sha256: entry.sha_before,
    // back to the original's text: sync may replace it again when the original changes (D15)
    patched: entry.sha_before !== record.source_sha256,
  };
  await writeManifest(workingDir, manifest);
  await writeAtomic(path, `${JSON.stringify({ ...entry, reverted: true }, null, 2)}\n`);
  return 'reverted';
}

// ---------- checkpoint invalidation (§5.4) ----------

// The engine's work-folder files in the order its steps write them (engine/asset_reel.mjs main(), writer.mjs
// writeStory()), grouped by the checkpoint a rerun starts from. reference.txt (made from the brief) and calls.json
// (the live cost log, never read back) belong to no group and are never deleted.
const CHAIN: readonly { from: Checkpoint; match: (name: string) => boolean }[] = [
  { from: 'facts.json', match: (n) => n === 'facts.json' },
  {
    // music.json holds the track picked for the script's music field and is reused while it exists
    // (audio.mjs pickMusic), so it goes with the script, not with the plan
    from: 'spine.json',
    match: (n) =>
      [
        'spine.json',
        'script.json',
        'script.md',
        'music.json',
        'music_lyria.mp3',
        'music_synth.wav',
      ].includes(n),
  },
  {
    from: 'plan.json',
    match: (n) =>
      ['plan.json', 'poses.json', 'photos.json', 'photos', 'kit.js'].includes(n) ||
      /^(asset_.+|sheet.*\.jpg|sheet-review.*\.json|shot_\d+\.js|rejected_.*\.js)$/.test(n),
  },
];

/**
 * Deletes the checkpoints from the earliest step that reads any of `sections`, and every later one, so the
 * engine rebuilds them on resume. Returns where the rerun starts and the names deleted.
 */
export async function invalidateCheckpoints(
  workDir: string,
  sections: readonly PatchableSection[],
): Promise<{ from: Checkpoint; deleted: string[] }> {
  const starts = sections.map((s) => CHAIN.findIndex((c) => c.from === RERUN_FROM[s]));
  if (starts.length === 0) throw new Error('invalidateCheckpoints needs at least one section');
  const first = Math.min(...starts);
  const groups = CHAIN.slice(first);
  const from = groups[0]?.from;
  if (from === undefined) throw new Error(`no checkpoint group for ${sections.join(', ')}`);
  const deleted: string[] = [];
  for (const name of (await readdir(workDir)).sort()) {
    if (!groups.some((g) => g.match(name))) continue;
    await rm(join(workDir, name), { recursive: true });
    deleted.push(name);
  }
  return { from, deleted };
}
