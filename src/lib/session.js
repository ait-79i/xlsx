// Session JWT, stored in an httpOnly cookie. Works in the middleware (edge) and in route handlers.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "token";

const secretKey = () => {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error("JWT_SECRET is not set");
	return new TextEncoder().encode(secret);
};

export const createToken = (user) =>
	new SignJWT({ username: user.username, email: user.email })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(String(user.id))
		.setIssuedAt()
		.setExpirationTime(process.env.JWT_EXPIRES_IN || "1d")
		.sign(secretKey());

// Returns the payload, or null when the token is missing, invalid or expired
export const verifyToken = async (token) => {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
		return payload;
	} catch {
		return null;
	}
};

export const sessionCookie = (token, maxAge) => ({
	name: SESSION_COOKIE,
	value: token,
	httpOnly: true,
	sameSite: "lax",
	// COOKIE_SECURE=false when the app is served over plain http (other than localhost)
	secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
	path: "/",
	maxAge,
});
