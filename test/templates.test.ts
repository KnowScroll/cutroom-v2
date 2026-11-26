import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { RunRecord, type Gate, type ReviewScores, type TemplatePatch } from '../src/record.ts';
import {
  applyPatches,
  contentWords,
  HistoryEntry,
  invalidateCheckpoints,
  readManifest,
  recordNextCut,
  syncTemplates,
  topicWordsIn,
  type PatchableSection,
} from '../src/templates.ts';

async function withDirs(fn: (originals: string, working: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'cutroom-templates-'));
  try {
    const originals = join(root, 'templates');
    await mkdir(originals);
    await fn(originals, join(root, 'var', 'templates'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const read = (p: string) => readFile(p, 'utf8');

const BASE = '# _base\n\n## story\n- One question, one answer.\n';
const ALPHA = [
  '# alpha',
  '',
  '## about',
  'Explains one machine.',
  '',
  '## story',
  '- Open with the strangest true fact.',
  '- End on the answer.',
  '',
  '## look',
  '- Dark navy background with a soft glow.',
  '- Labels 40 to 56 px.',
  '',
  '## checks',
  '- captions: bottom',
  '',
  '## director',
  '- Judge the hook first.',
  '',
].join('\n');
const BETA = '# beta\n\n## about\nA comic.\n\n## shots\n- One panel per shot.\n';

async function writeOriginals(dir: string): Promise<void> {
  await writeFile(join(dir, '_base.md'), BASE);
  await writeFile(join(dir, 'alpha.md'), ALPHA);
  await writeFile(join(dir, 'alpha.log'), 'epoch 1: made\n');
  await writeFile(join(dir, 'beta.md'), BETA);
}

const scores: ReviewScores = { hook: 3, clarity: 4, visual: 2, pacing: 3, audio: 4, fit: 3 };
const gates: Gate[] = [
  { name: 'format', value: '1080x1920', threshold: '1080x1920', pass: true, mode: 'block' },
];
const REQUEST = 'Make a 45 second reel explaining how a jet engine works';
const ctx = { job: '20261127-102030-jet', cut: 1, round: 1, request: REQUEST, gates, scores };

function patch(
  p: Partial<TemplatePatch> & Pick<TemplatePatch, 'section' | 'op' | 'text'>,
): TemplatePatch {
  return { reason: 'the hook gave the answer away', ...p };
}

await test('first sync copies every .md original, including _base.md, and no .log file', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    const r = await syncTemplates(originals, working, new Date('2026-11-27T10:00:00Z'));
    assert.deepEqual(
      r.events.map((e) => [e.action, e.file]),
      [
        ['copied', '_base.md'],
        ['copied', 'alpha.md'],
        ['copied', 'beta.md'],
      ],
    );
    assert.deepEqual(r.conflicts, []);
    assert.deepEqual((await readdir(working)).sort(), [
      '_base.md',
      'alpha.md',
      'beta.md',
      'manifest.json',
      'sync.log',
    ]);
    assert.equal(await read(join(working, 'alpha.md')), ALPHA);
    const m = await readManifest(working);
    assert.deepEqual(m['alpha.md'], {
      source_sha256: sha(ALPHA),
      working_sha256: sha(ALPHA),
      patched: false,
    });
    assert.equal(Object.keys(m).length, 3);
    const log = await read(join(working, 'sync.log'));
    assert.match(log, /^2026-11-27T10:00:00\.000Z copied _base\.md: new original$/m);
    assert.equal(log.trim().split('\n').length, 3);

    const again = await syncTemplates(originals, working);
    assert.deepEqual(again.events, [], 'nothing changed, nothing to do');
  });
});

await test('a new original is copied and the other copies are left alone', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    await writeFile(join(originals, 'gamma.md'), '# gamma\n\n## look\n- Pixels.\n');
    const r = await syncTemplates(originals, working);
    assert.deepEqual(r.events, [{ action: 'copied', file: 'gamma.md', detail: 'new original' }]);
    assert.equal(await read(join(working, 'gamma.md')), '# gamma\n\n## look\n- Pixels.\n');
    assert.match(await read(join(working, 'sync.log')), /copied gamma\.md: new original\n$/);
  });
});

