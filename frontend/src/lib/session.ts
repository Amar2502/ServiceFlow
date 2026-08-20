const SESSION_KEY = "sf_session";

export type UserRole = "ADMIN" | "AGENT";

export type SessionUser = {
  userId: string;
  tenantId: string;
  role: UserRole;
  /** Present when the user joined via invite (required for agent queue). */
  employeeId?: string;
  routingMode?: "DEPARTMENT" | "EMPLOYEE";
  tenantName?: string;
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
  if (typeof window === "undefined") return;
  const json = JSON.stringify(user);
  localStorage.setItem(SESSION_KEY, json);
  // Also set cookie so Next.js proxy / middleware can inspect authentication status on server requests
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(json)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  // Clear cookie
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function mergeSession(partial: Partial<SessionUser>): SessionUser | null {
  const cur = loadSession();
  if (!cur) return null;
  const next = { ...cur, ...partial };
  saveSession(next);
  return next;
}
