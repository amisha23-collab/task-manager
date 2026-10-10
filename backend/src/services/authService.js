
import bcrypt from 'bcryptjs';
import { signToken } from '../auth/jwt.js';
import { badUserInput, unauthenticated } from '../utils/errors.js';
import { toUserDTO } from '../utils/mappers.js';
import {
  validateChangePasswordInput,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput,
} from '../utils/validators.js';

const SALT_ROUNDS = 10;
const MONGO_DUPLICATE_KEY = 11000;

export const createAuthService = ({ UserModel, jwtConfig }) => {
  const buildAuthPayload = (userDoc) => ({
    token: signToken(userDoc._id, jwtConfig),
    user: toUserDTO(userDoc),
  });

  return {
    async register(input) {
      const { name, email, password } = validateRegisterInput(input);

      if (await UserModel.exists({ email })) {
        throw badUserInput('An account with this email already exists.', {
          email: 'An account with this email already exists.',
        });
      }

      try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await UserModel.create({
          name,
          email,
          password: hash,
        });

        return buildAuthPayload(user);
      } catch (err) {
        if (err.code === MONGO_DUPLICATE_KEY) {
          throw badUserInput('An account with this email already exists.', {
            email: 'An account with this email already exists.',
          });
        }
        throw err;
      }
    },

    async login(input) {
      const { email, password } = validateLoginInput(input);
      const user = await UserModel.findOne({ email }).select('+password');

      const matches = user
        ? await bcrypt.compare(password, user.password)
        : false;

      if (!matches) throw unauthenticated('Invalid email or password.');

      return buildAuthPayload(user);
    },

    async getUserById(id) {
      const user = await UserModel.findById(id);

      if (!user) {
        throw unauthenticated(
          'Your account no longer exists. Please log in again.'
        );
      }

      return toUserDTO(user);
    },

    async updateProfile(userId, input) {
      const updates = validateProfileInput(input);
      const user = await UserModel.findById(userId);

      if (!user) {
        throw unauthenticated(
          'Your account no longer exists. Please log in again.'
        );
      }

      if (updates.email && updates.email !== user.email) {
        const existing = await UserModel.exists({
          email: updates.email,
          _id: { $ne: userId },
        });

        if (existing) {
          throw badUserInput('An account with this email already exists.', {
            email: 'An account with this email already exists.',
          });
        }
      }

      Object.assign(user, updates);

      try {
        const savedUser = await user.save();
        return toUserDTO(savedUser);
      } catch (err) {
        if (err.code === MONGO_DUPLICATE_KEY) {
          throw badUserInput('An account with this email already exists.', {
            email: 'An account with this email already exists.',
          });
        }
        throw err;
      }
    },

    async changePassword(userId, input) {
      const { currentPassword, newPassword } =
        validateChangePasswordInput(input);

      const user = await UserModel.findById(userId).select('+password');

      if (!user) {
        throw unauthenticated(
          'Your account no longer exists. Please log in again.'
        );
      }

      const matches = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!matches) {
        throw badUserInput('Your current password is incorrect.', {
          currentPassword: 'Your current password is incorrect.',
        });
      }

      user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.save();

      return true;
    },
  };
};
