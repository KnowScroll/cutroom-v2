import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test, type TestContext } from 'node:test';
import { z } from 'zod';
import { fetchArticles, fetchPassages } from '../engine/reference.mjs';
import { requestOf } from '../engine/writer.mjs';

// The engine's Wikipedia reference on API responses recorded 2026-11-27 (test/fixtures/wikipedia.json). An unrecorded request
// fails, so nothing reaches the network. Briefs and article titles are those of the real runs: q-t1-venus (its log: no article
// "Day on Venus", then "Venus") and the Norway run of docs/reel-quality-findings.md §D ("Dissolution of Norway–Sweden union",
// then "Storting"; the facts step then asked for "Dissolution of the union between Sweden and Norway").

const RECORDED = z
  .record(z.string(), z.unknown())
  .parse(JSON.parse(readFileSync(new URL('./fixtures/wikipedia.json', import.meta.url), 'utf8')));
const API = 'https://en.wikipedia.org/w/api.php?format=json&action=query&';
const Pages = z.object({
  query: z.object({ pages: z.record(z.string(), z.object({ extract: z.string() })) }),
});

const VENUS_BRIEF = `Why a day on Venus is longer than its year

Audience: General-curious viewers who know basic astronomy (planets orbit, spin on axis) but not Venus's numbers.
Goal: The viewer should understand that Venus rotates once every 243 Earth days while its orbit takes only 225 days, so its day is longer than its year, and feel the surprising satisfaction of that fact clicking.
Tone: Wry, calm, lightly amazed`;
const NORWAY_BRIEF = `How did Norway break away from Sweden in 1905 without firing a shot?

Audience: General history viewers who know the basic outline of European nationalism but may not know how Norway peacefully separated from Sweden.
Goal: The viewer should understand that Norwegian constitutional and political action, especially the Storting’s decision to dissolve the union with Sweden, produced independence without armed conflict.
Tone: Wry, clear, lightly dramatic`;
const DISSOLUTION = 'Dissolution of the union between Norway and Sweden';
const SPIN =
  'Therefore, Venusian sidereal day, 243 Earth days, lasts longer than a Venusian year, 224.7 Earth days.';

function wikipedia(t: TestContext, status = 200): { urls: string[]; logs: string[] } {
  const urls: string[] = [];
  const logs: string[] = [];
  t.mock.method(globalThis, 'fetch', (url: string) => {
    urls.push(url);
    if (status !== 200) return Promise.resolve(new Response('Too many requests', { status }));
    if (!(url in RECORDED)) throw new Error(`unrecorded request ${url}`);
    return Promise.resolve(Response.json(RECORDED[url]));
  });
  t.mock.method(console, 'log', (...a: unknown[]) => {
    logs.push(a.map(String).join(' '));
  });
  return { urls, logs };
}
const searchUrl = (q: string) =>
  `${API}list=search&srlimit=1&srprop=&srsearch=${encodeURIComponent(q)}`;

// the article's text as the recorded response gives it
function article(title: string): string {
  const res =
    RECORDED[`${API}prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`];
  const page = Object.values(Pages.parse(res).query.pages)[0];
  assert.ok(page, `no recorded article "${title}"`);
  return page.extract;
}
// the reference's "### " blocks: an article's head, or its passages
const blocks = (ref: string) =>
  ref
    .split(/^(?=### )/m)
    .map((b) => b.trim())
    .filter(Boolean);
// the text of the section a heading path names ("A > B": the lines under heading B, found after heading A, up to the next heading)
function sectionText(text: string, path: string): string {
  const lines = text.split('\n');
  let from = 0;
  for (const name of path ? path.split(' > ') : []) {
    const at = lines.findIndex(
      (l, k) => k >= from && l.replace(/^=+ | =+$/g, '') === name && /^=+ /.test(l),
    );
    assert.ok(at >= 0, `the article has no heading "${name}"`);
    from = at + 1;
  }
  const end = lines.findIndex((l, k) => k >= from && /^=+ .+ =+$/.test(l));
  return lines.slice(from, end < 0 ? undefined : end).join('\n');
}
// every sentence of a passages block sits under the heading of the section it comes from (nothing else is left on its lines)
function assertUnderHeadings(block: string, text: string): void {
  let head = '';
  for (const line of block.split('\n').slice(1)) {
    const m = /^== (.+) ==$/.exec(line);
    if (m?.[1] !== undefined) {
      head = m[1];
      continue;
    }
    const own = sectionText(text, head)
      .split('\n')
      .flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/))
      .map((s) => s.trim())
      .filter((s) => s.length > 25)
      .sort((a, b) => b.length - a.length);
    const rest = own.reduce((l, s) => l.split(s).join(''), line);
    assert.match(rest, /^\s*$/, `not from section "${head}": ${line.slice(0, 120)}`);
  }
}

