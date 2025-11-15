const app = require(`${__dirname}/../apps/app`);
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Khi khách gửi tin nhắn
  socket.on("customerChat", (data) => {
    console.log("Message từ khách:", data);

    const reply = {
      sender: "customer",
      text: data.text,
      time: new Date().toLocaleTimeString(),
    };

    socket.broadcast.emit("receiveMessage", reply);
  });

  socket.on("adminChat", (data) => {
    console.log("Message từ admin:", data);

    const reply = {
      sender: "admin",
      text: data.text,
      time: new Date().toLocaleTimeString(),
    };

    socket.broadcast.emit("receiveMessage", reply);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
