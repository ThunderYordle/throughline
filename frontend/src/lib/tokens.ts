type Kind = "plan" | "review";

const key = (kind: Kind, id: string) => `throughline:${kind}:${id}`;

export function saveToken(kind: Kind, id: string, token: string): void {
  try {
    localStorage.setItem(key(kind, id), token);
  } catch {
    // Storage blocked: the edit link in the URL still works for this visit.
  }
}

export function getToken(kind: Kind, id: string): string | undefined {
  try {
    return localStorage.getItem(key(kind, id)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function takeTokenFromHash(kind: Kind, id: string): void {
  const match = window.location.hash.match(/t=([\w-]+)/);
  if (!match) return;
  saveToken(kind, id, match[1]);
  history.replaceState(null, "", window.location.pathname + window.location.search);
}