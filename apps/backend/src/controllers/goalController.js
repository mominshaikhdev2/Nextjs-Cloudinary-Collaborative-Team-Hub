const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');
const { getIO } = require('../socket');

const getGoals = async (req, res) => {
  const { workspaceId } = req.params;
  const { status, ownerId, search } = req.query;

  const where = {
    workspaceId,
    ...(status && { status }),
    ...(ownerId && { ownerId }),
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
  };

  const goals = await prisma.goal.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      milestones: { orderBy: { createdAt: 'asc' } },
      _count: { select: { actionItems: true, progressUpdates: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ goals });
};

const createGoal = async (req, res) => {
  const { workspaceId } = req.params;
  const { title, description, status, dueDate, ownerId } = req.body;

  const goal = await prisma.goal.create({
    data: {
      title,
      description,
      status: status || 'NOT_STARTED',
      dueDate: dueDate ? new Date(dueDate) : null,
      workspaceId,
      ownerId: ownerId || req.user.id,
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      milestones: true,
    },
  });

  await logActivity({
    action: 'CREATED',
    entityType: 'GOAL',
    entityId: goal.id,
    workspaceId,
    userId: req.user.id,
    metadata: { title: goal.title },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('goal:created', goal);
  } catch (_) {}

  res.status(201).json({ goal });
};

const getGoal = async (req, res) => {
  const { workspaceId, goalId } = req.params;

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, workspaceId },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      milestones: { orderBy: { createdAt: 'asc' } },
      actionItems: {
        include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { order: 'asc' },
      },
      progressUpdates: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!goal) throw createError('Goal not found', 404);
  res.json({ goal });
};

const updateGoal = async (req, res) => {
  const { workspaceId, goalId } = req.params;
  const { title, description, status, dueDate, ownerId } = req.body;

  const existing = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
  if (!existing) throw createError('Goal not found', 404);

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(ownerId !== undefined && { ownerId }),
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      milestones: true,
    },
  });

  await logActivity({
    action: 'UPDATED',
    entityType: 'GOAL',
    entityId: goalId,
    workspaceId,
    userId: req.user.id,
    metadata: { title: goal.title, status: goal.status },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('goal:updated', goal);
  } catch (_) {}

  res.json({ goal });
};

const deleteGoal = async (req, res) => {
  const { workspaceId, goalId } = req.params;

  const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
  if (!goal) throw createError('Goal not found', 404);

  // Only owner or admin can delete
  if (goal.ownerId !== req.user.id && req.membership.role !== 'ADMIN') {
    throw createError('Insufficient permissions', 403);
  }

  await prisma.goal.delete({ where: { id: goalId } });

  await logActivity({
    action: 'DELETED',
    entityType: 'GOAL',
    entityId: goalId,
    workspaceId,
    userId: req.user.id,
    metadata: { title: goal.title },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('goal:deleted', { id: goalId });
  } catch (_) {}

  res.json({ message: 'Goal deleted' });
};

const getProgressUpdates = async (req, res) => {
  const { workspaceId, goalId } = req.params;
  const { cursor, limit = 20 } = req.query;

  const updates = await prisma.progressUpdate.findMany({
    where: { goalId, goal: { workspaceId } },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit) + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = updates.length > parseInt(limit);
  if (hasMore) updates.pop();

  res.json({ updates, hasMore, nextCursor: hasMore ? updates[updates.length - 1].id : null });
};

const addProgressUpdate = async (req, res) => {
  const { workspaceId, goalId } = req.params;
  const { content } = req.body;

  const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
  if (!goal) throw createError('Goal not found', 404);

  const update = await prisma.progressUpdate.create({
    data: { content, goalId, userId: req.user.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await logActivity({
    action: 'PROGRESS_UPDATE',
    entityType: 'GOAL',
    entityId: goalId,
    workspaceId,
    userId: req.user.id,
    metadata: { preview: content.slice(0, 80) },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('goal:progress_update', { goalId, update });
  } catch (_) {}

  res.status(201).json({ update });
};

module.exports = { getGoals, createGoal, getGoal, updateGoal, deleteGoal, getProgressUpdates, addProgressUpdate };