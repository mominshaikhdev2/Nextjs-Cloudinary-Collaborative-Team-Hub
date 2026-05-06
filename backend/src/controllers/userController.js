const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const updateProfile = async (req, res) => {
  const { name } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name && { name }) },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  res.json({ user });
};

const uploadAvatar = async (req, res) => {
  if (!req.file) throw createError('No file uploaded', 400);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: req.file.path },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  res.json({ user });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw createError('Current password is incorrect', 400);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

  // Revoke all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

  res.json({ message: 'Password changed successfully. Please log in again.' });
};

module.exports = { updateProfile, uploadAvatar, changePassword };