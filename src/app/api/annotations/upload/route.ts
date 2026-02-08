import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50MB
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 50MB" },
        { status: 400 }
      );
    }

    const extension =
      EXTENSION_BY_MIME[file.type] ||
      file.name.split(".").pop()?.toLowerCase() ||
      "png";

    const fileName = `${randomUUID()}.${extension}`;
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "annotations"
    );
    const filePath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/annotations/${fileName}`,
    });
  } catch (error) {
    console.error("Annotation image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
