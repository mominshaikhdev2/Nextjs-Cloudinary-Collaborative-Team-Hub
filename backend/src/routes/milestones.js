const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/milestoneController');

// mergeParams: true — inherits workspaceId + goalId from parent
const router = express.Router({ mergeParams: true });

const milestoneRules = [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
];

// /api/workspaces/:workspaceId/goals/:goalId/milestones
router.get('/', getMilestones);
router.post('/', milestoneRules, validate, createMilestone);

// /api/workspaces/:workspaceId/goals/:goalId/milestones/:milestoneId
router.patch('/:milestoneId', milestoneRules, validate, updateMilestone);
router.delete('/:milestoneId', deleteMilestone);

module.exports = router;