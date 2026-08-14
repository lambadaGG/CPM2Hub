import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAct, roleFor, type TradeRow } from './escrow';

function makeTrade(overrides: Partial<TradeRow> = {}): TradeRow {
  return {
    id: 1,
    creatorId: 10,
    peerUserId: 20,
    kind: 'car',
    offer: 'Supra',
    receive: '100 Stars',
    peer: 'peer',
    status: 'waiting',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

test('roleFor returns creator, peer or null', () => {
  const t = makeTrade();
  assert.equal(roleFor(t, 10), 'creator');
  assert.equal(roleFor(t, 20), 'peer');
  assert.equal(roleFor(t, 30), null);
});

test('roleFor ignores null peerUserId', () => {
  const t = makeTrade({ peerUserId: null });
  assert.equal(roleFor(t, 20), null);
});

test('accept: peer in waiting, not creator, not outsider, not wrong status', () => {
  assert.equal(canAct(makeTrade(), 'accept', 20), null);
  assert.equal(canAct(makeTrade(), 'accept', 10), 'wrong_role');
  assert.equal(canAct(makeTrade(), 'accept', 30), 'not_participant');
  assert.equal(canAct(makeTrade({ status: 'escrow' }), 'accept', 20), 'bad_status');
});

test('decline: peer in waiting only', () => {
  assert.equal(canAct(makeTrade(), 'decline', 20), null);
  assert.equal(canAct(makeTrade(), 'decline', 10), 'wrong_role');
  assert.equal(canAct(makeTrade({ status: 'escrow' }), 'decline', 20), 'bad_status');
});

test('cancel: creator in waiting only', () => {
  assert.equal(canAct(makeTrade(), 'cancel', 10), null);
  assert.equal(canAct(makeTrade(), 'cancel', 20), 'wrong_role');
  assert.equal(canAct(makeTrade({ status: 'escrow' }), 'cancel', 10), 'bad_status');
});

test('complete: peer in escrow only', () => {
  const t = makeTrade({ status: 'escrow' });
  assert.equal(canAct(t, 'complete', 20), null);
  assert.equal(canAct(t, 'complete', 10), 'wrong_role');
  assert.equal(canAct(makeTrade(), 'complete', 20), 'bad_status');
});

test('dispute: either participant in escrow', () => {
  const t = makeTrade({ status: 'escrow' });
  assert.equal(canAct(t, 'dispute', 10), null);
  assert.equal(canAct(t, 'dispute', 20), null);
  assert.equal(canAct(t, 'dispute', 30), 'not_participant');
  assert.equal(canAct(makeTrade(), 'dispute', 20), 'bad_status');
});
