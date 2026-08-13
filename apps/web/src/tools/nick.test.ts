import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NICK_STYLES, NICK_BASES, renderNick, randomNick } from './nick';

describe('renderNick', () => {
  it('replaces the FURYX placeholder with the base', () => {
    assert.equal(renderNick('xX_FURYX_Xx', 'APEX9'), 'xX_APEX9_Xx');
  });

  it('works for all styles used by the UI chips', () => {
    for (let i = 0; i < 6; i++) {
      const out = renderNick(NICK_STYLES[i].base, 'FURYX');
      assert.ok(out.length > 0, `style ${i} rendered empty`);
    }
  });
});

describe('randomNick', () => {
  it('returns a non-empty nick', () => {
    assert.ok(randomNick().length > 0);
  });

  it('only uses known bases', () => {
    for (let i = 0; i < 50; i++) {
      const nick = randomNick();
      assert.ok(NICK_BASES.some((b) => nick.includes(b)), `unexpected nick: ${nick}`);
    }
  });
});
