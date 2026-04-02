import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cryptoLaunchSubmitSchema } from "@/features/crypto/lib/launchSchema";
import { submitCryptoLaunch } from "@/features/crypto/server/launch/service";

export async function POST(request: Request) {
  try {
    const payload = cryptoLaunchSubmitSchema.parse(await request.json());
    const result = await submitCryptoLaunch(payload);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invalid launch submission payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to submit the Pump.fun launch.",
      },
      { status: 502 },
    );
  }
}
