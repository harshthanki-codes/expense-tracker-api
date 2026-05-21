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

// Optional safety check
if ((payload as any).type && (payload as any).type !== 'access') {
    throw new UnauthorizedError('Access token required');
}

// Optional blocklist check
const jti = (payload as any).jti;

if (jti) {
    const isBlocklisted = await redis.get(`blocklist:${jti}`);

    if (isBlocklisted) {
    throw new UnauthorizedError('Token has been revoked');
    }
}

req.user = {
    id: payload.sub || '',
    email: (payload as any).email || '',
};

next();
}