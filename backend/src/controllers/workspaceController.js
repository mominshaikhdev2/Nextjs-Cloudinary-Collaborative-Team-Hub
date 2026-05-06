const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');
const { sendInvitationEmail } = require('../config/email');
const { getIO } = require('../socket');

const createWorkspace = async (req, res) => {
  const { name, description, accentColor } = req.body;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      description,
      accentColor: accentColor || '#7C3AED',
      members: {
        create: { userId: req.user.id, role: 'ADMIN' },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
  });

  res.status(201).json({ workspace });
};

const getMyWorkspaces = async (req, res) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true, goals: true, actionItems: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  res.json({ workspaces });
};

const getWorkspace = async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      _count: { select: { goals: true, actionItems: true, announcements: true } },
    },
  });

  res.json({ workspace, role: req.membership.role });
};

const updateWorkspace = async (req, res) => {
  const { name, description, accentColor } = req.body;
  const workspace = await prisma.workspace.update({
    where: { id: req.params.workspaceId },
    data: { ...(name && { name }), ...(description !== undefined && { description }), ...(accentColor && { accentColor }) },
  });

  await logActivity({
    action: 'UPDATED',
    entityType: 'WORKSPACE',
    entityId: workspace.id,
    workspaceId: workspace.id,
    userId: req.user.id,
    metadata: { name: workspace.name },
  });

  res.json({ workspace });
};

const deleteWorkspace = async (req, res) => {
  await prisma.workspace.delete({ where: { id: req.params.workspaceId } });
  res.json({ message: 'Workspace deleted' });
};

const getMembers = async (req, res) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.params.workspaceId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });
  res.json({ members });
};

const inviteMember = async (req, res) => {
  const { email, role = 'MEMBER' } = req.body;
  const { workspaceId } = req.params;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
    });
    if (alreadyMember) throw createError('User is already a workspace member', 409);
  }

  // Upsert invitation
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.upsert({
    where: { email_workspaceId: { email, workspaceId } },
    update: { token, expiresAt, role, invitedById: req.user.id },
    create: { email, workspaceId, role, token, expiresAt, invitedById: req.user.id },
  });

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const inviteUrl = `${process.env.CLIENT_URL}/invitations/${token}`;

  // Send email (non-blocking)
  sendInvitationEmail({
    toEmail: email,
    workspaceName: workspace.name,
    inviterName: req.user.name,
    inviteUrl,
  }).catch(console.error);

  res.json({ message: `Invitation sent to ${email}`, invitation });
};

const acceptInvitation = async (req, res) => {
  const { token } = req.params;

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) throw createError('Invalid invitation', 404);
  if (invitation.expiresAt < new Date()) throw createError('Invitation has expired', 410);
  if (invitation.acceptedAt) throw createError('Invitation already accepted', 409);

  // Find or prompt user to register — if they are logged in, use req.user
  // then redirect to frontend to handle the auth flow
  res.json({ invitation, message: 'Valid invitation. Please register or log in to accept.' });
};

const updateMemberRole = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const { role } = req.body;

  if (userId === req.user.id) throw createError('Cannot change your own role', 400);

  const member = await prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId, workspaceId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  res.json({ member });
};

const removeMember = async (req, res) => {
  const { workspaceId, userId } = req.params;
  if (userId === req.user.id) throw createError('Use /leave to remove yourself', 400);

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  try {
    getIO().to(`workspace:${workspaceId}`).emit('workspace:member_removed', { userId });
  } catch (_) {}

  res.json({ message: 'Member removed' });
};

const leaveWorkspace = async (req, res) => {
  const { workspaceId } = req.params;

  // Prevent sole admin from leaving
  const adminCount = await prisma.workspaceMember.count({
    where: { workspaceId, role: 'ADMIN' },
  });
  if (req.membership.role === 'ADMIN' && adminCount === 1) {
    throw createError('Transfer admin role before leaving', 400);
  }

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId: req.user.id, workspaceId } },
  });

  res.json({ message: 'Left workspace' });
};

// RBAC 
const getPermissions = async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.workspaceId },
    select: { permissions: true },
  });
  res.json({ permissions: workspace?.permissions || null });
};

const updatePermissions = async (req, res) => {
  const { workspaceId } = req.params;
  const { permissions } = req.body;

  // Validate structure — must only contain ADMIN and MEMBER keys
  const validRoles = ['ADMIN', 'MEMBER'];
  const validPerms = [
    'createGoals', 'editAnyGoal', 'deleteAnyGoal',
    'postAnnouncements', 'pinAnnouncements',
    'inviteMembers', 'manageMembers',
    'viewAnalytics', 'exportData', 'manageWorkspace',
    'createActionItems', 'editAnyActionItem', 'deleteAnyActionItem',
  ];

  for (const role of Object.keys(permissions)) {
    if (!validRoles.includes(role)) {
      throw createError(`Invalid role key: ${role}`, 400);
    }
    for (const perm of Object.keys(permissions[role])) {
      if (!validPerms.includes(perm)) {
        throw createError(`Invalid permission key: ${perm}`, 400);
      }
      if (typeof permissions[role][perm] !== 'boolean') {
        throw createError(`Permission value must be boolean: ${perm}`, 400);
      }
    }
  }

  // Admins always keep manageWorkspace — safety guard
  if (permissions.ADMIN) {
    permissions.ADMIN.manageWorkspace = true;
    permissions.ADMIN.manageMembers = true;
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { permissions },
    select: { id: true, permissions: true },
  });

  await logActivity({
    action: 'UPDATED_PERMISSIONS',
    entityType: 'WORKSPACE',
    entityId: workspaceId,
    workspaceId,
    userId: req.user.id,
    metadata: { summary: 'Permission matrix updated' },
  });

  res.json({ permissions: workspace.permissions });
};

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  inviteMember,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  leaveWorkspace,
  getPermissions,
  updatePermissions,
};