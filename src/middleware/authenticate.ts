import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../lib/jwt';
import { redis } from '../config/redis';
import { UnauthorizedError } from '../lib/errors';

export async function authenticate(
req: AuthenticatedRequest,
_res: Response,
next: NextFunction,
): Promise<void> {
const authHeader = req.headers.authorization;

if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
}

const token = authHeader.slice(7);

const payload = verifyToken(token);

if (payload.type && payload.type !== 'access') {
    throw new UnauthorizedError('Access token required');
}

if (payload.jti) {
    const isBlocklisted = await redis.get(`blocklist:${payload.jti}`);

    if (isBlocklisted) {
    throw new UnauthorizedError('Token has been revoked');
    }
}

req.user = {
    id: payload.sub,
    email: payload.email || '',
};

next();
}