await test('a changed original replaces a copy that was never patched', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const changed = ALPHA.replace('Labels 40 to 56 px.', 'Labels 44 to 60 px.');
    await writeFile(join(originals, 'alpha.md'), changed);
    const r = await syncTemplates(originals, working);
    assert.deepEqual(
      r.events.map((e) => [e.action, e.file]),
      [['replaced', 'alpha.md']],
    );
    assert.equal(await read(join(working, 'alpha.md')), changed);
    assert.deepEqual((await readManifest(working))['alpha.md'], {
      source_sha256: sha(changed),
      working_sha256: sha(changed),
      patched: false,
    });
  });
});

await test('both changed keeps the copy and flags a conflict on every sync until resolved', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const p = await applyPatches(
      working,
      'alpha',
      [patch({ section: 'look', op: 'append', text: 'Every label sits on a dark pane.' })],
      ctx,
    );
    assert.equal(p.k, 1);
    const patched = await read(join(working, 'alpha.md'));
    await writeFile(join(originals, 'alpha.md'), ALPHA.replace('Dark navy', 'Deep teal'));

    for (let i = 0; i < 2; i++) {
      const r = await syncTemplates(originals, working);
      assert.deepEqual(
        r.events.map((e) => [e.action, e.file]),
        [['conflict', 'alpha.md']],
      );
      assert.deepEqual(r.conflicts, [
        'alpha.md: original changed and the copy was patched; copy kept',
      ]);
      assert.deepEqual(RunRecord.shape.sync_conflicts.parse(r.conflicts), r.conflicts);
      assert.equal(await read(join(working, 'alpha.md')), patched);
    }
    assert.equal(
      (await read(join(working, 'sync.log'))).match(/ conflict alpha\.md: /g)?.length,
      2,
    );

    // a developer folds the patch into the original: the copy equals it again and is no longer patched
    await writeFile(join(originals, 'alpha.md'), patched);
    const r = await syncTemplates(originals, working);
    assert.deepEqual(
      r.events.map((e) => [e.action, e.file]),
      [['matched', 'alpha.md']],
    );
    assert.equal((await readManifest(working))['alpha.md']?.patched, false);
  });
});

await test('a copy edited outside the harness is not overwritten by a changed original', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    await writeFile(join(working, 'beta.md'), `${BETA}- Hand edit.\n`);
    await writeFile(join(originals, 'beta.md'), `${BETA}- New rule.\n`);
    const r = await syncTemplates(originals, working);
    assert.deepEqual(r.conflicts, ['beta.md: original changed and the copy was edited; copy kept']);
    assert.equal(await read(join(working, 'beta.md')), `${BETA}- Hand edit.\n`);
  });
});

await test('a deleted original keeps its working copy and logs it', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    await unlink(join(originals, 'beta.md'));
    const r = await syncTemplates(originals, working);
    assert.deepEqual(r.events, [
      { action: 'kept', file: 'beta.md', detail: 'original deleted; working copy kept' },
    ]);
    assert.deepEqual(r.conflicts, []);
    assert.equal(await read(join(working, 'beta.md')), BETA);
    assert.match(
      await read(join(working, 'sync.log')),
      /kept beta\.md: original deleted; working copy kept\n$/,
    );
  });
});

await test('content words: no stopwords or request framing; 3+ characters or 2 capitals', () => {
  assert.deepEqual([...contentWords(REQUEST)].sort(), ['engine', 'jet']);
  assert.deepEqual([...contentWords("Why the Earth's oceans are salty (for kids), 1969")].sort(), [
    '1969',
    'earth',
    'kids',
    'oceans',
    'salty',
  ]);
  assert.deepEqual([...contentWords('How AI image generators work in the UK')].sort(), [
    'ai',
    'generators',
    'image',
    'uk',
  ]);
});

