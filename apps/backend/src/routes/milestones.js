const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireWorkspaceMember } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/milestoneController');

const router = express.Router({ mergeParams: true });
router.use(authenticate, requireWorkspaceMember);

const milestoneRules = [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
];

router.get('/:workspaceId/goals/:goalId/milestones', getMilestones);
router.post('/:workspaceId/goals/:goalId/milestones', milestoneRules, validate, createMilestone);
router.patch('/:workspaceId/goals/:goalId/milestones/:milestoneId', milestoneRules, validate, updateMilestone);
router.delete('/:workspaceId/goals/:goalId/milestones/:milestoneId', deleteMilestone);

module.exports = router;