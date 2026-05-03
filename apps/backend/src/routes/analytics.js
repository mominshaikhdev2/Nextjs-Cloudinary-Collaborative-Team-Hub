const express = require('express');
const { authenticate, requireWorkspaceMember } = require('../middleware/auth');
const {
  getDashboardStats,
  getGoalCompletionChart,
  exportWorkspaceCSV,
  getActivityFeed,
} = require('../controllers/analyticsController');

const router = express.Router({ mergeParams: true });
router.use(authenticate, requireWorkspaceMember);

router.get('/:workspaceId/analytics/stats', getDashboardStats);
router.get('/:workspaceId/analytics/goal-chart', getGoalCompletionChart);
router.get('/:workspaceId/analytics/export', exportWorkspaceCSV);
router.get('/:workspaceId/analytics/activity', getActivityFeed);

module.exports = router;