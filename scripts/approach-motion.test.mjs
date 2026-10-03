import test from 'node:test';
import assert from 'node:assert/strict';
import { paceApproach } from '../components/threed/engine/approach-motion.ts';

test('a large chapter jump still traverses the approach at a bounded speed', () => {
  let shot = 3;
  for (let frame = 0; frame < 360; frame++) {
    const next = paceApproach(shot, 40, 14, 1 / 60);
    assert.ok(next >= shot && next - shot <= 1.65 / 60 + 1e-9);
    shot = next;
  }
  assert.ok(shot < 14, 'the landing should not be skipped in a fast scroll');
});
test('reverse scrolling uses the same approach pace and leaving it is unrestricted', () => {
  assert.ok(15 - paceApproach(15, 0, 14, 1 / 60) <= 1.65 / 60 + 1e-9);
  assert.equal(paceApproach(20, 25, 14, 1 / 60), 25);
  assert.equal(paceApproach(2, 1, 14, 1 / 60), 1);
  assert.equal(paceApproach(8, 8, 14, 1 / 60), 8);
});
