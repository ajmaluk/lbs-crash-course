import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

type Payload = { id: string; kind: "yt" | "note"; exp: number; t: number };

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verify(token: string, secret: string): Promise<Payload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  
  try {
    const key = await getKey(secret);
    const enc = new TextEncoder();
    const sigBytes = base64UrlDecode(sig);
    
    const sigBuffer = new ArrayBuffer(sigBytes.length);
    new Uint8Array(sigBuffer).set(sigBytes);
    
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      enc.encode(b64)
    );
    
    if (!valid) return null;
    
    const json = new TextDecoder().decode(base64UrlDecode(b64));
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
    const payload = await verify(token, secret);
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
