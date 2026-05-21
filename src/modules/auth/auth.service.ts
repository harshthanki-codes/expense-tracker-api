import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';

import {
signAccessToken,
signRefreshToken,
verifyToken,
} from '../../lib/jwt';

import {
ConflictError,
UnauthorizedError,
} from '../../lib/errors';

import {
RegisterInput,
LoginInput,
RefreshInput,
} from './auth.schema';

export interface TokenPair {
accessToken: string;
refreshToken: string;
expiresIn: string;
}

export interface AuthUser {
id: string;
email: string;
name: string;
createdAt: Date;
}

export async function register(
input: RegisterInput,
): Promise<{ user: AuthUser; tokens: TokenPair }> {
const existing = await prisma.user.findUnique({
    where: { email: input.email },
});

if (existing) {
    throw new ConflictError(
    'An account with this email already exists',
    );
}

const passwordHash = await bcrypt.hash(
    input.password,
    env.BCRYPT_ROUNDS,
);

const user = await prisma.user.create({
    data: {
    name: input.name,
    email: input.email,
    passwordHash,
    },
    select: {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    },
});

return {
    user,
    tokens: buildTokenPair(user.id, user.email),
};
}

export async function login(
input: LoginInput,
): Promise<{ user: AuthUser; tokens: TokenPair }> {
const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
    id: true,
    email: true,
    name: true,
    passwordHash: true,
    createdAt: true,
    },
});

const dummyHash =
    '$2a$12$invalid.hash.to.prevent.timing.attacks.padding';

const passwordValid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? dummyHash,
);

if (!user || !passwordValid) {
    throw new UnauthorizedError(
    'Invalid email or password',
    );
}

return {
    user: {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    },
    tokens: buildTokenPair(user.id, user.email),
};
}

export async function refreshTokens(
input: RefreshInput,
): Promise<TokenPair> {
const payload = verifyToken(input.refreshToken);

if (payload.type !== 'refresh') {
    throw new UnauthorizedError(
    'Refresh token required',
    );
}

if (payload.jti) {
    const isBlocklisted = await redis.get(
    `blocklist:${payload.jti}`,
    );

    if (isBlocklisted) {
    throw new UnauthorizedError(
        'Refresh token has been revoked',
    );
    }

    const decoded = jwt.decode(
    input.refreshToken,
    ) as { exp?: number };

    const ttl = decoded.exp
    ? decoded.exp - Math.floor(Date.now() / 1000)
    : 7 * 24 * 3600;

    if (ttl > 0) {
    await redis.setex(
        `blocklist:${payload.jti}`,
        ttl,
        '1',
    );
    }
}

return buildTokenPair(
    payload.sub,
    payload.email || '',
);
}

export async function logout(
accessToken: string,
): Promise<void> {
const payload = verifyToken(accessToken);

if (!payload.jti) {
    return;
}

const decoded = jwt.decode(
    accessToken,
) as { exp?: number };

const ttl = decoded.exp
    ? decoded.exp - Math.floor(Date.now() / 1000)
    : 900;

if (ttl > 0) {
    await redis.setex(
    `blocklist:${payload.jti}`,
    ttl,
    '1',
    );
}
}

function buildTokenPair(
userId: string,
email: string,
): TokenPair {
return {
    accessToken: signAccessToken(userId, email),

    refreshToken: signRefreshToken(userId, email),

    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
};
}