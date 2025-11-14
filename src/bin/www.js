const app = require(`${__dirname}/../apps/app`);
const config = require("config");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const server = http.createServer(app);

const io = new Server(server);

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

const port = config.get("app.port") || process.env.PORT;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
