import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

type Payload = { id: string; kind: "note"; exp: number; t: number };

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

function normalizeGoogleDriveUrl(rawUrl: string) {
  const fileId = extractGoogleDriveFileId(rawUrl);
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : rawUrl;
}

function isDriveUrl(rawUrl: string) {
  return /drive\.google\.com/i.test(rawUrl);
}

function extractGoogleDriveFileId(rawUrl: string) {
  const sharePatterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of sharePatterns) {
    const match = rawUrl.match(pattern)?.[1];
    if (match) return match;
  }

  return "";
}

function buildGoogleDriveCandidates(fileId: string) {
  return [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`,
  ];
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
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
      return errorResponse("Invalid or malformed token", 401);
    }

    if (Date.now() > payload.exp) {
      return errorResponse("This note link has expired. Please go back and try opening it again.", 401);
    }

    const sourceUrl = payload.id.trim();
    if (!sourceUrl) {
      return errorResponse("The note source URL is missing.", 400);
    }

    const targetUrl = isDriveUrl(sourceUrl) ? normalizeGoogleDriveUrl(sourceUrl) : sourceUrl;

    const requestInit: RequestInit = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/pdf,image/*,*/*;q=0.8",
        "Referer": "https://drive.google.com/",
      },
      redirect: "follow",
    };

    let streamingResponse: Response | null = null;
    const fileId = extractGoogleDriveFileId(sourceUrl) || extractGoogleDriveFileId(targetUrl);
    const candidateUrls = isDriveUrl(sourceUrl)
      ? buildGoogleDriveCandidates(fileId || "")
      : [targetUrl];

    for (const candidate of candidateUrls) {
      if (!candidate) continue;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const candidateResponse = await fetch(candidate, { ...requestInit, signal: controller.signal });
        if (!candidateResponse.ok || !candidateResponse.body) {
          clearTimeout(timeoutId);
          continue;
        }

        const contentType = (candidateResponse.headers.get("content-type") || "application/pdf").toLowerCase();
        
        if (contentType.includes("text/html")) {
          if (isDriveUrl(candidate)) {
            const html = await candidateResponse.text();
            const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
            if (confirmMatch) {
              const confirmToken = confirmMatch[1];
              const bypassUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
              const bypassResponse = await fetch(bypassUrl, { ...requestInit });
              const bypassContentType = (bypassResponse.headers.get("content-type") || "").toLowerCase();
              if (bypassResponse.ok && !bypassContentType.includes("text/html") && !bypassContentType.includes("application/json")) {
                streamingResponse = bypassResponse;
                clearTimeout(timeoutId);
                break;
              }
            }
          }
          clearTimeout(timeoutId);
          continue;
        }

        if (contentType.includes("application/json")) {
          clearTimeout(timeoutId);
          continue;
        }

        // We can't easily check the magic number without consuming the stream, 
        // but for PDFs we can trust the content-type if it's not HTML/JSON 
        // or we can peek the first few bytes if we really wanted to.
        // For simplicity and streaming performance, we'll pipe the body directly.
        streamingResponse = candidateResponse;
        clearTimeout(timeoutId);
        break;
      } catch (err) {
        console.warn(`Failed to retrieve note from candidate ${candidate}:`, err);
      }
    }

    if (!streamingResponse || !streamingResponse.body) {
      return errorResponse("The note could not be retrieved. Please ensure the link is public and points to a valid PDF file.", 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    headers.set("Content-Disposition", "inline; filename=notes.pdf");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("X-Frame-Options", "SAMEORIGIN");

    return new NextResponse(streamingResponse.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("PDF Proxy Error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Server proxy error: ${errMsg}`, 500);
  }
}
