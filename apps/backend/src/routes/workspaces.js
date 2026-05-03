const express = require('express');
const { body, param } = require('express-validator');
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

const router = express.Router();

router.use(authenticate);

// ── Workspace CRUD ──────────────────────────────────────
router.post(
  '/',
  [
    body('name').trim().notEmpty().isLength({ max: 80 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('accentColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  validate,
  createWorkspace
);

router.get('/', getMyWorkspaces);
router.get('/:workspaceId', requireWorkspaceMember, getWorkspace);

router.patch(
  '/:workspaceId',
  requireWorkspaceMember,
  requireAdmin,
  [
    body('name').optional().trim().notEmpty().isLength({ max: 80 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('accentColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  validate,
  updateWorkspace
);

router.delete('/:workspaceId', requireWorkspaceMember, requireAdmin, deleteWorkspace);

// ── Members ─────────────────────────────────────────────
router.get('/:workspaceId/members', requireWorkspaceMember, getMembers);

router.post(
  '/:workspaceId/invite',
  requireWorkspaceMember,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['ADMIN', 'MEMBER']),
  ],
  validate,
  inviteMember
);

router.get('/invitations/:token/accept', acceptInvitation);

router.patch(
  '/:workspaceId/members/:userId/role',
  requireWorkspaceMember,
  requireAdmin,
  [body('role').isIn(['ADMIN', 'MEMBER'])],
  validate,
  updateMemberRole
);

router.delete('/:workspaceId/members/:userId', requireWorkspaceMember, requireAdmin, removeMember);
router.post('/:workspaceId/leave', requireWorkspaceMember, leaveWorkspace);

// ── RBAC Permissions ────────────────────────────────────
router.get('/:workspaceId/permissions', requireWorkspaceMember, getPermissions);
router.patch(
  '/:workspaceId/permissions',
  requireWorkspaceMember,
  requireAdmin,
  [body('permissions').isObject().withMessage('permissions must be an object')],
  validate,
  updatePermissions
);

module.exports = router;