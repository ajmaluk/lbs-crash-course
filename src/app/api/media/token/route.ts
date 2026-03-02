import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

type Payload = { id: string; kind: "yt"; exp: number; t: number };

function sign(payload: Payload, secret: string): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.MEDIA_TOKEN_SECRET || (process.env.NODE_ENV !== "production" ? "dev-media-secret" : "");
    if (!secret) return NextResponse.json({ message: "Server not configured" }, { status: 500 });
    const body = await req.json().catch(() => null) as { id?: string; kind?: "yt" } | null;
    const id = (body?.id || "").trim();
    const kind = body?.kind || "yt";
    if (!id) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }
    const now = Date.now();
    const payload: Payload = { id, kind, t: now, exp: now + 5 * 60 * 1000 };
    const token = sign(payload, secret);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ message: "Failed to issue token" }, { status: 500 });
  }
}
