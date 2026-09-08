import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
// @ts-ignore
import formidable from "formidable";
import fs from "fs";
import os from "os";
import { auth } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

// Ensure cloudinary is configured. It will automatically pick up the CLOUDINARY_URL env variable.
cloudinary.config({
  secure: true
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!req.body) {
      return NextResponse.json({ error: "No request body provided" }, { status: 400 });
    }

    // Use os.tmpdir() for temporary file storage to avoid EACCES issues on serverless environments
    const uploadDir = os.tmpdir();

    // Convert Web ReadableStream to Node.js Readable stream to bypass Next.js body limits
    const nodeStream = Readable.fromWeb(req.body as any);
    
    // Create a mock IncomingMessage shape for Formidable
    const mockReq = Object.assign(nodeStream, {
      headers: Object.fromEntries(req.headers.entries()),
      method: req.method,
    });

    const form = new formidable.IncomingForm({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
    });

    const data = await new Promise<{ url: string; fileName: string; fileType: string }>((resolve, reject) => {
      form.parse(mockReq as any, async (err: any, fields: any, files: any) => {
        if (err) {
          return reject(err);
        }

        const fileArray = files.file;
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

        if (!file) {
          return reject(new Error("No file uploaded"));
        }

        const originalName = file.originalFilename || "upload";
        
        try {
          // Determine the filename base (without extension) for Cloudinary
          const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
          
          // Upload the file to Cloudinary
          const result = await cloudinary.uploader.upload(file.filepath, {
            folder: "companychat/uploads",
            resource_type: "auto", // Automatically detects image, video, or raw file types
            public_id: `${Date.now()}-${safeName}`
          });
          
          // Delete the temporary file from the local disk
          fs.unlinkSync(file.filepath);

          resolve({
            url: result.secure_url,
            fileName: originalName,
            fileType: file.mimetype || "application/octet-stream"
          });
        } catch (uploadErr) {
          // Attempt to clean up temp file even if upload fails
          try {
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
          } catch (cleanupErr) {
            console.error("Cleanup error:", cleanupErr);
          }
          reject(uploadErr);
        }
      });
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("API Route upload error:", e);
    return NextResponse.json({ error: e.message || "Failed to upload file" }, { status: 500 });
  }
}
