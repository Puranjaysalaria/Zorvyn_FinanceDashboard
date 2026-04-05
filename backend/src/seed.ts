import { Prisma, Role, TransactionType, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "./config/db";
import { env } from "./config/env";

const makeHash = (plain: string) => bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@zorvyn.com",
      passwordHash: await makeHash("Admin@123"),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE
    }
  });

  const analyst = await prisma.user.create({
    data: {
      name: "Analyst User",
      email: "analyst@zorvyn.com",
      passwordHash: await makeHash("Analyst@123"),
      role: Role.ANALYST,
      status: UserStatus.ACTIVE
    }
  });

  const viewer = await prisma.user.create({
    data: {
      name: "Viewer User",
      email: "viewer@zorvyn.com",
      passwordHash: await makeHash("Viewer@123"),
      role: Role.VIEWER,
      status: UserStatus.ACTIVE
    }
  });

  const txData = [
    { amount: 4500, type: TransactionType.INCOME, category: "Salary", note: "Monthly salary" },
    { amount: 1200, type: TransactionType.INCOME, category: "Freelance", note: "API project" },
    { amount: 300, type: TransactionType.EXPENSE, category: "Food", note: "Groceries" },
    { amount: 150, type: TransactionType.EXPENSE, category: "Transport", note: "Fuel" },
    { amount: 500, type: TransactionType.EXPENSE, category: "Rent", note: "House rent share" }
  ];

  const now = new Date();

  for (let i = 0; i < txData.length; i++) {
    await prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(txData[i].amount),
        type: txData[i].type,
        category: txData[i].category,
        note: txData[i].note,
        date: new Date(now.getFullYear(), now.getMonth() - i, 10),
        createdById: i % 2 === 0 ? admin.id : analyst.id
      }
    });
  }

  console.log("Seed completed");
  console.log({
    users: [
      { email: admin.email, password: "Admin@123", role: admin.role },
      { email: analyst.email, password: "Analyst@123", role: analyst.role },
      { email: viewer.email, password: "Viewer@123", role: viewer.role }
    ]
  });

  void viewer;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
