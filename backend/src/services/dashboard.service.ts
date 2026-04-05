import { TransactionType } from "@prisma/client";
import { prisma } from "../config/db";

const toNumber = (value: unknown) => Number(value ?? 0);

const getIsoWeekKey = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

export const dashboardService = {
  async getSummary() {
    const [incomeAgg, expenseAgg, recent] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: TransactionType.INCOME, deletedAt: null },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { type: TransactionType.EXPENSE, deletedAt: null },
        _sum: { amount: true }
      }),
      prisma.transaction.findMany({
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          type: true,
          category: true,
          date: true,
          note: true
        }
      })
    ]);

    const totalIncome = toNumber(incomeAgg._sum.amount);
    const totalExpense = toNumber(expenseAgg._sum.amount);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      recentActivity: recent
    };
  },

  async getCategoryTotals() {
    const grouped = await prisma.transaction.groupBy({
      by: ["category", "type"],
      where: { deletedAt: null },
      _sum: { amount: true },
      orderBy: { category: "asc" }
    });

    return grouped.map((row) => ({
      category: row.category,
      type: row.type,
      total: toNumber(row._sum.amount)
    }));
  },

  async getTrends(input: { months: number; granularity: "month" | "week" }) {
    const { months, granularity } = input;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const rows = await prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: { gte: from }
      },
      select: {
        amount: true,
        type: true,
        date: true
      }
    });

    const map: Record<string, { income: number; expense: number }> = {};

    for (const row of rows) {
      const key =
        granularity === "week"
          ? getIsoWeekKey(row.date)
          : `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;

      if (!map[key]) {
        map[key] = { income: 0, expense: 0 };
      }

      const amount = Number(row.amount);
      if (row.type === TransactionType.INCOME) {
        map[key].income += amount;
      } else {
        map[key].expense += amount;
      }
    }

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, values]) => ({
        period,
        granularity,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense
      }));
  }
};
