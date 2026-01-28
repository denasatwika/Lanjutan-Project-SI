import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request) {
  try {
    const { image } = await req.json() as { image?: string };
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image payload" }, { status: 400 });
    }
    const base64 = image.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    const filename = `checkin-${Date.now()}.png`;
    const filepath = path.join(process.cwd(), "public", filename);
    await writeFile(filepath, buffer);
    return NextResponse.json({ ok: true, filename });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
