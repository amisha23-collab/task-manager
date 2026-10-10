import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { verifyToken } from '../src/auth/jwt.js';
import { createAuthService } from '../src/services/authService.js';

const jwtConfig = { secret: 'test-secret-that-is-long-enough', expiresIn: '1h' };

const makeUserModel = () => {
  const users = [];
  return {
    users,
    async exists({ email }) {
      return users.some((u) => u.email === email) ? { _id: 1 } : null;
    },
    async create(data) {
      const now = new Date();
      const user = { _id: new mongoose.Types.ObjectId(), createdAt: now, updatedAt: now, ...data };
      users.push(user);
      return user;
    },
    findOne({ email }) {
      return { select: async () => users.find((u) => u.email === email) ?? null };
    },
    async findById(id) {
      return users.find((u) => String(u._id) === String(id)) ?? null;
    },
  };
};

describe('authService', () => {
  let UserModel;
  let service;

  beforeEach(() => {
    UserModel = makeUserModel();
    service = createAuthService({ UserModel, jwtConfig });
  });

  it('registers a user, hashes the password and returns a valid JWT', async () => {
    const { token, user } = await service.register({ name: ' Ami ', email: 'AMI@Example.com', password: 'password123' });

    assert.equal(user.name, 'Ami');
    assert.equal(user.email, 'ami@example.com');
    assert.equal(verifyToken(token, jwtConfig.secret).sub, user.id);
    assert.notEqual(UserModel.users[0].password, 'password123');
    assert.equal('password' in user, false);
  });

  it('rejects duplicate emails and invalid input', async () => {
    await service.register({ name: 'A', email: 'a@example.com', password: 'password123' });
    await assert.rejects(service.register({ name: 'B', email: 'a@example.com', password: 'password123' }), /already exists/);
    await assert.rejects(service.register({ name: '', email: 'bad', password: 'short' }), /Name is required/);
  });

  it('logs in with the right password', async () => {
    await service.register({ name: 'A', email: 'a@example.com', password: 'password123' });
    const { token, user } = await service.login({ email: 'a@example.com', password: 'password123' });
    assert.equal(verifyToken(token, jwtConfig.secret).sub, user.id);
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    await service.register({ name: 'A', email: 'a@example.com', password: 'password123' });
    await assert.rejects(service.login({ email: 'a@example.com', password: 'wrong-password' }), /Invalid email or password/);
    await assert.rejects(service.login({ email: 'nobody@example.com', password: 'password123' }), /Invalid email or password/);
  });
});
