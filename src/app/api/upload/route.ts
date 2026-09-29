import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const dynamic = "force-dynamic";

// Ensure Cloudinary is configured with API keys from environment or fallback
const cloudinaryUrl = process.env.CLOUDINARY_URL || "cloudinary://837568356153353:UunJ-NNsGfH5qc-_ZAWGYrfavBs@iwse7szz";
const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
if (match) {
  cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY || match[1],
    api_secret: process.env.CLOUDINARY_API_SECRET || match[2],
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || match[3],
    secure: true,
  });
} else {
  cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY || "837568356153353",
    api_secret: process.env.CLOUDINARY_API_SECRET || "UunJ-NNsGfH5qc-_ZAWGYrfavBs",
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "iwse7szz",
    secure: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const originalName = file.name || "upload";
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Stream upload directly to Cloudinary without writing to local filesystem (works on Vercel)
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "companychat/uploads",
          resource_type: "auto",
          public_id: `${Date.now()}-${safeName}`,
        },
        (error, res) => {
          if (error) {
            reject(error);
          } else {
            resolve(res);
          }
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      fileName: originalName,
      fileType: file.type || "application/octet-stream",
    });
  } catch (e: any) {
    console.error("API Route upload error:", e);
    return NextResponse.json({ error: e.message || "Failed to upload file" }, { status: 500 });
  }
}