await test('topic words meet across plurals (-s, -es, -ies) both ways and in any case', () => {
  const pairs: [string, string][] = [
    ['Why volcanoes erupt', 'Open on the volcano crater.'],
    ['How batteries store energy', 'Cut the battery open.'],
    ['How viruses spread', 'One virus per shot.'],
    ['How galaxies form', 'A galaxy fills the frame.'],
    ['Why gases expand', 'Show the gas as dots.'],
    ['What is inside the box', 'Stack the boxes.'],
    ['How a jet engine works', 'Draw both Engines big.'],
    ['How AI image generators work', 'Show an AI chip.'],
    ['Why the UK drives on the left', 'Put the uk map in the corner.'],
  ];
  for (const [request, text] of pairs) {
    assert.equal(topicWordsIn(text, request).length, 1, `${request} / ${text}`);
  }
  assert.deepEqual(topicWordsIn('Open on the strangest true fact.', 'Why volcanoes erupt'), []);
  assert.deepEqual(topicWordsIn('Show us the map.', 'How AI chips work'), []);
});

await test("the template's own name is no exception to the topic check", async () => {
  await withDirs(async (originals, working) => {
    const kind = 'lowpoly-chain-explainer';
    await writeFile(join(originals, `${kind}.md`), ALPHA);
    await syncTemplates(originals, working);
    const r = await applyPatches(
      working,
      kind,
      [patch({ section: 'look', op: 'append', text: 'Draw the chain links big.' })],
      { ...ctx, request: 'How a bike chain works' },
    );
    assert.equal(r.k, null);
    assert.match(r.rejected[0]?.reason ?? '', /"chain"/);
  });
});

await test('valid patches are applied; the snapshot and entry hold the text before the change', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const patches = [
      patch({
        section: 'story',
        op: 'replace',
        old: 'strangest true fact',
        text: 'strangest true fact, never the answer',
      }),
      patch({ section: 'look', op: 'append', text: 'Every label sits on a dark pane.' }),
      patch({ section: 'Look', op: 'append', text: '- Two text sizes per shot at most.' }),
    ];
    const r = await applyPatches(working, 'alpha', patches, ctx);
    assert.equal(r.k, 1);
    assert.deepEqual(r.applied, patches);
    assert.deepEqual(r.rejected, []);
    assert.deepEqual(r.sections, ['story', 'look']);

    const after = await read(join(working, 'alpha.md'));
    assert.equal(
      after,
      ALPHA.replace('strangest true fact', 'strangest true fact, never the answer').replace(
        '- Labels 40 to 56 px.\n',
        '- Labels 40 to 56 px.\n- Every label sits on a dark pane.\n- Two text sizes per shot at most.\n',
      ),
    );
    const hist = join(working, 'history', 'alpha');
    assert.equal(await read(join(hist, '1.md')), ALPHA);
    const entry = HistoryEntry.parse(JSON.parse(await read(join(hist, '1.json'))));
    assert.equal(entry.job, ctx.job);
    assert.equal(entry.cut, 1);
    assert.equal(entry.round, 1);
    assert.deepEqual(entry.patches, patches);
    assert.deepEqual(entry.gates, gates);
    assert.deepEqual(entry.scores, scores);
    assert.equal(entry.sha_before, sha(ALPHA));
    assert.equal(entry.sha_after, sha(after));
    assert.equal(entry.next, null);
    assert.deepEqual((await readManifest(working))['alpha.md'], {
      source_sha256: sha(ALPHA),
      working_sha256: sha(after),
      patched: true,
    });

    const next = await recordNextCut(working, 'alpha', 1, {
      cut: 2,
      gates,
      scores: { ...scores, hook: 5 },
    });
    assert.deepEqual(next.next, { cut: 2, gates, scores: { ...scores, hook: 5 } });
    const reread = HistoryEntry.parse(JSON.parse(await read(join(hist, '1.json'))));
    assert.equal(reread.next?.scores.hook, 5);

    const r2 = await applyPatches(
      working,
      'alpha',
      [patch({ section: 'look', op: 'append', text: 'Thin edges.' })],
      {
        ...ctx,
        cut: 2,
        round: 2,
      },
    );
    assert.equal(r2.k, 2);
    assert.equal(await read(join(hist, '2.md')), after);
  });
});

