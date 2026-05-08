import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth-utils";

export const runtime = 'nodejs';

type Payload = { id: string; kind: "yt" | "note"; exp: number; t: number };

async function getKey(secret: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    return crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
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

async function sign(payload: Payload, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const key = await getKey(secret);
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(b64));
    const sig = base64UrlEncode(signature);
    return `${b64}.${sig}`;
}

export async function POST(req: NextRequest) {
    try {
        const { error } = await verifySession(req);
        if (error) return error;

        const secret = process.env.MEDIA_TOKEN_SECRET || (process.env.NODE_ENV !== "production" ? "dev-media-secret" : "");
        if (!secret) return NextResponse.json({ message: "Server not configured" }, { status: 500 });

        const body = await req.json().catch(() => null) as { id?: string; kind?: "yt" | "note" } | null;
        const id = (body?.id || "").trim();
        const kind = body?.kind || "yt";
        if (!id) {
            console.error("[API_MEDIA_TOKEN] Missing id in request body");
            return NextResponse.json({ message: "Missing id" }, { status: 400 });
        }
        const now = Date.now();
        const payload: Payload = { id, kind, t: now, exp: now + 5 * 60 * 1000 };
        const token = await sign(payload, secret);
        return NextResponse.json({ token });
    } catch (err: any) {
        console.error("[API_MEDIA_TOKEN] Unexpected error:", err);
        return NextResponse.json({ message: err.message || "Failed to issue token" }, { status: 500 });
    }
}
