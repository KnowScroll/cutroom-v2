import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { castVoices, normVoice, voiceGuide, VOICE_MODELS } from '../engine/audio.mjs';

// The cast's voices after the engine maps template (Kokoro) voice names onto a voice model's own (engine/audio.mjs). QC3 Norway
// (var/runs/qc3-norway, heygen): the script's cast am_onyx, am_adam, am_fenrir, am_michael came out as bram, gareth, bram, gareth,
// so the narrator and Sweden spoke with one voice, and the narrator's bram measured a pitch spread of 3.39 st (gate 4).

const MODELS = Object.keys(VOICE_MODELS);
// a model's voices and their descriptions, as the script prompt lists them: "All voices: id (description), ..."
const voicesOf = (model: string): Map<string, string> => {
  const all = /All voices: (.*?)\. A different voice/.exec(voiceGuide(model))?.[1] ?? '';
  return new Map(
    [...all.matchAll(/(?<=^|\), )([\w-]+) \(((?:[^()]|\([^()]*\))*)\)/g)].map((m) => [
      m[1] ?? '',
      m[2] ?? '',
    ]),
  );
};
const NORWAY = {
  narrator: { voice: 'am_onyx' },
  norway: { voice: 'am_adam' },
  sweden: { voice: 'am_fenrir' },
  carl: { voice: 'am_michael' },
};
const distinct = (voices: Record<string, string>) => new Set(Object.values(voices)).size;

await test('every speaker of the QC3 Norway cast keeps a voice of its own, on every voice model', () => {
  assert.deepEqual(castVoices('heygen', NORWAY), {
    narrator: 'gareth',
    norway: 'lucian',
    sweden: 'bram',
    carl: 'weston',
  });
  for (const model of MODELS) {
    const voices = castVoices(model, NORWAY);
    assert.equal(distinct(voices), 4, `${model}: ${JSON.stringify(voices)}`);
    assert.equal(
      voices.narrator,
      normVoice(model, 'am_onyx', true),
      `${model}: the narrator keeps its voice`,
    );
    for (const v of Object.values(voices))
      assert.ok(voicesOf(model).has(v), `${model}: ${v} is its voice`);
  }
});

await test("the countryball narrator's HeyGen voice is one measured over the pitch gate", () => {
  const narrator = normVoice('heygen', 'am_onyx', true);
  assert.notEqual(narrator, 'bram');
  const spread = /\((\d+(?:\.\d+)?) st\)/.exec(voicesOf('heygen').get(narrator) ?? '')?.[1];
  assert.ok(Number(spread) >= 4, `${narrator}: ${String(spread)} st`);
});

await test("no two cast ids share a voice for any template's voice set", () => {
  // every voice a template names (its narrator's, the voice per engine), for each model, with four more speakers naming them too
  const known = new Set([...MODELS.flatMap((m) => [...voicesOf(m).keys()])]);
  const dir = new URL('../templates/', import.meta.url);
  const sets = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(new URL(f, dir), 'utf8');
      return {
        f,
        named: [...known].filter((v) => new RegExp(`(?:\\bvoice:?\\s+|")${v}\\b`).test(text)),
      };
    })
    .filter((t) => t.named.length);
  assert.ok(
    sets.some((t) => t.f === 'countryball-map-story.md' && t.named.includes('am_onyx')),
    `templates naming a voice: ${JSON.stringify(sets)}`,
  );
  for (const { f, named } of sets)
    for (const model of MODELS) {
      const cast = Object.fromEntries(
        ['narrator', 'a', 'b', 'c', 'd'].map((id, i) => [id, { voice: named[i % named.length] }]),
      );
      const voices = castVoices(model, cast);
      assert.equal(distinct(voices), 5, `${f} on ${model}: ${JSON.stringify(voices)}`);
    }
  // speakers with no voice, or one no model has, get distinct defaults too
  for (const model of MODELS)
    assert.equal(
      distinct(castVoices(model, { narrator: {}, a: {}, b: { voice: 'nobody' }, c: null })),
      4,
      model,
    );
});
