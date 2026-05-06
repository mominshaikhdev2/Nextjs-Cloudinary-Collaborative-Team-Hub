const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadAvatar } = require('../config/cloudinary');
const {
  updateProfile,
  uploadAvatar: uploadAvatarCtrl,
  changePassword,
  getNotifications,
  markNotificationsRead,
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.patch(
  '/profile',
  [body('name').optional().trim().isLength({ min: 1, max: 80 })],
  validate,
  updateProfile
);

router.post('/avatar', uploadAvatar.single('avatar'), uploadAvatarCtrl);

router.patch(
  '/password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 chars'),
  ],
  validate,
  changePassword
);

module.exports = router;