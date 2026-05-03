const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireWorkspaceMember, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  addReaction,
  removeReaction,
  getComments,
  addComment,
  deleteComment,
} = require('../controllers/announcementController');

const router = express.Router({ mergeParams: true });
router.use(authenticate, requireWorkspaceMember);

router.get('/:workspaceId/announcements', getAnnouncements);

router.post(
  '/:workspaceId/announcements',
  requireAdmin,
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('content').trim().notEmpty().isLength({ max: 50000 }),
  ],
  validate,
  createAnnouncement
);

router.patch(
  '/:workspaceId/announcements/:announcementId',
  requireAdmin,
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('content').optional().trim().notEmpty().isLength({ max: 50000 }),
  ],
  validate,
  updateAnnouncement
);

router.delete('/:workspaceId/announcements/:announcementId', requireAdmin, deleteAnnouncement);
router.patch('/:workspaceId/announcements/:announcementId/pin', requireAdmin, togglePin);

// Reactions
router.post(
  '/:workspaceId/announcements/:announcementId/reactions',
  [body('emoji').notEmpty().isLength({ max: 10 })],
  validate,
  addReaction
);
router.delete('/:workspaceId/announcements/:announcementId/reactions/:emoji', removeReaction);

// Comments
router.get('/:workspaceId/announcements/:announcementId/comments', getComments);
router.post(
  '/:workspaceId/announcements/:announcementId/comments',
  [body('content').trim().notEmpty().isLength({ max: 2000 })],
  validate,
  addComment
);
router.delete('/:workspaceId/announcements/:announcementId/comments/:commentId', deleteComment);

module.exports = router;