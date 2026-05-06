const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const generateAccessToken = (userId) =>
{
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

const generateRefreshToken = async (userId) =>
{
  const token = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

const setTokenCookies = (res, accessToken, refreshToken) =>
{
  const isProd = process.env.NODE_ENV === 'production';

  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : false,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearTokenCookies = (res) =>
{
  const isProd = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : false };
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
};