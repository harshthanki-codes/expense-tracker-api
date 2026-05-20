import jwt, { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret =
process.env.JWT_SECRET || "change-me-in-production";

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface JwtPayload {
userId: string;
email?: string;
jti?: string;
type?: "access" | "refresh";
}

export function signAccessToken(payload: JwtPayload): string {
const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
};

return jwt.sign(payload, JWT_SECRET, options);
}

export function signRefreshToken(payload: JwtPayload): string {
const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
};

return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
return jwt.decode(token) as JwtPayload | null;
}