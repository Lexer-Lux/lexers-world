import { NextResponse } from "next/server";
import { getFxRates } from "@/lib/fx";
import type { FxRatesErrorResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getFxRates();

    return NextResponse.json(payload, {
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-lexer-fx-source": payload.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live FX rates are unavailable.";
    const payload: FxRatesErrorResponse = { error: message };

    return NextResponse.json(payload, {
      status: 503,
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-lexer-fx-source": "error",
      },
    });
  }
}