await test('a title with no page falls back to search, and the main article brings Venus’s 243-day spin under its heading', async (t) => {
  const { urls, logs } = wikipedia(t);
  const ref = await fetchArticles(['Day on Venus', 'Venus'], { request: requestOf(VENUS_BRIEF) });

  assert.ok(urls.includes(searchUrl('Day on Venus')));
  assert.ok(logs.some((l) => l.includes('no article "Day on Venus"; search found "Venus"')));
  const [head = '', more = '', ...rest] = blocks(ref);
  assert.equal(rest.length, 0, 'the second title is the same article, added once');
  assert.ok(head.startsWith('### Venus\n'));
  assert.ok(head.length > 4000 && head.length <= 7000 + '### Venus\n'.length, 'the larger budget');
  // the spin sits past any budget of the article's head, so only the passages can bring it
  assert.ok(article('Venus').indexOf(SPIN) > 7000);
  assert.ok(!head.includes('243 Earth days'));
  // the request's words, not the intake's Goal line (which states the answer) and not the title's own word
  assert.ok(more.startsWith('### Venus (passages about: day, longer, year)\n'));
  const lines = more.split('\n');
  assert.ok(lines[lines.indexOf('== Orbit and rotation ==') + 1]?.includes(SPIN));
  assertUnderHeadings(more, article('Venus'));
});

await test('the first article found gets the larger budget when a title finds nothing', async (t) => {
  const { urls, logs } = wikipedia(t);
  const ref = await fetchArticles(['Qxzvjkwpq', 'Venus'], { request: requestOf(VENUS_BRIEF) });

  assert.ok(urls.includes(searchUrl('Qxzvjkwpq')));
  assert.ok(logs.some((l) => l.endsWith('reference: no article "Qxzvjkwpq"')));
  const [head = ''] = blocks(ref);
  assert.ok(head.startsWith('### Venus\n') && head.length > 4000);
  assert.ok(ref.includes(SPIN));
});

await test('Norway: the dissolution article is found by search and its passages keep their section headings', async (t) => {
  const { urls } = wikipedia(t);
  const ref = await fetchArticles(['Dissolution of Norway–Sweden union', 'Storting'], {
    request: requestOf(NORWAY_BRIEF),
  });

  assert.ok(urls.includes(searchUrl('Dissolution of Norway–Sweden union')));
  const [head = '', more = '', storting = '', ...rest] = blocks(ref);
  assert.equal(rest.length, 0);
  assert.ok(
    head.startsWith(`### ${DISSOLUTION}\n`) && head.length > 4000,
    'the main article, larger budget',
  );
  assert.ok(
    more.startsWith(
      `### ${DISSOLUTION} (passages about: break, away, 1905, without, firing, shot)\n`,
    ),
  );
  assert.ok(more.split('\n')[1]?.startsWith('== '), 'the passages start under a heading');
  assertUnderHeadings(more, article(DISSOLUTION));
  assert.ok(
    storting.startsWith('### Storting\n') && storting.length <= 4000 + '### Storting\n'.length,
  );

  // the facts step's need, with the title it guessed in the real run
  const need = await fetchPassages(
    'Dissolution of the union between Sweden and Norway',
    ['Storting', 'dissolution', 'accepted'],
    {
      have: ref,
    },
  );
  assert.ok(urls.includes(searchUrl('Dissolution of the union between Sweden and Norway')));
  const [block = '', ...others] = blocks(need);
  assert.equal(others.length, 0);
  assert.ok(
    block.startsWith(`### ${DISSOLUTION} (passages about: Storting, dissolution, accepted)\n`),
  );
  assertUnderHeadings(block, article(DISSOLUTION));
  // the 1905 plebiscite under its own heading, not glued to the 1814 background
  const lines = block.split('\n');
  assert.ok(
    lines[lines.indexOf('== Prelude to dissolution > Plebiscite ==') + 1]?.includes(
      '368,208 votes',
    ),
  );
  // nothing the reference already holds is added again
  for (const line of lines.slice(1).filter((l) => !l.startsWith('== ')))
    for (const s of line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/))
      assert.ok(!ref.includes(s), `repeated: ${s}`);
});

await test('a refused request is logged with its status and the reference goes on without it', async (t) => {
  const { logs } = wikipedia(t, 429);
  assert.equal(await fetchArticles(['Mars'], { request: 'How long is a day on Mars' }), '');
  assert.ok(logs.some((l) => l.endsWith('reference: "Mars" skipped (HTTP 429)')));
});
