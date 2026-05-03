const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireWorkspaceMember } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  reorderActionItems,
} = require('../controllers/actionItemController');

const router = express.Router({ mergeParams: true });
router.use(authenticate, requireWorkspaceMember);

const actionItemRules = [
  body('title').trim().notEmpty().isLength({ max: 300 }),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  body('dueDate').optional().isISO8601().toDate(),
  body('assigneeId').optional().isString(),
  body('goalId').optional().isString(),
];

router.get('/:workspaceId/action-items', getActionItems);
router.post('/:workspaceId/action-items', actionItemRules, validate, createActionItem);
router.patch('/:workspaceId/action-items/:itemId', actionItemRules, validate, updateActionItem);
router.delete('/:workspaceId/action-items/:itemId', deleteActionItem);
router.patch('/:workspaceId/action-items/reorder', reorderActionItems);

module.exports = router;