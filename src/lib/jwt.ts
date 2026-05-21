import jwt from 'jsonwebtoken';
import { StringValue } from 'ms';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
  type: 'access' | 'refresh';
}

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      jti: crypto.randomUUID(),
      type: 'access',
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
    },
  );
}

export function signRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      jti: crypto.randomUUID(),
      type: 'refresh',
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
    },
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}