// The frame audit: a port of KnowScroll/cutroom-test-skill scripts/frame_audit.py (v1.7) with its
// constants and sampling, minus its per-style exceptions. Heights (y) are in the 1080x1920 frame.
// Pixel and cell indexes below are bounded by the frame size by construction; their `?? 0` only
// satisfies noUncheckedIndexedAccess.
import { spawn } from 'node:child_process';
import type { Gate } from '../record.ts';
import { sectionsOf } from '../templates.ts';

// The caption band the picture is judged without, y from its top edge to its bottom edge.
export type CaptionBand = { top: number; bottom: number };

// Where the engine draws the narrator's captions for a template's `captions:` check
// (engine/stage_asset.html, caption() and the *Caption() functions, up to 4 wrapped lines with their
// outline and entry motion). A missing or unknown value draws the default panel centred at y 1600,
// so no template is caption-less. `select` captions sit at the top (y 300-430, stage_asset.html's
// own picture-band rule); the ported strips then put them in the top strip (0-560) and start the
// bottom strip at 430.
const CAPTION_BANDS: ReadonlyMap<string, CaptionBand> = new Map([
  ['words', { top: 1490, bottom: 1630 }],
  ['plain', { top: 1480, bottom: 1720 }],
  ['line', { top: 1380, bottom: 1620 }],
  ['phrases', { top: 1450, bottom: 1560 }],
  ['select', { top: 300, bottom: 430 }],
]);
const PANEL_BAND: CaptionBand = { top: 1460, bottom: 1770 };

/** The caption band of a template's `captions:` check value ('' when the template has none), matched as the engine matches it. */
export function captionBand(captions: string): CaptionBand {
  return CAPTION_BANDS.get(captions) ?? PANEL_BAND;
}

type StaticBand = { seconds: number; fromS: number };

// Rounded where frame_audit.py rounds before it judges; the balance and flat shares stay exact, as
// it judges them. Times are seconds from the start.
export type FrameMeasures = {
  samples: number;
  frame0Detail: number;
  blankAt: number[];
  lowerHalfShare: number;
  centreOfMass: number;
  flatShare: number;
  sameViewRuns: [number, number][];
  longestSameViewS: number;
  staticBand: { top: StaticBand; bottom: StaticBand };
  alive: {
    longestGapS: number;
    stillShare: number;
    eventsPer10s: number;
    stillStretches: [number, number][];
  };
};

const W = 270;
const H = 480;
const SAMPLE_S = 1;
const BLOCK = 8;
// An 8x8 block has detail when its std > 6 and is flat colour when its std < 1.5. Compared as
// 64 * sum(x^2) - sum(x)^2 = 4096 * variance, an exact integer, so no rounding decides a block.
const DETAIL_SPREAD = 36 * 4096;
const FLAT_SPREAD = 2.25 * 4096;
const BLANK_DETAIL = 0.02;
const VIEW_CELL = 30;
const BAND_CELL = 10;
const NEW_PICTURE = 9;
const RUN_S = 6;
const TOP_STRIP = { top: 0, bottom: 560 };
const BAND_MIN_DETAIL = 0.06;
const ALIVE = { w: 135, h: 240, fps: 10, move: 25, event: 0.02, still: 0.002, merge: 4 };

// Python's round() where frame_audit.py rounds. toFixed rounds an exact binary tie (0.125) up where
// Python rounds it to even; no threshold sits next to such a tie.
const round = (x: number, digits: number): number => Number(x.toFixed(digits));

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

const rowAt = (y: number, height: number): number => Math.floor((height * y) / 1920);

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
}

