import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, clientIp, getCurrentUser } from "@/lib/auth";
import { LIMITS, hit } from "@/lib/rateLimit";
import { EMAIL, text } from "@/lib/validate";
import { CONTACT_TOPICS as TOPICS } from "@/utils/contact";

// POST { name, email, topic, message, website } -> stores the message (signed in or not)
export async function POST(request) {
	const body = await request.json().catch(() => ({}));
	// hidden field that people leave empty: spam bots fill it and get a fake success
	if (body.website) return NextResponse.json({ sent: true }, { status: 201 });

	const limit = hit(`contact:${clientIp(request)}`, LIMITS.contact);
	if (!limit.ok) return NextResponse.json({ code: "tooManyAttempts", retryAfter: limit.retryAfter }, { status: 429 });

	const name = text(body.name, { max: 100 });
	const email = text(body.email, { max: 200 })?.toLowerCase();
	const message = text(body.message, { max: 5000, min: 10 });
	const topic = TOPICS.includes(body.topic) ? body.topic : null;
	const errors = {};
	if (!name) errors.name = "required";
	if (!email || !EMAIL.test(email)) errors.email = "invalidEmail";
	if (!topic) errors.topic = "required";
	if (!message) errors.message = "messageLength";
	if (Object.keys(errors).length) return badRequest("invalidData", { errors });

	const user = await getCurrentUser();
	await prisma.contactMessage.create({ data: { name, email, topic, message, userId: user?.id ?? null } });
	return NextResponse.json({ sent: true }, { status: 201 });
}
