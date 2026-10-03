import test from 'node:test';
import assert from 'node:assert/strict';
import { soundMix, MUSIC_START } from '../components/threed/engine/audio-mix.ts';
import { createAudioCues } from '../components/threed/engine/audio-events.ts';

const still = { f: 2, scrollV: 0, seam: 0, flash: 0, fly: 0, speed: 0, footer: 0, modal: false };

test('track skips the first ten seconds', () => assert.equal(MUSIC_START, 10));
test('speed, transitions and flight never amplify the music', () => {
  for (const field of ['speed', 'scrollV', 'seam', 'fly']) {
    let previous = soundMix(still).music;
    for (let i = 0; i <= 100; i++) {
      const level = soundMix({ ...still, [field]: field === 'speed' ? i * 2 : i / 100 }).music;
      assert.ok(level <= previous + 1e-9, `${field} increased the music`);
      previous = level;
    }
  }
});
test('space stays quiet even when scrolling stops', () => {
  for (const f of [0, 4, 5, 6]) {
    const mix = soundMix({ ...still, f });
    assert.ok(mix.music < 0.08);
    assert.ok(mix.wind > soundMix(still).wind);
    assert.ok(mix.music + mix.wind + mix.air < 0.13);
  }
});
test('all layers duck in a project dialog and stay within a quiet budget', () => {
  for (let f = 0; f <= 6; f += 0.25) {
    for (const speed of [0, 30, 200]) {
      const normal = soundMix({ ...still, f, speed });
      const modal = soundMix({ ...still, f, speed, modal: true });
      for (const layer of ['music', 'wind', 'air']) assert.ok(modal[layer] < normal[layer]);
      assert.ok(normal.music + normal.wind + normal.air <= 0.221);
    }
  }
});

test('wind responds to speed even while flying and settles when stopped', () => {
  const resting = soundMix({ ...still, f: 4, fly: 1 });
  let previous = resting.wind;
  for (let speed = 10; speed <= 200; speed += 10) {
    const moving = soundMix({ ...still, f: 4, fly: 1, speed });
    assert.ok(moving.wind >= previous);
    assert.ok(moving.cutoff > resting.cutoff);
    assert.ok(moving.music <= resting.music);
    previous = moving.wind;
  }
  assert.ok(previous > resting.wind * 2);
});

test('gate cues fire once, ignore threshold jitter, and rearm after leaving', () => {
  const cue = createAudioCues();
  assert.equal(cue('gate', 0), false);
  assert.equal(cue('gate', 0.8), true);
  for (const level of [0.8, 0.64, 0.7, 0.5]) assert.equal(cue('gate', level), false);
  assert.equal(cue('gate', 0), false);
  assert.equal(cue('gate', 0.8), true);
  assert.equal(cue('crack', 0.8), true);
});
