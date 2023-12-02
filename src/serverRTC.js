const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

class RTCServer {
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

  // handleSocketConnection() {
  //   this.io.on("connection", socket => {
  //     if (!this.activeSockets.includes(socket.id)) {
  //       this.activeSockets.push(socket.id);

  //       console.log('ActiveSockets: ', this.activeSockets);

  //       socket.emit("refresh-users", {
  //         users: this.activeSockets.filter(id => id !== socket.id)
  //       });

  //       socket.broadcast.emit("refresh-users", {
  //         users: [socket.id]
  //       });
  //     }

  //     socket.on("init-call", (data) => {
  //       socket.to(data.to).emit("incoming-call", {
  //         offer: data.offer,
  //         userId: socket.id
  //       });
  //     });

  //     socket.on("call-response", ({ answer, target }) => {
  //       socket.to(target).emit("call-answered", {
  //         answer: answer,
  //         from: socket.id
  //       });
  //     });

  //     socket.on("decline-call", (data) => {
  //       socket.to(data.caller).emit("call-declined", {
  //         userId: socket.id
  //       });
  //     });

  //     socket.on("disconnect", () => {
  //       this.activeSockets = this.activeSockets.filter(id => id !== socket.id);
  //       socket.broadcast.emit("user-left", {
  //         userId: socket.id
  //       });
  //     });
  //   });
  // }


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

module.exports = RTCServer;
