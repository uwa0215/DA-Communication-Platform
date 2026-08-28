// Custom server for Next.js + Socket.io
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // Handle POST /api/upload directly (bypasses Next.js 4MB size limits for files up to 50MB)
    if (req.method === "POST" && pathname === "/api/upload") {
      const formidable = require("formidable");
      const fs = require("fs");
      const path = require("path");
      
      const uploadDir = path.join(__dirname, "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const form = new formidable.IncomingForm({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB limit
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Formidable upload error:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message || "Upload size limit exceeded" }));
          return;
        }

        const fileArray = files.file;
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

        if (!file) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No file uploaded" }));
          return;
        }

        const originalName = file.originalFilename || "upload";
        const uniqueName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const newPath = path.join(uploadDir, uniqueName);

        try {
          fs.renameSync(file.filepath, newPath);
          
          if (process.env.AWS_S3_BUCKET_NAME && process.env.AWS_S3_BUCKET_NAME !== "your_bucket_name") {
            // Upload to S3
            const s3Client = new S3Client({
              region: process.env.AWS_REGION || "us-east-1",
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            });
            const fileStream = fs.createReadStream(newPath);
            await s3Client.send(new PutObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: uniqueName,
              Body: fileStream,
              ContentType: file.mimetype,
            }));
            
            const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${uniqueName}`;
            
            // Cleanup local temp file
            fs.unlinkSync(newPath);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              url: fileUrl,
              fileName: originalName,
              fileType: file.mimetype
            }));
          } else {
            // Fallback to local file serving
            const fileUrl = `/uploads/${uniqueName}`;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              url: fileUrl,
              fileName: originalName,
              fileType: file.mimetype
            }));
          }
        } catch (renameErr) {
          console.error("Upload processing error:", renameErr);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to store uploaded file" }));
        }
      });
      return;
    }

    // Serve uploaded files dynamically (bypasses Next.js static cache limitations in production)
    if (pathname && pathname.startsWith("/uploads/")) {
      const fs = require("fs");
      const path = require("path");
      const filename = pathname.substring(9); // remove "/uploads/"
      const filePath = path.join(__dirname, "public", "uploads", decodeURIComponent(filename));

      fs.exists(filePath, (exists) => {
        if (exists) {
          const ext = path.extname(filePath).toLowerCase();
          let contentType = "application/octet-stream";
          if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
          else if (ext === ".png") contentType = "image/png";
          else if (ext === ".gif") contentType = "image/gif";
          else if (ext === ".svg") contentType = "image/svg+xml";
          else if (ext === ".webp") contentType = "image/webp";
          else if (ext === ".pdf") contentType = "application/pdf";

          res.writeHead(200, { "Content-Type": contentType });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        }
      });
      return;
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Configure Redis Adapter for horizontal scaling if REDIS_URL is provided
  if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`🔗 Socket.io Redis adapter connected`);
    }).catch((err) => {
      console.error(`Failed to connect to Redis for Socket.io adapter:`, err);
    });
  } else {
    console.log(`ℹ️ REDIS_URL not set, using default in-memory Socket.io adapter`);
  }

  // Make io accessible globally
  global.io = io;

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("join-user", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    socket.on("join-channel", (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("leave-channel", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("join-dm", (roomId) => {
      socket.join(`dm:${roomId}`);
    });

    socket.on("leave-dm", (roomId) => {
      socket.leave(`dm:${roomId}`);
    });

    socket.on("presence-update", ({ userId, status }) => {
      io.emit("user-presence", { userId, status });
    });

    socket.on("typing-start", ({ channelId, userId, userName }) => {
      socket.to(`channel:${channelId}`).emit("user-typing", { userId, userName });
    });

    socket.on("typing-stop", ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit("user-stop-typing", { userId });
    });

    socket.on("dm-typing-stop", ({ roomId, userId }) => {
      socket.to(`dm:${roomId}`).emit("user-stop-typing", { userId });
    });

    // WebRTC Signaling
    socket.on("call-user", (data) => {
      io.to(`user:${data.userToCall}`).emit("call-made", {
        offer: data.offer,
        callerSocket: socket.id,
        caller: data.caller,
        type: data.type
      });
    });

    socket.on("make-answer", (data) => {
      io.to(`user:${data.to}`).emit("answer-made", {
        answerSocket: socket.id,
        answer: data.answer
      });
    });
    
    socket.on("ice-candidate", (data) => {
      io.to(`user:${data.to}`).emit("ice-candidate", {
        candidate: data.candidate,
        fromSocket: socket.id
      });
    });

    socket.on("reject-call", (data) => {
      io.to(`user:${data.to}`).emit("call-rejected", {
        fromSocket: socket.id
      });
    });

    socket.on("end-call", (data) => {
      io.to(`user:${data.to}`).emit("call-ended", {
        fromSocket: socket.id
      });
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n🚀 CompanyChat running at http://${hostname}:${port}`);
    console.log(`⚡ Socket.io WebSocket server ready`);
  });
});
