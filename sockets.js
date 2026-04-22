const socketIo = require("socket.io");

// Mapa: alias -> { socket, connectedAt }
const userSockets = new Map();

let io;

function broadcastConnectedUsers() {
  const list = getConnectedUsers();
  io.emit("connectedUsers", list);
}

function getConnectedUsers() {
  return Array.from(userSockets.entries()).map(([alias, data]) => ({
    alias,
    connectedAt: data.connectedAt,
    socketId: data.socket.id,
  }));
}

function getIo() {
  return io;
}

function initializeSocket(server) {
  io = socketIo(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);

    // El frontend emite "register" con el alias del usuario luego de loguearse
    socket.on("register", (alias) => {
      console.log("register:", alias);
      userSockets.set(alias, { socket, connectedAt: new Date() });
      broadcastConnectedUsers();
    });

    // El frontend puede pedir la lista en cualquier momento
    socket.on("getConnectedUsers", () => {
      socket.emit("connectedUsers", getConnectedUsers());
    });

    socket.on("disconnect", () => {
      userSockets.forEach((data, alias) => {
        if (data.socket.id === socket.id) {
          userSockets.delete(alias);
        }
      });
      console.log(`Cliente desconectado: ${socket.id}`);
      broadcastConnectedUsers();
    });
  });
}

module.exports = { initializeSocket, userSockets, getConnectedUsers, getIo };
