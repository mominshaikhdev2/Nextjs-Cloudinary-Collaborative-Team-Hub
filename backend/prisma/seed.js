const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo users
  const password = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: {},
    create: { name: 'Alice Johnson', email: 'alice@demo.com', password },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.com' },
    update: {},
    create: { name: 'Bob Smith', email: 'bob@demo.com', password },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@demo.com' },
    update: {},
    create: { name: 'Carol White', email: 'carol@demo.com', password },
  });

  // Demo workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Corp',
      description: 'Main product team workspace',
      accentColor: '#7C3AED',
      members: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' },
          { userId: carol.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Goals
  const goal1 = await prisma.goal.create({
    data: {
      title: 'Launch v2.0 Product',
      description: 'Complete the v2.0 product launch with all features',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      workspaceId: workspace.id,
      ownerId: alice.id,
      milestones: {
        create: [
          { title: 'Design complete', progress: 100, status: 'COMPLETED' },
          { title: 'Backend API ready', progress: 70, status: 'IN_PROGRESS' },
          { title: 'Frontend integration', progress: 30, status: 'IN_PROGRESS' },
          { title: 'QA & Testing', progress: 0, status: 'PENDING' },
        ],
      },
    },
  });

  const goal2 = await prisma.goal.create({
    data: {
      title: 'Grow to 1000 users',
      description: 'Marketing and growth initiative',
      status: 'NOT_STARTED',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      workspaceId: workspace.id,
      ownerId: bob.id,
    },
  });

  // Action items
  await prisma.actionItem.createMany({
    data: [
      {
        title: 'Implement auth refresh flow',
        priority: 'HIGH',
        status: 'DONE',
        workspaceId: workspace.id,
        assigneeId: alice.id,
        goalId: goal1.id,
        order: 1,
      },
      {
        title: 'Build kanban board UI',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        workspaceId: workspace.id,
        assigneeId: bob.id,
        goalId: goal1.id,
        order: 2,
      },
      {
        title: 'Set up Cloudinary integration',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        workspaceId: workspace.id,
        assigneeId: carol.id,
        goalId: goal1.id,
        order: 3,
      },
      {
        title: 'Write onboarding email sequence',
        priority: 'MEDIUM',
        status: 'TODO',
        workspaceId: workspace.id,
        assigneeId: bob.id,
        goalId: goal2.id,
        order: 1,
      },
      {
        title: 'Create landing page',
        priority: 'HIGH',
        status: 'TODO',
        workspaceId: workspace.id,
        assigneeId: carol.id,
        goalId: goal2.id,
        order: 2,
      },
    ],
  });

  // Announcement
  await prisma.announcement.create({
    data: {
      title: '🚀 Welcome to Team Hub!',
      content: '<h2>Welcome to Team Hub</h2><p>This is your collaborative workspace. Start by creating goals, adding team members, and tracking progress together!</p><p>If you have any questions, feel free to post here.</p>',
      isPinned: true,
      workspaceId: workspace.id,
      authorId: alice.id,
    },
  });

  console.log('✅ Seed complete');
  console.log('Demo accounts:');
  console.log('  alice@demo.com / password123 (Admin)');
  console.log('  bob@demo.com / password123 (Member)');
  console.log('  carol@demo.com / password123 (Member)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());