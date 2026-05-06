const prisma = require('../config/db');
const { getIO } = require('../socket');

const logActivity = async ({ action, entityType, entityId, workspaceId, userId, metadata }) => {
  const log = await prisma.activityLog.create({
    data: { action, entityType, entityId, workspaceId, userId, metadata },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Emit in real-time to workspace room
  try {
    const io = getIO();
    io.to(`workspace:${workspaceId}`).emit('activity:new', log);
  } catch (_) {}

  return log;
};

module.exports = { logActivity };