const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const user = await prisma.$withRetry(() =>
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      })
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    const isDbError =
      err.message?.includes("Can't reach database") ||
      err.message?.includes('connect') ||
      ['P1001', 'P1002', 'P1008'].includes(err.code);

    if (isDbError) {
      console.error('[AUTH] DB unreachable:', err.message);
      return res.status(503).json({
        error: 'Service temporarily unavailable. Please try again.',
        code: 'DB_UNAVAILABLE',
      });
    }

    console.error('[AUTH] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const requireWorkspaceMember = async (req, res, next) => {
  // workspaceId comes from /:workspaceId in the parent router
  const workspaceId = req.params.workspaceId;

  if (!workspaceId) {
    console.error('[AUTH] Missing workspaceId in request params. Check if mergeParams: true is set in your Router.');
    return res.status(400).json({ error: 'Missing workspaceId' });
  }

  try {
    const membership = await prisma.$withRetry(() =>
      prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId: req.user.id, workspaceId },
        },
        include: { workspace: true },
      })
    );

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    req.membership = membership;
    req.workspace = membership.workspace;
    next();
  } catch (err) {
    const isDbError =
      err.message?.includes("Can't reach database") ||
      ['P1001', 'P1002', 'P1008'].includes(err.code);

    if (isDbError) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'DB_UNAVAILABLE',
      });
    }
    next(err);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.membership?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireWorkspaceMember, requireAdmin };