const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

class Server {
  constructor() {
    this.activeSockets = [];
    this.DEFAULT_PORT = 5000;
    this.initialize();
  }

  initialize() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.configureRoutes();
    this.handleSocketConnection();
  }

  configureApp() {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  configureRoutes() {
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../public/index.html"));
    });
  }

  handleSocketConnection() {
    this.io.on("connection", socket => {
      const existingSocket = this.activeSockets.find(
        existingSocket => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
          )
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id]
        });
      }

      socket.on("call-user", (data) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id
        });
      });

      socket.on("make-answer", (data) => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer
        });
      });

      socket.on("reject-call", (data) => {
        socket.to(data.from).emit("call-rejected", {
          socket: socket.id
        });
      });

      socket.on("disconnect", () => {
        this.activeSockets = this.activeSockets.filter(
          existingSocket => existingSocket !== socket.id
        );
        socket.broadcast.emit("remove-user", {
          socketId: socket.id
        });
      });
    });
  }

  listen(callback) {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }
}

module.exports = Server;