function decode(
  video: string,
  args: readonly string[],
  frameBytes: number,
  onFrame: (frame: Buffer) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, ...args, '-'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let frame = Buffer.alloc(frameBytes);
    let filled = 0;
    let stderr = '';
    ff.stdout.on('data', (chunk: Buffer) => {
      let at = 0;
      while (at < chunk.length) {
        const n = chunk.copy(frame, filled, at, Math.min(chunk.length, at + frameBytes - filled));
        filled += n;
        at += n;
        if (filled === frameBytes) {
          onFrame(frame);
          frame = Buffer.alloc(frameBytes);
          filled = 0;
        }
      }
    });
    ff.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${String(code)} on ${video}: ${stderr.trim()}`));
    });
  });
}

// 4096 * variance of each 8x8 block in rows y0..y1 of a grey frame, row by row.
function blockSpreads(f: Uint8Array, y0: number, y1: number): number[] {
  const out: number[] = [];
  const cols = Math.floor(W / BLOCK);
  for (let by = 0; by < Math.floor((y1 - y0) / BLOCK); by++) {
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0;
      let sumSq = 0;
      for (let y = y0 + by * BLOCK; y < y0 + (by + 1) * BLOCK; y++) {
        for (let x = bx * BLOCK; x < (bx + 1) * BLOCK; x++) {
          const v = f[y * W + x] ?? 0;
          sum += v;
          sumSq += v * v;
        }
      }
      out.push(64 * sumSq - sum * sum);
    }
  }
  return out;
}

function detail(f: Uint8Array, y0 = 0, y1 = H): number {
  const s = blockSpreads(f, y0, y1);
  return s.filter((v) => v > DETAIL_SPREAD).length / s.length;
}

// Means of cell x cell squares over the given frame rows (cropped to whole cells).
function cellMeans(f: Uint8Array, rows: readonly number[], cell: number): number[] {
  const out: number[] = [];
  for (let cy = 0; cy < Math.floor(rows.length / cell); cy++) {
    for (let cx = 0; cx < Math.floor(W / cell); cx++) {
      let sum = 0;
      for (let r = cy * cell; r < (cy + 1) * cell; r++) {
        const row = (rows[r] ?? 0) * W;
        for (let x = cx * cell; x < (cx + 1) * cell; x++) sum += f[row + x] ?? 0;
      }
      out.push(sum / (cell * cell));
    }
  }
  return out;
}

function meanAbsDiff(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  a.forEach((v, i) => {
    sum += Math.abs(v - (b[i] ?? 0));
  });
  return sum / a.length;
}

// Sample runs [start, end) whose cells stay within NEW_PICTURE of the run's first sample.
function runs(cells: readonly (readonly number[])[]): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  cells.forEach((c, i) => {
    const first = cells[start];
    if (i > 0 && first && meanAbsDiff(c, first) > NEW_PICTURE) {
      out.push([start, i]);
      start = i;
    }
  });
  if (cells.length > 0) out.push([start, cells.length]);
  return out;
}

// The longest run in which strip y0..y1 keeps the same picture with something drawn in it.
function staticBand(frames: readonly Uint8Array[], y0: number, y1: number): StaticBand {
  const a = rowAt(y0, H);
  const b = rowAt(y1, H);
  const rows = range(a, b);
  const cells = frames.map((f) => cellMeans(f, rows, BAND_CELL));
  const details = frames.map((f) => detail(f, a, b));
  let best: StaticBand = { seconds: 0, fromS: 0 };
  for (const [start, end] of runs(cells)) {
    const seconds = (end - start) * SAMPLE_S;
    if (seconds > best.seconds && median(details.slice(start, end)) >= BAND_MIN_DETAIL) {
      best = { seconds: round(seconds, 1), fromS: round(start * SAMPLE_S, 1) };
    }
  }
  return best;
}

async function alive(video: string, band: CaptionBand): Promise<FrameMeasures['alive']> {
  const { w, h, fps } = ALIVE;
  const a = rowAt(band.top, h);
  const b = rowAt(band.bottom, h);
  const rows = [...range(0, a), ...range(b, h)];
  const changed: number[] = [];
  let prev: Buffer | undefined;
  let frames = 0;
  await decode(
    video,
    [
      '-vf',
      `fps=${String(fps)},scale=${String(w)}:${String(h)}`,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
    ],
    w * h * 3,
    (frame) => {
      if (prev) {
        let n = 0;
        for (const y of rows) {
          for (let i = y * w * 3; i < (y + 1) * w * 3; i += 3) {
            const d = Math.max(
              Math.abs((frame[i] ?? 0) - (prev[i] ?? 0)),
              Math.abs((frame[i + 1] ?? 0) - (prev[i + 1] ?? 0)),
              Math.abs((frame[i + 2] ?? 0) - (prev[i + 2] ?? 0)),
            );
            if (d > ALIVE.move) n++;
          }
        }
        changed.push(n / (rows.length * w));
      }
      prev = frame;
      frames++;
    },
  );
  if (changed.length === 0) throw new Error(`fewer than 2 frames decoded from ${video}`);
  const events: number[] = [];
  for (let i = 1; i < changed.length - 1; i++) {
    const c = changed[i] ?? 0;
    const last = events.at(-1);
    if (
      c >= ALIVE.event &&
      c >= (changed[i - 1] ?? 0) &&
      c >= (changed[i + 1] ?? 0) &&
      (last === undefined || i - last > ALIVE.merge)
    ) {
      events.push(i);
    }
  }
  const edges = [0, ...events, frames];
  const spans = edges.slice(1).map((end, k): [number, number] => [edges[k] ?? 0, end]);
  return {
    longestGapS: round(Math.max(...spans.map(([s, e]) => (e - s) / fps)), 1),
    stillShare: round(changed.filter((c) => c < ALIVE.still).length / changed.length, 2),
    eventsPer10s: round((events.length / (frames / fps)) * 10, 1),
    stillStretches: spans.filter(([s, e]) => (e - s) / fps > 3).map(([s, e]) => [s / fps, e / fps]),
  };
}

export async function measureFrames(video: string, band: CaptionBand): Promise<FrameMeasures> {
  if (!(band.top >= 0 && band.top <= band.bottom && band.bottom <= 1920)) {
    throw new RangeError(
      `caption band ${String(band.top)}-${String(band.bottom)} is not in 0-1920`,
    );
  }
  const frames: Buffer[] = [];
  let first: Buffer | undefined;
  const gray = ['-f', 'rawvideo', '-pix_fmt', 'gray'];
  // allSettled: an error is thrown only once no ffmpeg of this audit is still running.
  const [grey, firstFrame, live] = await Promise.allSettled([
    decode(
      video,
      ['-vf', `fps=1/${String(SAMPLE_S)},scale=${String(W)}:${String(H)}`, ...gray],
      W * H,
      (f) => {
        frames.push(f);
      },
    ),
    decode(
      video,
      [
        '-vf',
        `select=eq(n\\,0),scale=${String(W)}:${String(H)}`,
        '-fps_mode',
        'passthrough',
        '-frames:v',
        '1',
        ...gray,
      ],
      W * H,
      (f) => {
        first = f;
      },
    ),
    alive(video, band),
  ]);
  if (grey.status === 'rejected') throw grey.reason;
  if (firstFrame.status === 'rejected') throw firstFrame.reason;
  if (live.status === 'rejected') throw live.reason;
  if (frames.length === 0 || !first) throw new Error(`no frames decoded from ${video}`);

  const artRows = [...range(0, rowAt(band.top, H)), ...range(rowAt(band.bottom, H), H)];
  const sameViewRuns = runs(frames.map((f) => cellMeans(f, artRows, VIEW_CELL)))
    .filter(([start, end]) => (end - start) * SAMPLE_S >= RUN_S)
    .map(([start, end]): [number, number] => [start * SAMPLE_S, end * SAMPLE_S]);

  const blockRows = H / BLOCK;
  const cut0 = Math.floor((blockRows * band.top) / 1920);
  const cut1 = Math.ceil((blockRows * band.bottom) / 1920);
  const cols = Math.floor(W / BLOCK);
  const low: number[] = [];
  const centre: number[] = [];
  const flat: number[] = [];
  const blankAt: number[] = [];
  frames.forEach((f, i) => {
    const spreads = blockSpreads(f, 0, H);
    let picture = 0;
    let lower = 0;
    let mass = 0;
    let detailed = 0;
    spreads.forEach((s, k) => {
      if (s <= DETAIL_SPREAD) return;
      detailed++;
      const row = Math.floor(k / cols);
      if (row >= cut0 && row < cut1) return; // captions are not the picture
      picture++;
      if (row >= Math.floor(blockRows / 2)) lower++;
      mass += (row + 0.5) / blockRows;
    });
    low.push(lower / (picture + 1e-9));
    centre.push(mass / (picture + 1e-9));
    flat.push(spreads.filter((s) => s < FLAT_SPREAD).length / spreads.length);
    if (detailed / spreads.length < BLANK_DETAIL) blankAt.push(i * SAMPLE_S);
  });

  return {
    samples: frames.length,
    frame0Detail: round(detail(first), 3),
    blankAt,
    lowerHalfShare: median(low),
    centreOfMass: median(centre),
    flatShare: median(flat),
    sameViewRuns,
    longestSameViewS: round(Math.max(0, ...sameViewRuns.map(([s, e]) => e - s)), 1),
    staticBand: {
      top: staticBand(frames, TOP_STRIP.top, TOP_STRIP.bottom),
      bottom: staticBand(frames, band.bottom, 1920),
    },
    alive: live.value,
  };
}

export const FRAME_GATES = [
  'same_view',
  'frame0',
  'blank',
  'balance',
  'flat',
  'static_band',
  'alive',
] as const;
export type FrameGateName = (typeof FRAME_GATES)[number];

/** A developer's `gate <name>: off | info | <threshold>` line (design 6.3). */
export type GateSetting =
  { mode: 'off' } | { mode: 'info' } | { mode: 'block'; limits: readonly number[] };
/** A frame gate without a setting is block at cutroom's threshold. */
export type GateSettings = Partial<Record<FrameGateName, GateSetting>>;

// Cutroom's thresholds (frame_audit.py v1.7), in the order each gate's threshold shows them. A
// threshold line gives the same numbers in the same order: `gate alive: gap <= 5 s, still <= 0.4`.
const LIMITS: Record<FrameGateName, readonly number[]> = {
  same_view: [14],
  frame0: [0.05],
  blank: [0],
  balance: [0.33, 0.42, 0.62],
  flat: [0.6],
  static_band: [14],
  alive: [3, 0.2],
};

const isFrameGate = (name: string): name is FrameGateName =>
  (FRAME_GATES as readonly string[]).includes(name);

// 0.6 shows as 0.60, as frame_audit.py prints it; a finer limit shows in full.
const two = (x: number): string => (Number(x.toFixed(2)) === x ? x.toFixed(2) : String(x));

function threshold(name: FrameGateName, l: readonly number[]): string {
  const [a = NaN, b = NaN, c = NaN] = l;
  switch (name) {
    case 'same_view':
    case 'static_band':
      return `<= ${String(a)} s`;
    case 'frame0':
      return `>= ${String(a)}`;
    case 'blank':
      return a === 0 ? 'none' : `<= ${String(a)}`;
    case 'balance':
      return `lower half >= ${String(a)}, centre ${String(b)}-${String(c)}`;
    case 'flat':
      return `<= ${two(a)}`;
    case 'alive':
      return `gap <= ${String(a)} s, still <= ${two(b)}`;
  }
}

// Balance and flat are judged exact and shown at 2 decimals, as frame_audit.py does.
function judge(name: FrameGateName, m: FrameMeasures, l: readonly number[]): Omit<Gate, 'mode'> {
  const [a = NaN, b = NaN, c = NaN] = l;
  const t = threshold(name, l);
  switch (name) {
    case 'same_view':
      return { name, value: m.longestSameViewS, threshold: t, pass: m.longestSameViewS <= a };
    case 'frame0':
      return { name, value: m.frame0Detail, threshold: t, pass: m.frame0Detail >= a };
    case 'blank':
      return { name, value: m.blankAt.length, threshold: t, pass: m.blankAt.length <= a };
    case 'balance':
      return {
        name,
        value: { lower_half: round(m.lowerHalfShare, 2), centre: round(m.centreOfMass, 2) },
        threshold: t,
        pass: m.lowerHalfShare >= a && m.centreOfMass >= b && m.centreOfMass <= c,
      };
    case 'flat':
      return { name, value: round(m.flatShare, 2), threshold: t, pass: m.flatShare <= a };
    case 'static_band': {
      const band = Math.max(m.staticBand.top.seconds, m.staticBand.bottom.seconds);
      return { name, value: band, threshold: t, pass: band <= a };
    }
    case 'alive':
      return {
        name,
        value: { gap_s: m.alive.longestGapS, still: m.alive.stillShare },
        threshold: t,
        pass: m.alive.longestGapS <= a && m.alive.stillShare <= b,
      };
  }
}

const GATE_LINE = /^\s*-?\s*gate\s+(\S+?)\s*:\s*(.*?)\s*$/i;

/**
 * The `gate <name>: off | info | <threshold>` lines of a template's `## checks` text. A threshold is
 * the gate's numbers in the order of its threshold (block). A malformed line, a gate that is not a
 * frame gate, or a second line for one gate is an error: a developer's line is never dropped.
 */
export function gateSettings(checks: string): GateSettings {
  const out: GateSettings = {};
  for (const line of checks.split(/\r?\n/)) {
    if (!/^\s*-?\s*gate\s/i.test(line)) continue;
    const m = GATE_LINE.exec(line);
    const bad = (why: string) => new Error(`template check "${line.trim()}": ${why}`);
    if (m === null) throw bad('not "gate <name>: off | info | <threshold>"');
    const name = m[1] ?? '';
    const value = (m[2] ?? '').toLowerCase();
    if (!isFrameGate(name)) throw bad(`no frame gate "${name}" (${FRAME_GATES.join(', ')})`);
    if (out[name] !== undefined) throw bad(`a second line for gate ${name}`);
    if (value === 'off' || value === 'info') {
      out[name] = { mode: value };
      continue;
    }
    const limits = (value.match(/\d*\.?\d+/g) ?? []).map(Number);
    const want = LIMITS[name].length;
    if (limits.length !== want) {
      throw bad(
        `gate ${name} takes off, info or ${String(want)} number(s) in the order of "${threshold(name, LIMITS[name])}"`,
      );
    }
    out[name] = { mode: 'block', limits };
  }
  return out;
}

export interface FrameSetup {
  /** The template's `captions:` check, '' when it has none. */
  captions: string;
  band: CaptionBand;
  settings: GateSettings;
}

// The engine's checks() (asset_reel.mjs): a `key: value` line of `## checks`; the last line of a key wins.
const CHECK_LINE = /^\s*-?\s*([a-z ]+?)\s*:\s*(.+?)\s*$/i;

/** How a template's frame gates run: the caption band of its `captions:` check and its gate lines. */
export function frameSetup(template: string): FrameSetup {
  const checks = sectionsOf(template).get('checks') ?? '';
  let captions = '';
  for (const line of checks.split(/\r?\n/)) {
    const m = CHECK_LINE.exec(line);
    if (m?.[1]?.toLowerCase() === 'captions') captions = m[2] ?? '';
  }
  return { captions, band: captionBand(captions), settings: gateSettings(checks) };
}

/**
 * The seven frame gates (design 6.3): block at cutroom's thresholds, except where a gate line sets the
 * gate off (left out), info, or another threshold.
 */
export function frameGates(m: FrameMeasures, settings: GateSettings = {}): Gate[] {
  return FRAME_GATES.flatMap((name): Gate[] => {
    const s = settings[name] ?? { mode: 'block', limits: LIMITS[name] };
    if (s.mode === 'off') return [];
    return [{ ...judge(name, m, s.mode === 'block' ? s.limits : LIMITS[name]), mode: s.mode }];
  });
}