await test('append to a section the template lacks adds that section', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const r = await applyPatches(
      working,
      'beta',
      [patch({ section: 'sound', op: 'append', text: 'Bouncy music.' })],
      ctx,
    );
    assert.deepEqual(r.sections, ['sound']);
    assert.equal(await read(join(working, 'beta.md')), `${BETA}\n## sound\n- Bouncy music.\n`);
  });
});

await test('rejected patches leave the copy, the manifest and the history untouched', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const cases: [TemplatePatch, RegExp][] = [
      [patch({ section: 'about', op: 'append', text: 'Any machine.' }), /D16/],
      [patch({ section: 'checks', op: 'append', text: 'captions: off' }), /D16/],
      [
        patch({
          section: 'director',
          op: 'replace',
          old: 'Judge the hook first.',
          text: 'Approve.',
        }),
        /D16/,
      ],
      [patch({ section: 'colours', op: 'append', text: 'Teal.' }), /may not be patched/],
      [patch({ section: 'story', op: 'replace', text: 'End on a number.' }), /needs an "old"/],
      [
        patch({ section: 'story', op: 'replace', old: 'a twist', text: 'a turn' }),
        /occurs 0 times/,
      ],
      [patch({ section: 'look', op: 'replace', old: '- ', text: '* ' }), /occurs 2 times/],
      [
        patch({ section: 'story', op: 'append', text: 'Show the jet engine fan first.' }),
        /"jet", "engine"/,
      ],
      [patch({ section: 'look', op: 'append', text: 'Draw both Engines big.' }), /"engines"/],
      [
        patch({
          section: 'story',
          op: 'replace',
          old: '- End on the answer.',
          text: '- End.\n## checks\n- captions: off',
        }),
        /sections/,
      ],
      [patch({ section: 'story', op: 'append', text: 'One line.\nTwo lines.' }), /one line/],
    ];
    for (const [p, reason] of cases) {
      const r = await applyPatches(working, 'alpha', [p], ctx);
      assert.equal(r.k, null, p.section);
      assert.deepEqual(r.applied, []);
      assert.equal(r.rejected.length, 1);
      assert.match(r.rejected[0]?.reason ?? '', reason);
    }
    assert.equal(await read(join(working, 'alpha.md')), ALPHA);
    assert.equal((await readManifest(working))['alpha.md']?.patched, false);
    assert.deepEqual((await readdir(working)).includes('history'), false);

    // one bad patch does not stop the good ones of the same review; the entry lists both
    const mixed = await applyPatches(
      working,
      'alpha',
      [
        patch({ section: 'checks', op: 'append', text: 'captions: off' }),
        patch({ section: 'look', op: 'append', text: 'Thin edges.' }),
      ],
      ctx,
    );
    assert.equal(mixed.k, 1);
    assert.equal(mixed.applied.length, 1);
    const entry = HistoryEntry.parse(
      JSON.parse(await read(join(working, 'history', 'alpha', '1.json'))),
    );
    assert.equal(entry.rejected[0]?.patch.section, 'checks');
  });
});

await test('_base.md is never patchable', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    await assert.rejects(
      applyPatches(
        working,
        '_base',
        [patch({ section: 'story', op: 'append', text: 'Short lines.' })],
        ctx,
      ),
      /_base\.md is never patched/,
    );
    await assert.rejects(
      applyPatches(
        working,
        '../alpha',
        [patch({ section: 'story', op: 'append', text: 'Short lines.' })],
        ctx,
      ),
      /not a template name/,
    );
    assert.equal(await read(join(working, '_base.md')), BASE);
  });
});

await test('the snapshot is written before the change', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const thin = [patch({ section: 'look', op: 'append', text: 'Thin edges.' })];
    // a folder where the copy's temp file goes: writing the copy fails after the history writes
    await mkdir(join(working, 'alpha.md.tmp'));
    await assert.rejects(applyPatches(working, 'alpha', thin, ctx), /EISDIR|EPERM/);
    const hist = join(working, 'history', 'alpha');
    assert.deepEqual((await readdir(hist)).sort(), ['1.json', '1.md']);
    assert.equal(await read(join(hist, '1.md')), ALPHA);
    assert.equal(await read(join(working, 'alpha.md')), ALPHA);
    assert.equal((await readManifest(working))['alpha.md']?.patched, false);

    await rm(join(working, 'alpha.md.tmp'), { recursive: true });
    const r = await applyPatches(working, 'alpha', thin, ctx);
    assert.equal(r.k, 2);
  });
});

