const prisma = require('../config/db');
const { getIO } = require('../socket');

const createNotification = async ({ userId, type, content, metadata }) => {
  const notification = await prisma.notification.create({
    data: { userId, type, content, metadata },
  });

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:new', notification);
  } catch (_) {}

  return notification;
};

// Parse @mentions from comment text, create notifications + emails
const processMentions = async ({ content, authorId, workspaceId, authorName }) => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [...content.matchAll(mentionRegex)];

  for (const match of mentions) {
    const mentionedUserId = match[2];
    if (mentionedUserId === authorId) continue;

    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: mentionedUserId, workspaceId } },
      include: { user: true },
    });

    if (!isMember) continue;

    await createNotification({
      userId: mentionedUserId,
      type: 'MENTION',
      content: `${authorName} mentioned you in a comment`,
      metadata: { authorId, workspaceId, preview: content.slice(0, 100) },
    });

    // Optionally send email (non-blocking)
    try {
      const { sendMentionEmail } = require('../config/email');
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      await sendMentionEmail({
        toEmail: isMember.user.email,
        mentionedBy: authorName,
        workspaceName: workspace.name,
        content: content.slice(0, 200),
      });
    } catch (_) {}
  }
};

module.exports = { createNotification, processMentions };