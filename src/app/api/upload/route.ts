import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
// @ts-ignore
import formidable from "formidable";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    if (!req.body) {
      return NextResponse.json({ error: "No request body provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

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
      form.parse(mockReq as any, (err: any, fields: any, files: any) => {
        if (err) {
          return reject(err);
        }

        const fileArray = files.file;
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

        if (!file) {
          return reject(new Error("No file uploaded"));
        }

        const originalName = file.originalFilename || "upload";
        const uniqueName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const newPath = path.join(uploadDir, uniqueName);

        try {
          fs.renameSync(file.filepath, newPath);
          resolve({
            url: `/uploads/${uniqueName}`,
            fileName: originalName,
            fileType: file.mimetype || "application/octet-stream"
          });
        } catch (renameErr) {
          reject(renameErr);
        }
      });
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("API Route upload error:", e);
    return NextResponse.json({ error: e.message || "Failed to upload file" }, { status: 500 });
  }
}
