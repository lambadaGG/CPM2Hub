import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NICK_STYLES, NICK_BASES, renderNick, randomNick } from './nick';

describe('renderNick', () => {
  it('renders the classic wrapper style', () => {
    assert.equal(renderNick(NICK_STYLES[0], 'APEX9'), 'xX_APEX9_Xx');
  });

  it('works for all styles used by the UI chips', () => {
    for (let i = 0; i < NICK_STYLES.length; i++) {
      const out = renderNick(NICK_STYLES[i], 'FURYX');
      assert.ok(out.length > 0, `style ${i} rendered empty`);
    }
  });

  it('falls back to a default base when input is empty', () => {
    assert.ok(renderNick(NICK_STYLES[0], '').includes('FURYX'));
  });
});

describe('randomNick', () => {
  it('returns a non-empty nick', () => {
    assert.ok(randomNick().length > 0);
  });

  it('produces a valid combination for many iterations', () => {
    for (let i = 0; i < 50; i++) {
      const nick = randomNick();
      assert.ok(nick.length > 0 && nick.length < 40, `bad nick: ${nick}`);
      assert.ok(NICK_BASES.length > 0 && NICK_STYLES.length > 0);
    }
  });
});
