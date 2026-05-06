const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireWorkspaceMember, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  inviteMember,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  leaveWorkspace,
  getPermissions,
  updatePermissions,
} = require('../controllers/workspaceController');

// Sub-route controllers
const goalRoutes = require('./goals');
const milestoneRoutes = require('./milestones');
const announcementRoutes = require('./announcements');
const actionItemRoutes = require('./actionItems');
const analyticsRoutes = require('./analytics');

const router = express.Router();



router.get('/invitations/:token/accept', acceptInvitation);


// WORKSPACE COLLECTION routes  /api/workspaces

router.get('/', authenticate, getMyWorkspaces);

router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().isLength({ max: 80 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('accentColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  validate,
  createWorkspace
);

const wsRouter = express.Router({ mergeParams: true });

wsRouter.use(authenticate, requireWorkspaceMember);

// Workspace itself 
wsRouter.get('/', getWorkspace);

wsRouter.patch(
  '/',
  requireAdmin,
  [
    body('name').optional().trim().notEmpty().isLength({ max: 80 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('accentColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  validate,
  updateWorkspace
);

wsRouter.delete('/', requireAdmin, deleteWorkspace);

// Members 
wsRouter.get('/members', getMembers);

wsRouter.post(
  '/invite',
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['ADMIN', 'MEMBER']),
  ],
  validate,
  inviteMember
);

wsRouter.patch(
  '/members/:userId/role',
  requireAdmin,
  [body('role').isIn(['ADMIN', 'MEMBER'])],
  validate,
  updateMemberRole
);

wsRouter.delete('/members/:userId', requireAdmin, removeMember);
wsRouter.post('/leave', leaveWorkspace);

// RBAC permissions 
wsRouter.get('/permissions', getPermissions);
wsRouter.patch(
  '/permissions',
  requireAdmin,
  [body('permissions').isObject()],
  validate,
  updatePermissions
);

// Sub-feature routers.
wsRouter.use('/goals', goalRoutes);
wsRouter.use('/announcements', announcementRoutes);
wsRouter.use('/action-items', actionItemRoutes);
wsRouter.use('/analytics', analyticsRoutes);

router.use('/:workspaceId', wsRouter);

module.exports = router;