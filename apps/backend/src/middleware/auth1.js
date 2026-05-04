const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  // Check Authorization header first, then cookie
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify the user is a member of the workspace (attaches req.membership)
const requireWorkspaceMember = async (req, res, next) => {
  const { workspaceId } = req.params;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: req.user.id, workspaceId },
    },
    include: { workspace: true },
  });

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this workspace' });
  }

  req.membership = membership;
  req.workspace = membership.workspace;
  next();
};

// Must be ADMIN of the workspace
const requireAdmin = (req, res, next) => {
  if (req.membership?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireWorkspaceMember, requireAdmin };