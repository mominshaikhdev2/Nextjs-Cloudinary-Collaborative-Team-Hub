const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const getNotifications = async (req, res) => {
  const { cursor, limit = 20, unreadOnly } = req.query;

  const where = {
    userId: req.user.id,
    ...(unreadOnly === 'true' && { isRead: false }),
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit) + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = notifications.length > parseInt(limit);
  if (hasMore) notifications.pop();

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });

  res.json({ notifications, hasMore, unreadCount });
};

const markRead = async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!notification) throw createError('Notification not found', 404);

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json({ notification: updated });
};

const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All notifications marked as read' });
};

const deleteNotification = async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!notification) throw createError('Notification not found', 404);

  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ message: 'Notification deleted' });
};

module.exports = { getNotifications, markRead, markAllRead, deleteNotification };