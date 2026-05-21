import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export interface JwtPayload {
sub: string;
email?: string;
type?: string;
jti?: string;
}

export function signAccessToken(payload: JwtPayload): string {
return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
});
}

export function signRefreshToken(payload: JwtPayload): string {
return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
});
}

export function verifyToken(token: string): JwtPayload {
return jwt.verify(token, JWT_SECRET) as JwtPayload;
}