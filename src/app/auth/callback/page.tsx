"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type CallbackStatus = "loading" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("Finalizing sign-in...");

  const cardStyle = useMemo(
    () => ({
      background: "var(--surface-card)",
      border: "1px solid var(--border-cyan)",
      boxShadow: "0 0 24px rgba(0, 240, 255, 0.16), 0 0 40px rgba(176, 38, 255, 0.12)",
    }),
    []
  );

  useEffect(() => {
    const completeOAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorDescription = params.get("error_description");

      if (errorDescription) {
        setStatus("error");
        setMessage(errorDescription);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Sign-in callback did not include an authorization code.");
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setStatus("error");
          setMessage("Sign in is unavailable on this deployment (missing Supabase public env vars).");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        router.replace("/");
      } catch {
        setStatus("error");
        setMessage("Unable to finish sign-in right now. Please try again.");
      }
    };

    completeOAuth();
  }, [router]);

  return (
    <main className="min-h-screen w-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl p-6 panel-shell benday-overlay" style={cardStyle}>
        <h1 className="font-mono text-xl uppercase tracking-wide text-neon-cyan" style={{ textShadow: "var(--glow-cyan-sm)" }}>
          {status === "loading" ? "Authenticating" : "Sign-in Failed"}
        </h1>
        <p className="mt-3 text-sm font-mono" style={{ color: "var(--copy-secondary)" }}>
          {message}
        </p>
        {status === "error" && (
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-5 rounded-md px-3 py-2 text-xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
            style={{
              color: "var(--neon-pink)",
              border: "1px solid var(--border-pink)",
              background: "rgba(255, 45, 117, 0.08)",
            }}
          >
            Back to map
          </button>
        )}
      </section>
    </main>
  );
}
