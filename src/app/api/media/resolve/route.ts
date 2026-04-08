import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

type Payload = { id: string; kind: "yt" | "note"; exp: number; t: number };

function verify(token: string, secret: string): Payload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(b64).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const json = Buffer.from(b64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as Payload;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.MEDIA_TOKEN_SECRET || (process.env.NODE_ENV !== "production" ? "dev-media-secret" : "");
    if (!secret) return NextResponse.json({ message: "Server not configured" }, { status: 500 });
    const token = req.nextUrl.searchParams.get("token") || "";
    if (!token) {
      return NextResponse.json({ message: "Missing token" }, { status: 400 });
    }
    const payload = verify(token, secret);
    if (!payload) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    if (Date.now() > payload.exp) {
      return NextResponse.json({ message: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ id: payload.id, kind: payload.kind });
  } catch {
    return NextResponse.json({ message: "Resolve failed" }, { status: 500 });
  }
}
