import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export const transactionService = {
  async createTransaction(input: {
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
    note?: string;
    createdById: string;
  }) {
    return prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(input.amount),
        type: input.type,
        category: input.category,
        date: new Date(input.date),
        note: input.note,
        createdById: input.createdById
      }
    });
  },

  async listTransactions(filters: TransactionFilters) {
    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
      type: filters.type,
      category: filters.category,
      date: {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined
      }
    };

    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { date: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  },

  async getTransactionById(id: string) {
    const tx = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    return tx;
  },

  async updateTransaction(
    id: string,
    input: {
      amount?: number;
      type?: TransactionType;
      category?: string;
      date?: string;
      note?: string;
    }
  ) {
    const existing = await prisma.transaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new AppError("Transaction not found", 404);
    }

    return prisma.transaction.update({
      where: { id },
      data: {
        amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
        type: input.type,
        category: input.category,
        date: input.date ? new Date(input.date) : undefined,
        note: input.note
      }
    });
  },

  async deleteTransaction(id: string) {
    const existing = await prisma.transaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new AppError("Transaction not found", 404);
    }

    return prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
};
