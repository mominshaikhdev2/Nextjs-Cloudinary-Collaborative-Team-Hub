const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const milestoneRoutes = require('./milestones');

const {
  getGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  addProgressUpdate,
  getProgressUpdates,
} = require('../controllers/goalController');

// mergeParams: true so we can access req.params.workspaceId
const router = express.Router({ mergeParams: true });

// Auth + membership already applied by parent wsRouter — no need to repeat

const goalRules = [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK']),
  body('dueDate').optional().isISO8601(),
  body('ownerId').optional().isString(),
];

// /api/workspaces/:workspaceId/goals
router.get('/', getGoals);
router.post('/', goalRules, validate, createGoal);

// /api/workspaces/:workspaceId/goals/:goalId
router.get('/:goalId', getGoal);
router.patch('/:goalId', goalRules, validate, updateGoal);
router.delete('/:goalId', deleteGoal);

// /api/workspaces/:workspaceId/goals/:goalId/updates
router.get('/:goalId/updates', getProgressUpdates);
router.post(
  '/:goalId/updates',
  [body('content').trim().notEmpty().isLength({ max: 1000 })],
  validate,
  addProgressUpdate
);

// Nest milestones under goals
router.use('/:goalId/milestones', milestoneRoutes);

module.exports = router;