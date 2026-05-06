const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} = require('../utils/jwt');
const { createError } = require('../middleware/errorHandler');

const register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw createError('Email already in use', 409);

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);
  setTokenCookies(res, accessToken, refreshToken);

  // Return refreshToken in body so frontend can store it
  res.status(201).json({ user, accessToken, refreshToken });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw createError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw createError('Invalid email or password', 401);

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);
  setTokenCookies(res, accessToken, refreshToken);

  const { password: _, ...safeUser } = user;
  // Return refreshToken in body so frontend can store it
  res.json({ user: safeUser, accessToken, refreshToken });
};

const refreshToken = async (req, res) => {
  // Accept from cookie OR request body (body wins for cross-origin dev)
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!token) throw createError('Refresh token required', 401);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw createError('Invalid refresh token', 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw createError('Refresh token expired or revoked', 401);
  }

  await prisma.refreshToken.delete({ where: { token } });

  const accessToken = generateAccessToken(payload.userId);
  const newRefreshToken = await generateRefreshToken(payload.userId);
  setTokenCookies(res, accessToken, newRefreshToken);

  // Return new refreshToken in body too
  res.json({ accessToken, refreshToken: newRefreshToken });
};

const logout = async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  clearTokenCookies(res);
  res.json({ message: 'Logged out successfully' });
};

const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      workspaceMembers: {
        include: {
          workspace: {
            select: { id: true, name: true, accentColor: true, description: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  res.json({ user });
};

module.exports = { register, login, refreshToken, logout, getMe };