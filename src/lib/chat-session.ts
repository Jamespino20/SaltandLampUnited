const KEY = "slu-session-id";

export function getChatSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid: string | null = null;
  try {
    sid = localStorage.getItem(KEY);
  } catch {
    sid = null;
  }
  if (!sid) {
    sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 24)
        : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    try {
      localStorage.setItem(KEY, sid);
    } catch {
      // private mode — session-only id
    }
  }
  return sid;
}
