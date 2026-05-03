const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireWorkspaceMember } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  addProgressUpdate,
  getProgressUpdates,
} = require('../controllers/goalController');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceMember);

const goalRules = [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK']),
  body('dueDate').optional().isISO8601(),
  body('ownerId').optional().isString(),
];

router.get('/:workspaceId/goals', getGoals);
router.post('/:workspaceId/goals', goalRules, validate, createGoal);
router.get('/:workspaceId/goals/:goalId', getGoal);
router.patch('/:workspaceId/goals/:goalId', goalRules, validate, updateGoal);
router.delete('/:workspaceId/goals/:goalId', deleteGoal);

// Progress updates (activity feed on a goal)
router.get('/:workspaceId/goals/:goalId/updates', getProgressUpdates);
router.post(
  '/:workspaceId/goals/:goalId/updates',
  [body('content').trim().notEmpty().isLength({ max: 1000 })],
  validate,
  addProgressUpdate
);

module.exports = router;