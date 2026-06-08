const SESSION_KEY = "sf_session";

export type UserRole = "ADMIN" | "AGENT";

export type SessionUser = {
  userId: string;
  tenantId: string;
  role: UserRole;
  /** Present when the user joined via invite (required for agent queue). */
  employeeId?: string;
};

export function loadSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.userId || !parsed?.tenantId || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function mergeSession(partial: Partial<SessionUser>): SessionUser | null {
  const cur = loadSession();
  if (!cur) return null;
  const next = { ...cur, ...partial };
  saveSession(next);
  return next;
}
