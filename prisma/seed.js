const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const bcrypt = require("bcryptjs");
const path = require("path");

const adapter = new PrismaLibSql({
  url: `file:${path.join(__dirname, "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create default channels — need a placeholder user first
  // Create admin user first
  const adminHash = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "alice@company.com" },
    update: {},
    create: {
      name: "Alice Johnson",
      email: "alice@company.com",
      password: adminHash,
      jobTitle: "CEO",
      department: "Executive",
      status: "offline",
    },
  });

  // Create channels
  const general = await prisma.channel.upsert({
    where: { name: "general" },
    update: {},
    create: {
      name: "general",
      description: "General company-wide discussion",
      isPrivate: false,
      createdById: admin.id,
    },
  });

  const announcements = await prisma.channel.upsert({
    where: { name: "announcements" },
    update: {},
    create: {
      name: "announcements",
      description: "Company announcements and news",
      isPrivate: false,
      createdById: admin.id,
    },
  });

  const engineering = await prisma.channel.upsert({
    where: { name: "engineering" },
    update: {},
    create: {
      name: "engineering",
      description: "Engineering team discussions",
      isPrivate: false,
      createdById: admin.id,
    },
  });

  // Create sample employees
  const employees = [
    { name: "Bob Smith",      email: "bob@company.com",   jobTitle: "CTO",             department: "Engineering" },
    { name: "Carol Williams", email: "carol@company.com", jobTitle: "Lead Developer",   department: "Engineering" },
    { name: "David Lee",      email: "david@company.com", jobTitle: "Product Manager",  department: "Product" },
    { name: "Emma Davis",     email: "emma@company.com",  jobTitle: "UI/UX Designer",  department: "Design" },
    { name: "Frank Miller",   email: "frank@company.com", jobTitle: "Marketing Head",   department: "Marketing" },
    { name: "Grace Chen",     email: "grace@company.com", jobTitle: "HR Manager",       department: "HR" },
  ];

  const allUsers = [admin];
  for (const emp of employees) {
    const hashed = await bcrypt.hash("password123", 12);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        name: emp.name,
        email: emp.email,
        password: hashed,
        jobTitle: emp.jobTitle,
        department: emp.department,
        status: "offline",
      },
    });
    allUsers.push(user);
  }

  // Add all users to general and announcements
  for (const user of allUsers) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: general.id, userId: user.id } },
      update: {},
      create: { channelId: general.id, userId: user.id },
    });
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: announcements.id, userId: user.id } },
      update: {},
      create: { channelId: announcements.id, userId: user.id },
    });
  }

  // Add engineering team to engineering channel
  const engTeam = allUsers.filter(u => ["Engineering"].includes(
    employees.find(e => e.email === u.email)?.department || "Executive"
  ));
  engTeam.push(admin); // add CEO too
  for (const user of engTeam) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: engineering.id, userId: user.id } },
      update: {},
      create: { channelId: engineering.id, userId: user.id },
    });
  }

  // Seed welcome messages
  const existingMessages = await prisma.message.findMany({ where: { channelId: general.id } });
  if (existingMessages.length === 0) {
    await prisma.message.createMany({
      data: [
        { content: "👋 Welcome to CompanyChat — your company's communication hub!", senderId: admin.id, channelId: general.id },
        { content: "Feel free to create channels for your teams and start collaborating.", senderId: admin.id, channelId: general.id },
        { content: "📢 Check out the #announcements channel for company news!", senderId: admin.id, channelId: general.id },
      ]
    });
  }

  console.log("✅ Seed complete!\n");
  console.log("Default login credentials (all use password: password123):");
  console.log("  📧 alice@company.com  | Alice Johnson (CEO)");
  employees.forEach(e => console.log(`  📧 ${e.email.padEnd(25)} | ${e.name} (${e.jobTitle})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
