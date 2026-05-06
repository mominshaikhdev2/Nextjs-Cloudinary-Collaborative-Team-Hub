const express = require('express');
const {
  getDashboardStats,
  getGoalCompletionChart,
  exportWorkspaceCSV,
  getActivityFeed,
} = require('../controllers/analyticsController');

const router = express.Router({ mergeParams: true });

// /api/workspaces/:workspaceId/analytics/stats
router.get('/stats', getDashboardStats);

// /api/workspaces/:workspaceId/analytics/goal-chart
router.get('/goal-chart', getGoalCompletionChart);

// /api/workspaces/:workspaceId/analytics/export
router.get('/export', exportWorkspaceCSV);

// /api/workspaces/:workspaceId/analytics/activity
router.get('/activity', getActivityFeed);

module.exports = router;