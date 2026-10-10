import jwt from 'jsonwebtoken';

export const signToken = (userId, { secret, expiresIn }) =>
  jwt.sign({ sub: String(userId) }, secret, { expiresIn });

/** Returns the decoded payload, or throws if the token is invalid or expired. */
export const verifyToken = (token, secret) => jwt.verify(token, secret);
