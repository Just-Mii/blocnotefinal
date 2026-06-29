import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session-options";
import type { SessionData } from "@/types";

export { sessionOptions };

export async function getSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  return session;
}

export async function requireAuth() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return null;
  }

  // Session timeout (default 60 min — overridable via app_settings)
  const timeoutMs = 60 * 60 * 1000;
  if (timeoutMs > 0 && Date.now() - session.lastActivity > timeoutMs) {
    await session.destroy();
    return null;
  }

  // Refresh last activity timestamp
  session.lastActivity = Date.now();
  await session.save();

  return session;
}