await test('a bad entry writes nothing, and a snapshot left without its entry blocks no later patch', async () => {
  await withDirs(async (originals, working) => {
    await writeOriginals(originals);
    await syncTemplates(originals, working);
    const thin = [patch({ section: 'look', op: 'append', text: 'Thin edges.' })];
    // round 0 does not exist: round 1 is the fix round after cut 1's review (§6.1, D20)
    await assert.rejects(applyPatches(working, 'alpha', thin, { ...ctx, round: 0 }), /round/);
    assert.equal((await readdir(working)).includes('history'), false);
    assert.equal(await read(join(working, 'alpha.md')), ALPHA);

    // a crash between the snapshot and the entry leaves 1.md alone
    await mkdir(join(working, 'history', 'alpha'), { recursive: true });
    await writeFile(join(working, 'history', 'alpha', '1.md'), ALPHA);
    const r = await applyPatches(working, 'alpha', thin, ctx);
    assert.equal(r.k, 2);
    assert.match(await read(join(working, 'alpha.md')), /- Thin edges\.\n/);
  });
});

// every file an engine work folder holds (engine/asset_reel.mjs ckSave, renderSheets, findPhotos; audio.mjs pickMusic)
const WORK_FILES = [
  'reference.txt',
  'calls.json',
  'facts.json',
  'spine.json',
  'script.json',
  'script.md',
  'plan.json',
  'poses.json',
  'photos.json',
  'kit.js',
  'asset_hero.js',
  'asset_hero.preview',
  'asset_hero.poses.json',
  'asset_map_2.js',
  'sheet.jpg',
  'sheet_2.jpg',
  'sheet-r2.jpg',
  'sheet-final.jpg',
  'sheet-review-r1.json',
  'sheet-review-r2.json',
  'sheet-review.json',
  'shot_1.js',
  'shot_12.js',
  'music.json',
  'music_lyria.mp3',
  'music_synth.wav',
  'rejected__.js',
  'rejected_-_.js',
];

async function withWork(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'cutroom-work-'));
  try {
    for (const f of WORK_FILES) await writeFile(join(dir, f), '{}');
    await mkdir(join(dir, 'photos'));
    await writeFile(join(dir, 'photos', 'p1.jpg'), 'jpg');
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await test('invalidation deletes exactly the expected checkpoints from a fixture work folder', async () => {
  const script = [
    'spine.json',
    'script.json',
    'script.md',
    'music.json',
    'music_lyria.mp3',
    'music_synth.wav',
  ];
  const keptAlways = ['calls.json', 'reference.txt'];
  const cases: [PatchableSection[], string, string[]][] = [
    [['story'], 'facts.json', keptAlways],
    [['plan'], 'spine.json', [...keptAlways, 'facts.json']],
    [['sound'], 'spine.json', [...keptAlways, 'facts.json']],
    [['look'], 'plan.json', [...keptAlways, 'facts.json', ...script]],
    [['motion'], 'plan.json', [...keptAlways, 'facts.json', ...script]],
    [['assets'], 'plan.json', [...keptAlways, 'facts.json', ...script]],
    [['shots'], 'plan.json', [...keptAlways, 'facts.json', ...script]],
    [['shots', 'sound'], 'spine.json', [...keptAlways, 'facts.json']],
  ];
  for (const [sections, from, kept] of cases) {
    await withWork(async (dir) => {
      const all = [...WORK_FILES, 'photos'].sort();
      const r = await invalidateCheckpoints(dir, sections);
      assert.equal(r.from, from, sections.join());
      assert.deepEqual((await readdir(dir)).sort(), [...kept].sort(), sections.join());
      assert.deepEqual(
        r.deleted,
        all.filter((f) => !kept.includes(f)),
        sections.join(),
      );
    });
  }
});
