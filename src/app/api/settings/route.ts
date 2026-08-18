import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAppBranding, setAppBranding } from "@/lib/settings";
import { isValidHexColor } from "@/lib/color";

export async function GET() {
  return NextResponse.json(getAppBranding());
}

// Base64 data URI, capped well under SQLite's practical comfort zone for a
// single TEXT value -- 2MB of raw image data (~2.7MB once base64-encoded).
const MAX_LOGO_BASE64_LENGTH = 2_800_000;

const updateSchema = z.object({
  accentColor: z
    .string()
    .refine(isValidHexColor, "Must be a hex color like #e8632a")
    .nullable()
    .optional(),
  logoDataUri: z
    .string()
    .max(MAX_LOGO_BASE64_LENGTH, "Logo image is too large (max ~2MB)")
    .regex(/^data:image\/(png|jpeg|jpg|svg\+xml|webp|gif);base64,/, "Must be an image data URI")
    .nullable()
    .optional(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  setAppBranding(parsed.data);
  return NextResponse.json(getAppBranding());
}
