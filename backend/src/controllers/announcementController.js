const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');
const { processMentions } = require('../utils/notifications');
const { getIO } = require('../socket');

const announcementSelect = {
  id: true,
  title: true,
  content: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
  reactions: {
    include: { user: { select: { id: true, name: true } } },
  },
  _count: { select: { comments: true } },
};

const getAnnouncements = async (req, res) => {
  const { workspaceId } = req.params;
  const { cursor, limit = 15 } = req.query;

  const announcements = await prisma.announcement.findMany({
    where: { workspaceId },
    select: announcementSelect,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: parseInt(limit) + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = announcements.length > parseInt(limit);
  if (hasMore) announcements.pop();

  res.json({ announcements, hasMore, nextCursor: hasMore ? announcements[announcements.length - 1].id : null });
};

const createAnnouncement = async (req, res) => {
  const { workspaceId } = req.params;
  const { title, content } = req.body;

  const announcement = await prisma.announcement.create({
    data: { title, content, workspaceId, authorId: req.user.id },
    select: announcementSelect,
  });

  await logActivity({
    action: 'CREATED',
    entityType: 'ANNOUNCEMENT',
    entityId: announcement.id,
    workspaceId,
    userId: req.user.id,
    metadata: { title },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:created', announcement);
  } catch (_) {}

  res.status(201).json({ announcement });
};

const updateAnnouncement = async (req, res) => {
  const { workspaceId, announcementId } = req.params;
  const { title, content } = req.body;

  const existing = await prisma.announcement.findFirst({ where: { id: announcementId, workspaceId } });
  if (!existing) throw createError('Announcement not found', 404);

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
    },
    select: announcementSelect,
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:updated', announcement);
  } catch (_) {}

  res.json({ announcement });
};

const deleteAnnouncement = async (req, res) => {
  const { workspaceId, announcementId } = req.params;

  const existing = await prisma.announcement.findFirst({ where: { id: announcementId, workspaceId } });
  if (!existing) throw createError('Announcement not found', 404);

  await prisma.announcement.delete({ where: { id: announcementId } });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:deleted', { id: announcementId });
  } catch (_) {}

  res.json({ message: 'Announcement deleted' });
};

const togglePin = async (req, res) => {
  const { workspaceId, announcementId } = req.params;

  const existing = await prisma.announcement.findFirst({ where: { id: announcementId, workspaceId } });
  if (!existing) throw createError('Announcement not found', 404);

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: { isPinned: !existing.isPinned },
    select: announcementSelect,
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:updated', announcement);
  } catch (_) {}

  res.json({ announcement });
};

const addReaction = async (req, res) => {
  const { workspaceId, announcementId } = req.params;
  const { emoji } = req.body;

  // Toggle: if exists remove, else add
  const existing = await prisma.announcementReaction.findUnique({
    where: { announcementId_userId_emoji: { announcementId, userId: req.user.id, emoji } },
  });

  let reaction;
  if (existing) {
    await prisma.announcementReaction.delete({ where: { id: existing.id } });
    reaction = null;
  } else {
    const ann = await prisma.announcement.findFirst({ where: { id: announcementId, workspaceId } });
    if (!ann) throw createError('Announcement not found', 404);

    reaction = await prisma.announcementReaction.create({
      data: { emoji, announcementId, userId: req.user.id },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  // Get updated reactions
  const reactions = await prisma.announcementReaction.findMany({
    where: { announcementId },
    include: { user: { select: { id: true, name: true } } },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:reaction', { announcementId, reactions });
  } catch (_) {}

  res.json({ reactions, added: !!reaction });
};

const removeReaction = async (req, res) => {
  const { workspaceId, announcementId, emoji } = req.params;

  await prisma.announcementReaction.deleteMany({
    where: { announcementId, userId: req.user.id, emoji },
  });

  const reactions = await prisma.announcementReaction.findMany({
    where: { announcementId },
    include: { user: { select: { id: true, name: true } } },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:reaction', { announcementId, reactions });
  } catch (_) {}

  res.json({ reactions });
};

const getComments = async (req, res) => {
  const { workspaceId, announcementId } = req.params;

  const comments = await prisma.comment.findMany({
    where: { announcementId, announcement: { workspaceId } },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ comments });
};

const addComment = async (req, res) => {
  const { workspaceId, announcementId } = req.params;
  const { content } = req.body;

  const ann = await prisma.announcement.findFirst({ where: { id: announcementId, workspaceId } });
  if (!ann) throw createError('Announcement not found', 404);

  const comment = await prisma.comment.create({
    data: { content, announcementId, authorId: req.user.id },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Handle @mentions
  await processMentions({
    content,
    authorId: req.user.id,
    workspaceId,
    authorName: req.user.name,
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:comment', { announcementId, comment });
  } catch (_) {}

  res.status(201).json({ comment });
};

const deleteComment = async (req, res) => {
  const { workspaceId, announcementId, commentId } = req.params;

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, announcementId, announcement: { workspaceId } },
  });
  if (!comment) throw createError('Comment not found', 404);

  if (comment.authorId !== req.user.id && req.membership.role !== 'ADMIN') {
    throw createError('Insufficient permissions', 403);
  }

  await prisma.comment.delete({ where: { id: commentId } });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('announcement:comment_deleted', { announcementId, commentId });
  } catch (_) {}

  res.json({ message: 'Comment deleted' });
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  addReaction,
  removeReaction,
  getComments,
  addComment,
  deleteComment,
};