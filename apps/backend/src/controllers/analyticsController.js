const prisma = require('../config/db');

const getDashboardStats = async (req, res) => {
  const { workspaceId } = req.params;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [
    totalGoals,
    completedGoals,
    totalActionItems,
    completedThisWeek,
    overdueItems,
    memberCount,
    atRiskGoals,
  ] = await Promise.all([
    prisma.goal.count({ where: { workspaceId } }),
    prisma.goal.count({ where: { workspaceId, status: 'COMPLETED' } }),
    prisma.actionItem.count({ where: { workspaceId } }),
    prisma.actionItem.count({
      where: { workspaceId, status: 'DONE', updatedAt: { gte: weekStart } },
    }),
    prisma.actionItem.count({
      where: { workspaceId, status: { not: 'DONE' }, dueDate: { lt: now } },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.goal.count({ where: { workspaceId, status: 'AT_RISK' } }),
  ]);

  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  res.json({
    stats: {
      totalGoals,
      completedGoals,
      atRiskGoals,
      completionRate,
      totalActionItems,
      completedThisWeek,
      overdueItems,
      memberCount,
    },
  });
};

const getGoalCompletionChart = async (req, res) => {
  const { workspaceId } = req.params;
  const { months = 6 } = req.query;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - parseInt(months));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const goals = await prisma.goal.findMany({
    where: { workspaceId, createdAt: { gte: startDate } },
    select: { status: true, createdAt: true, updatedAt: true },
  });

  // Group by month
  const monthMap = {};
  for (let i = parseInt(months) - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = { month: key, created: 0, completed: 0, inProgress: 0 };
  }

  goals.forEach((g) => {
    const createKey = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[createKey]) monthMap[createKey].created++;
    if (g.status === 'COMPLETED') {
      const updateKey = `${g.updatedAt.getFullYear()}-${String(g.updatedAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[updateKey]) monthMap[updateKey].completed++;
    }
    if (g.status === 'IN_PROGRESS') {
      if (monthMap[createKey]) monthMap[createKey].inProgress++;
    }
  });

  res.json({ chart: Object.values(monthMap) });
};

const exportWorkspaceCSV = async (req, res) => {
  const { workspaceId } = req.params;

  const [goals, actionItems, members] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId },
      include: { owner: { select: { name: true } }, milestones: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.actionItem.findMany({
      where: { workspaceId },
      include: { assignee: { select: { name: true } }, goal: { select: { title: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const rows = [];

  // Header
  rows.push(['Type', 'Title', 'Status', 'Owner/Assignee', 'Due Date', 'Created At', 'Extra'].join(','));

  goals.forEach((g) => {
    rows.push(
      [
        'Goal',
        `"${g.title.replace(/"/g, '""')}"`,
        g.status,
        `"${g.owner.name}"`,
        g.dueDate ? g.dueDate.toISOString().split('T')[0] : '',
        g.createdAt.toISOString().split('T')[0],
        `${g.milestones.length} milestones`,
      ].join(',')
    );
  });

  actionItems.forEach((a) => {
    rows.push(
      [
        'ActionItem',
        `"${a.title.replace(/"/g, '""')}"`,
        a.status,
        a.assignee ? `"${a.assignee.name}"` : 'Unassigned',
        a.dueDate ? a.dueDate.toISOString().split('T')[0] : '',
        a.createdAt.toISOString().split('T')[0],
        a.priority,
      ].join(',')
    );
  });

  members.forEach((m) => {
    rows.push(
      [
        'Member',
        `"${m.user.name}"`,
        m.role,
        `"${m.user.email}"`,
        '',
        m.joinedAt.toISOString().split('T')[0],
        '',
      ].join(',')
    );
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="workspace-export-${workspaceId}.csv"`);
  res.send(rows.join('\n'));
};

const getActivityFeed = async (req, res) => {
  const { workspaceId } = req.params;
  const { cursor, limit = 20, entityType } = req.query;

  const where = {
    workspaceId,
    ...(entityType && { entityType }),
  };

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit) + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = logs.length > parseInt(limit);
  if (hasMore) logs.pop();

  res.json({ logs, hasMore, nextCursor: hasMore ? logs[logs.length - 1].id : null });
};

module.exports = { getDashboardStats, getGoalCompletionChart, exportWorkspaceCSV, getActivityFeed };