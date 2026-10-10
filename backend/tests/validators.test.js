import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateTaskInput } from '../src/utils/validators.js';

describe('validateTaskInput', () => {
  it('requires a title when creating', () => {
    assert.throws(() => validateTaskInput({}), /Title is required/);
  });

  it('trims values and defaults nothing the user did not send on update', () => {
    assert.deepEqual(validateTaskInput({ title: '  Hi ' }, { partial: true }), { title: 'Hi' });
    assert.deepEqual(validateTaskInput({ completed: false }, { partial: true }), { completed: false });
  });

  it('enforces length limits', () => {
    assert.throws(() => validateTaskInput({ title: 'x'.repeat(121) }), /120 characters/);
    assert.throws(() => validateTaskInput({ title: 'ok', description: 'x'.repeat(1001) }), /1000 characters/);
  });
});
