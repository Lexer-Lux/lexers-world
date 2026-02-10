import { createClient } from "@supabase/supabase-js";
import type { ViewerAuthStatus } from "@/lib/types";

function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

function normalizeTwitterUsername(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim().replace(/^@+/, "").toLowerCase();
  if (!trimmed) {
    return null;
  }

  return /^[a-z0-9_]{1,15}$/.test(trimmed) ? trimmed : null;
}

function getConfiguredAllowlist(): Set<string> {
  const configured = process.env.INSIDER_ALLOWLIST?.trim();
  if (!configured) {
    return new Set();
  }

  return new Set(
    configured
      .split(",")
      .map((entry) => normalizeTwitterUsername(entry))
      .filter((entry): entry is string => Boolean(entry))
  );
}

async function isApprovedByDatabase(username: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("allowlist")
    .select("twitter_username")
    .ilike("twitter_username", username);

  if (error) {
    return false;
  }

  return (data ?? []).some((row) => normalizeTwitterUsername(row.twitter_username) === username);
}

export async function resolveViewerAuthStatus(request: Request): Promise<ViewerAuthStatus> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      isAuthenticated: false,
      isApproved: false,
      twitterUsername: null,
    };
  }

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return {
      isAuthenticated: false,
      isApproved: false,
      twitterUsername: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      isAuthenticated: false,
      isApproved: false,
      twitterUsername: null,
    };
  }

  const twitterUsername =
    normalizeTwitterUsername(user.user_metadata?.user_name) ||
    normalizeTwitterUsername(user.user_metadata?.preferred_username) ||
    normalizeTwitterUsername(user.user_metadata?.username);

  if (!twitterUsername) {
    return {
      isAuthenticated: true,
      isApproved: false,
      twitterUsername: null,
    };
  }

  const configuredAllowlist = getConfiguredAllowlist();
  const approvedByConfig = configuredAllowlist.has(twitterUsername);
  const approvedByDatabase = await isApprovedByDatabase(twitterUsername);

  return {
    isAuthenticated: true,
    isApproved: approvedByConfig || approvedByDatabase,
    twitterUsername,
  };
}

export function getApprovalMessage(authStatus: ViewerAuthStatus): string {
  if (!authStatus.isAuthenticated) {
    return "Outsider access only. Sign in with X to request insider approval.";
  }

  if (authStatus.isApproved) {
    return authStatus.twitterUsername
      ? `Insider approved for @${authStatus.twitterUsername}.`
      : "Insider approved.";
  }

  if (authStatus.twitterUsername) {
    return `Signed in as @${authStatus.twitterUsername}. Awaiting allowlist approval.`;
  }

  return "Signed in, but no Twitter handle was found. Awaiting manual approval.";
}
