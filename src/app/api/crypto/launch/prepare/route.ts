import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { normalizeLaunchDraft, cryptoLaunchPrepareSchema } from "@/features/crypto/lib/launchSchema";
import { prepareCryptoLaunch } from "@/features/crypto/server/launch/service";

export async function POST(request: Request) {
  try {
    const payload = cryptoLaunchPrepareSchema.parse(await request.json());
    const prepared = await prepareCryptoLaunch({
      draft: normalizeLaunchDraft(payload.draft),
      creatorPublicKey: payload.creatorPublicKey,
    });
    return NextResponse.json({ prepared });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invalid launch payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to prepare the Pump.fun launch.",
      },
      { status: 502 },
    );
  }
}
