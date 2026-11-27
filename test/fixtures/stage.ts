// The engine's stage (engine/stage_asset.html) in headless Chrome, opened the way the engine's validation browser opens it
// (engine/lib.mjs launchStage with the CPU canvas), so tests call the stage's own functions. validateShot runs a shot through
// the stage's validator with a small kit; stage tests add their shot and asset fixtures here.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser, Page } from 'puppeteer-core';
import { z } from 'zod';

declare global {
  interface Window {
    validateShot: (code: string, shot: unknown, tl: unknown, ck: unknown) => unknown;
  }
}

const repo = path.join(import.meta.dirname, '..', '..');

interface EngineStage {
  browser: Browser;
  newPage: () => Promise<Page>;
}
const isEngineLib = (m: unknown): m is { launchStage: (url: string) => Promise<EngineStage> } =>
  typeof m === 'object' && m !== null && 'launchStage' in m && typeof m.launchStage === 'function';

export interface Stage {
  page: Page;
  close: () => Promise<void>;
}

export async function openStage(): Promise<Stage> {
  const lib: unknown = await import(pathToFileURL(path.join(repo, 'engine', 'lib.mjs')).href);
  if (!isEngineLib(lib)) throw new Error('engine/lib.mjs exports no launchStage');
  const url = pathToFileURL(path.join(repo, 'engine', 'stage_asset.html')).href + '?cpu';
  const stage = await lib.launchStage(url);
  return { page: await stage.newPage(), close: () => stage.browser.close() };
}

// A plain kit: a dark gradient with drifting stars, a pill panel, a title, and kurzgesagt's kit.body recipe
// (templates/kurzgesagt.md): the body's disc is the clip and its whole square is filled inside it.
export const KIT = `function makeKit(h) {
  const palette = { bg: '#141a3a', text: '#ffffff', accent: '#ffb000', night: '#0b0f24', ink: '#1a1a2e' };
  const font = (size, weight = 700) => weight + ' ' + size + 'px "Selawik", sans-serif';
  const bg = (ctx, lt) => {
    const g = ctx.createLinearGradient(0, 0, 0, h.H); g.addColorStop(0, '#2c3878'); g.addColorStop(1, '#0b0f24');
    ctx.fillStyle = g; ctx.fillRect(0, 0, h.W, h.H);
    const R = h.rng(5); ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) ctx.fillRect(R() * h.W, (R() * h.H + lt * 90) % h.H, 6, 6);
  };
  const panel = (ctx, x, y, w, hgt) => { h.rr(x, y, w, hgt, 12); ctx.fillStyle = palette.accent; ctx.fill(); };
  const title = (ctx, text, x, y, o = {}) => { ctx.font = font(o.size || 60); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = palette.text; ctx.fillText(text, x, y); };
  const body = (ctx, x, y, r, o = {}) => {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.clip();
    ctx.fillStyle = o.base || palette.accent; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  };
  return { palette, font, bg, panel, title, body };
}`;

// A round body in an 800 x 800 box: kit.body of radius 272 (kurzgesagt's box is 2.94 R wide), so h.asset's scale is R / 272.
export const body = (id: string, colour: string): Asset => ({
  id,
  w: 800,
  h: 800,
  code: `function drawAsset(ctx, p, h, kit) { kit.body(ctx, 0, 0, 272, { base: '${colour}' }); }`,
});

export interface Line {
  who: string;
  text: string;
  start: number;
  end: number;
}
export interface Asset {
  id: string;
  w: number;
  h: number;
  code: string;
}
export interface Shot {
  code: string;
  dur?: number;
  lines?: Line[];
  assets?: Asset[];
  kit?: string;
  ck?: Record<string, unknown>;
}

const Result = z.object({ ok: z.boolean(), errors: z.array(z.string()) });
export type Result = z.infer<typeof Result>;

export async function validateShot(stage: Stage, shot: Shot): Promise<Result> {
  const dur = shot.dur ?? 4;
  const lines = shot.lines ?? [
    { who: 'narrator', text: 'Next to the Sun, the Earth is a speck.', start: 0.3, end: dur - 0.6 },
  ];
  const tl = { kit: shot.kit ?? KIT, assets: shot.assets ?? [], shots: [] };
  const raw: unknown = await stage.page.evaluate(
    (code, sh, t, ck) => window.validateShot(code, sh, t, ck),
    shot.code,
    { dur, lines },
    tl,
    shot.ck ?? {},
  );
  return Result.parse(raw);
}
