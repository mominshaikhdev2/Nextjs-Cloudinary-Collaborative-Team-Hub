const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');
const { getIO } = require('../socket');

const getMilestones = async (req, res) => {
  const { goalId, workspaceId } = req.params;

  const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
  if (!goal) throw createError('Goal not found', 404);

  const milestones = await prisma.milestone.findMany({
    where: { goalId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ milestones });
};

const createMilestone = async (req, res) => {
  const { goalId, workspaceId } = req.params;
  const { title, progress, status } = req.body;

  const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
  if (!goal) throw createError('Goal not found', 404);

  const milestone = await prisma.milestone.create({
    data: {
      title,
      progress: progress || 0,
      status: status || 'PENDING',
      goalId,
    },
  });

  await logActivity({
    action: 'CREATED',
    entityType: 'MILESTONE',
    entityId: milestone.id,
    workspaceId,
    userId: req.user.id,
    metadata: { title, goalTitle: goal.title },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('milestone:created', { goalId, milestone });
  } catch (_) {}

  res.status(201).json({ milestone });
};

const updateMilestone = async (req, res) => {
  const { goalId, workspaceId, milestoneId } = req.params;
  const { title, progress, status } = req.body;

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, goalId, goal: { workspaceId } },
  });
  if (!milestone) throw createError('Milestone not found', 404);

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(title !== undefined && { title }),
      ...(progress !== undefined && { progress }),
      ...(status !== undefined && { status }),
    },
  });

  await logActivity({
    action: 'UPDATED',
    entityType: 'MILESTONE',
    entityId: milestoneId,
    workspaceId,
    userId: req.user.id,
    metadata: { title: updated.title, progress: updated.progress },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('milestone:updated', { goalId, milestone: updated });
  } catch (_) {}

  res.json({ milestone: updated });
};

const deleteMilestone = async (req, res) => {
  const { goalId, workspaceId, milestoneId } = req.params;

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, goalId, goal: { workspaceId } },
  });
  if (!milestone) throw createError('Milestone not found', 404);

  await prisma.milestone.delete({ where: { id: milestoneId } });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('milestone:deleted', { goalId, milestoneId });
  } catch (_) {}

  res.json({ message: 'Milestone deleted' });
};

module.exports = { getMilestones, createMilestone, updateMilestone, deleteMilestone };