const express = require('express');
const { body } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
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

// /api/workspaces/:workspaceId/announcements
router.get('/', getAnnouncements);

router.post(
  '/',
  requireAdmin,
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('content').trim().notEmpty().isLength({ max: 50000 }),
  ],
  validate,
  createAnnouncement
);

// /api/workspaces/:workspaceId/announcements/:announcementId
router.patch(
  '/:announcementId',
  requireAdmin,
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('content').optional().trim().notEmpty().isLength({ max: 50000 }),
  ],
  validate,
  updateAnnouncement
);

router.delete('/:announcementId', requireAdmin, deleteAnnouncement);
router.patch('/:announcementId/pin', requireAdmin, togglePin);

// Reactions
router.post(
  '/:announcementId/reactions',
  [body('emoji').notEmpty().isLength({ max: 10 })],
  validate,
  addReaction
);
router.delete('/:announcementId/reactions/:emoji', removeReaction);

// Comments
router.get('/:announcementId/comments', getComments);
router.post(
  '/:announcementId/comments',
  [body('content').trim().notEmpty().isLength({ max: 2000 })],
  validate,
  addComment
);
router.delete('/:announcementId/comments/:commentId', deleteComment);

module.exports = router;