import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("google-site-verification: google83f8616f6a5b1974.html", {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}