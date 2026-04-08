type MediaTokenKind = "yt" | "note";

export async function createMediaToken(source: string, kind: MediaTokenKind) {
  const response = await fetch("/api/media/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: source, kind }),
  });

  if (!response.ok) {
    throw new Error("Failed to create media token");
  }

  const data = (await response.json().catch(() => ({}))) as { token?: string };
  if (!data.token) {
    throw new Error("Missing media token");
  }

  return data.token;
}
