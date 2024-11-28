const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Document = require("./models/document");
require('dotenv').config({path:"./config.env"})


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI
);

const activeUsers = {};


app.get("/", (req, res) => {
  res.send("Connected to the Collaborative Tool Backend");
});

// API Route to Fetch or Create Document
app.get('/documents/:id/versions', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).send('Document not found');
    res.json(document.versions);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Restore a specific version
app.post('/documents/:id/restore', async (req, res) => {
  try {
    const { versionIndex } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document || versionIndex < 0 || versionIndex >= document.versions.length) {
      return res.status(400).send('Invalid version');
    }

    document.content = document.versions[versionIndex].content;
    document.lastModified = Date.now();
    await document.save();

    res.json({ message: 'Document restored to the selected version' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

var newCont;
// WebSocket Connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-document", async (documentId,userId) => {
    socket.join(documentId);
    console.log(`User joined document: ${documentId}`);

    if (!activeUsers[documentId]) activeUsers[documentId] = [];
    if (!activeUsers[documentId].includes(userId)) {
      activeUsers[documentId].push(userId);
    }

    io.to(documentId).emit('user-presence', activeUsers[documentId]);


    try {
      const document = await Document.findById(documentId);
      socket.emit("load-document", document?.content || "");

      socket.on("send-changes", async (delta, oldDelta, range, userId) => {
        let currentContent = oldDelta.ops[0]?.insert || "";
        const newOps = delta.ops || [];
        let newContent = "";
        let cursor = 0;

        for (const op of newOps) {
          if (op.retain) {
            newContent += currentContent.slice(cursor, cursor + op.retain);
            cursor += op.retain;
          } else if (op.insert) {
            newContent += op.insert;
            console.log(range);
            if (cursor <= range.index) {
              range.index += op.insert.length; // Move cursor forward for inserted text
            }
            console.log(range);
          } else if (op.delete) {
            console.log(range);
            if (cursor <= range.index) {
              range.index -= Math.min(op.delete, range.index - cursor); // Adjust cursor for deleted text
            }
            console.log(range);
            cursor += op.delete;
          }
        }

        if (cursor < currentContent.length) {
          newContent += currentContent.slice(cursor);
        }

        console.log("Updated content:", newContent);

        // Save to the database
        // await Document.findByIdAndUpdate(documentId, { content: newContent, lastModified: Date.now() });

        const document = await Document.findById(documentId);
        if (document) {
          document.versions.push({
            content: document.content, // Save the old content as a version
            userId: userId,
            timestamp: Date.now(),
          });
          document.content = newContent; // Update the current content
          document.lastModified = Date.now();
          await document.save();
        }
        newCont = newContent;

        // Broadcast changes and updated cursor
        socket.broadcast.to(documentId).emit("receive-changes", delta);
        socket.broadcast
          .to(documentId)
          .emit("update-cursor", { range, userId });
      });

      socket.on("save-document", async (content) => {
        await Document.findByIdAndUpdate(documentId, {
          content,
          lastModified: Date.now(),
        });
      });
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start Server
const PORT = 5000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
