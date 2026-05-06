const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

let io;
// Map of workspaceId / Set of { userId, socketId, name, avatarUrl }
const onlineUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // JWT Authentication middleware
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.name} (${socket.id})`);

    // Join workspace room 
    socket.on('workspace:join', async (workspaceId) => {
      const membership = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId } },
      });
      if (!membership) return;

      socket.join(`workspace:${workspaceId}`);
      socket.currentWorkspaceId = workspaceId;

      // Track online users per workspace
      if (!onlineUsers.has(workspaceId)) onlineUsers.set(workspaceId, new Map());
      onlineUsers.get(workspaceId).set(user.id, {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        socketId: socket.id,
      });

      // Broadcast updated online list
      io.to(`workspace:${workspaceId}`).emit(
        'workspace:online',
        Array.from(onlineUsers.get(workspaceId).values())
      );
    });

    // Leave workspace room 
    socket.on('workspace:leave', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      removeUserFromWorkspace(user.id, workspaceId);
    });

    // Join personal notification room
    socket.join(`user:${user.id}`);

    // Typing indicators
    socket.on('typing:start', ({ workspaceId, context }) => {
      socket.to(`workspace:${workspaceId}`).emit('typing:start', {
        userId: user.id,
        name: user.name,
        context,
      });
    });

    socket.on('typing:stop', ({ workspaceId, context }) => {
      socket.to(`workspace:${workspaceId}`).emit('typing:stop', {
        userId: user.id,
        context,
      });
    });

    // Disconnect 
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${user.name}`);
      if (socket.currentWorkspaceId) {
        removeUserFromWorkspace(user.id, socket.currentWorkspaceId);
      }
    });
  });

  return io;
};

const removeUserFromWorkspace = (userId, workspaceId) => {
  const wsUsers = onlineUsers.get(workspaceId);
  if (!wsUsers) return;

  wsUsers.delete(userId);
  if (wsUsers.size === 0) onlineUsers.delete(workspaceId);

  io.to(`workspace:${workspaceId}`).emit(
    'workspace:online',
    Array.from((onlineUsers.get(workspaceId) || new Map()).values())
  );
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };