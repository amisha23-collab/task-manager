import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { buildContext } from '../src/auth/context.js';
import { requireAuth } from '../src/auth/guard.js';
import { signToken } from '../src/auth/jwt.js';

const config = { jwt: { secret: 'test-secret-that-is-long-enough', expiresIn: '1h' } };
const services = {};
const contextFor = (authorization) => buildContext({ config, services })({ req: { headers: { authorization } } });

describe('JWT request context', () => {
  it('sets the user from a valid Bearer token', async () => {
    const token = signToken('user-1', config.jwt);
    const context = await contextFor(`Bearer ${token}`);
    assert.deepEqual(context.user, { id: 'user-1' });
    assert.deepEqual(requireAuth(context), { id: 'user-1' });
  });

  it('leaves user null for a missing, malformed, tampered or expired token', async () => {
    const expired = jwt.sign({ sub: 'user-1' }, config.jwt.secret, { expiresIn: -10 });
    const tampered = jwt.sign({ sub: 'user-1' }, 'a-different-secret-entirely');

    for (const header of [undefined, 'Bearer', 'Token abc', 'Bearer not.a.jwt', `Bearer ${expired}`, `Bearer ${tampered}`]) {
      assert.equal((await contextFor(header)).user, null, `header: ${header}`);
    }
  });

  it('requireAuth throws UNAUTHENTICATED when there is no user', () => {
    assert.throws(
      () => requireAuth({ user: null }),
      (err) => err.extensions.code === 'UNAUTHENTICATED'
    );
  });
});
