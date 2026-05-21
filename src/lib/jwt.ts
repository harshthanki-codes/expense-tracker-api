import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export interface JwtPayload {
sub: string;
}

export const signToken = (payload: JwtPayload) => {
return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
});
};

export const verifyToken = (token: string): JwtPayload => {
return jwt.verify(token, JWT_SECRET) as JwtPayload;
};