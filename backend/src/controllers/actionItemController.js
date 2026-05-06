const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notifications');
const { getIO } = require('../socket');

const itemInclude = {
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  goal: { select: { id: true, title: true } },
};

const getActionItems = async (req, res) =>
{
  const { workspaceId } = req.params;
  const { status, priority, assigneeId, goalId, view = 'kanban' } = req.query;

  const where = {
    workspaceId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
    ...(goalId && { goalId }),
  };

  const actionItems = await prisma.actionItem.findMany({
    where,
    include: itemInclude,
    orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });

  if (view === 'kanban')
  {
    const columns = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    actionItems.forEach((item) =>
    {
      if (columns[item.status]) columns[item.status].push(item);
    });
    return res.json({ columns });
  }

  res.json({ actionItems });
};

const createActionItem = async (req, res) =>
{
  const { workspaceId } = req.params;
  const { title, priority, status, dueDate, assigneeId, goalId } = req.body;

  if (assigneeId)
  {
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: assigneeId, workspaceId } },
    });
    if (!isMember) throw createError('Assignee is not a workspace member', 400);
  }

  if (goalId)
  {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
    if (!goal) throw createError('Goal not found in workspace', 400);
  }

  // Get max order — aggregate works for both PostgreSQL and MongoDB
  const maxOrder = await prisma.actionItem.aggregate({
    _max: { order: true },
    where: { workspaceId, status: status || 'TODO' },
  });

  const item = await prisma.actionItem.create({
    data: {
      title,
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
      workspaceId,
      assigneeId: assigneeId || null,
      goalId: goalId || null,
      order: (maxOrder._max.order || 0) + 1,
    },
    include: itemInclude,
  });

  await logActivity({
    action: 'CREATED', entityType: 'ACTION_ITEM', entityId: item.id,
    workspaceId, userId: req.user.id, metadata: { title, status: item.status },
  });

  if (assigneeId && assigneeId !== req.user.id)
  {
    await createNotification({
      userId: assigneeId,
      type: 'ASSIGNMENT',
      content: `${req.user.name} assigned you a task: "${title}"`,
      metadata: { actionItemId: item.id, workspaceId },
    });
  }

  try { getIO().to(`workspace:${workspaceId}`).emit('actionItem:created', item); } catch (_) { }

  res.status(201).json({ item });
};

const updateActionItem = async (req, res) =>
{
  const { workspaceId, itemId } = req.params;
  const { title, priority, status, dueDate, assigneeId, goalId, order } = req.body;

  const existing = await prisma.actionItem.findFirst({ where: { id: itemId, workspaceId } });
  if (!existing) throw createError('Action item not found', 404);

  if (assigneeId)
  {
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: assigneeId, workspaceId } },
    });
    if (!isMember) throw createError('Assignee is not a workspace member', 400);
  }

  const item = await prisma.actionItem.update({
    where: { id: itemId },
    data: {
      ...(title !== undefined && { title }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(goalId !== undefined && { goalId: goalId || null }),
      ...(order !== undefined && { order }),
    },
    include: itemInclude,
  });

  await logActivity({
    action: 'UPDATED', entityType: 'ACTION_ITEM', entityId: itemId,
    workspaceId, userId: req.user.id, metadata: { title: item.title, status: item.status },
  });

  if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== req.user.id)
  {
    await createNotification({
      userId: assigneeId,
      type: 'ASSIGNMENT',
      content: `${req.user.name} assigned you a task: "${item.title}"`,
      metadata: { actionItemId: item.id, workspaceId },
    });
  }

  try { getIO().to(`workspace:${workspaceId}`).emit('actionItem:updated', item); } catch (_) { }

  res.json({ item });
};

const deleteActionItem = async (req, res) =>
{
  const { workspaceId, itemId } = req.params;

  const item = await prisma.actionItem.findFirst({ where: { id: itemId, workspaceId } });
  if (!item) throw createError('Action item not found', 404);

  await prisma.actionItem.delete({ where: { id: itemId } });

  await logActivity({
    action: 'DELETED', entityType: 'ACTION_ITEM', entityId: itemId,
    workspaceId, userId: req.user.id, metadata: { title: item.title },
  });

  try { getIO().to(`workspace:${workspaceId}`).emit('actionItem:deleted', { id: itemId }); } catch (_) { }

  res.json({ message: 'Action item deleted' });
};


const reorderActionItems = async (req, res) =>
{
  const { workspaceId } = req.params;
  const { items } = req.body; // [{ id, status, order }]

  if (!Array.isArray(items)) throw createError('items must be an array', 400);

  const updates = items.map(({ id, status, order }) =>
    prisma.actionItem.updateMany({
      where: { id, workspaceId },
      data: { status, order },
    })
  );

  try
  {

    await prisma.$transaction(updates);
  } catch (txErr)
  {
    // Fallback: sequential updates (MongoDB standalone without replica set)
    console.warn('[ActionItems] Transaction failed — falling back to sequential updates:', txErr.message);
    for (const update of updates)
    {
      await update;
    }
  }

  const updated = await prisma.actionItem.findMany({
    where: { workspaceId },
    include: itemInclude,
    orderBy: [{ status: 'asc' }, { order: 'asc' }],
  });

  try { getIO().to(`workspace:${workspaceId}`).emit('actionItems:reordered', updated); } catch (_) { }

  res.json({ message: 'Reordered', items: updated });
};

module.exports = {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  reorderActionItems,
};
