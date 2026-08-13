import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { makeBuyPayload, parseBuyPayload } from './payments';

describe('buy payload', () => {
  it('roundtrips productId and userId', () => {
    for (const [productId, userId] of [[1, 42], [149, 84920192], [7, 3]]) {
      const parsed = parseBuyPayload(makeBuyPayload(productId, userId));
      assert.deepEqual(parsed, { productId, userId });
    }
  });

  it('produces unique payloads per call', () => {
    assert.notEqual(makeBuyPayload(1, 2), makeBuyPayload(1, 2));
  });

  it('rejects a malformed payload', () => {
    assert.equal(parseBuyPayload(''), null);
    assert.equal(parseBuyPayload('sell:1:2:abc'), null);
    assert.equal(parseBuyPayload('buy:1:2'), null);
    assert.equal(parseBuyPayload('buy:x:2:abc'), null);
    assert.equal(parseBuyPayload('buy:1:y:abc'), null);
  });
});
