// routers/chatbot.js
const express = require("express");
const router = express.Router();
const { getBotReply } = require("../lib/botHelper");
const Chat = require("../apps/models/chat");

router.post("/ask", async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.json({ reply: "Vui lòng nhập câu hỏi." });

  try {
    const reply = await getBotReply(message);

    // Lưu chat vào DB
    await Chat.create({ userId, message, reply });

    res.json({ reply });
  } catch (err) {
    console.error("❌ Lỗi chatbot:", err);
    res.status(500).json({ reply: "Xin lỗi, hệ thống đang bận." });
  }
});

module.exports = router;
