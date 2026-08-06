// Custom server for Next.js + Socket.io
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

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

      form.parse(req, (err, fields, files) => {
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
          const fileUrl = `/uploads/${uniqueName}`;

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            url: fileUrl,
            fileName: originalName,
            fileType: file.mimetype
          }));
        } catch (renameErr) {
          console.error("Rename error:", renameErr);
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

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n🚀 CompanyChat running at http://${hostname}:${port}`);
    console.log(`⚡ Socket.io WebSocket server ready`);
  });
});
