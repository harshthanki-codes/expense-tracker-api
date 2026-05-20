import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

interface PeriodParams {
  startDate: string;
  endDate: string;
}

interface MonthlyParams {
  months: number;
}

export async function getSummary(userId: string, period: PeriodParams) {
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);

  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId, date: { gte: start, lte: end } },
    _sum: { amount: true },
  });

  const income = parseFloat(
    result.find((r) => r.type === 'INCOME')?._sum.amount?.toString() ?? '0',
  );
  const expenses = parseFloat(
    result.find((r) => r.type === 'EXPENSE')?._sum.amount?.toString() ?? '0',
  );

  return { income, expenses, net: parseFloat((income - expenses).toFixed(2)) };
}

export async function getSpendingByCategory(userId: string, period: PeriodParams) {
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);

  const rows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  if (rows.length === 0) return [];

  const total = rows.reduce((acc, r) => acc + parseFloat(r._sum.amount?.toString() ?? '0'), 0);

  const categoryIds = rows.map((r) => r.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return rows.map((r) => {
    const amount = parseFloat(r._sum.amount?.toString() ?? '0');
    return {
      categoryId: r.categoryId,
      categoryName: catMap.get(r.categoryId) ?? 'Unknown',
      amount,
      percentage: total > 0 ? parseFloat(((amount / total) * 100).toFixed(1)) : 0,
    };
  });
}

export async function getMonthlyTrend(userId: string, params: MonthlyParams) {
  const months = Math.min(Math.max(1, params.months), 24);

  // Single aggregation query — group by year-month and type
  const rows = await prisma.$queryRaw<
    Array<{ year: number; month: number; type: string; total: Prisma.Decimal }>
  >`
    SELECT
      EXTRACT(YEAR FROM date)::int  AS year,
      EXTRACT(MONTH FROM date)::int AS month,
      type,
      SUM(amount)                   AS total
    FROM transactions
    WHERE
      user_id = ${userId}
      AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * ${months - 1}
    GROUP BY year, month, type
    ORDER BY year ASC, month ASC
  `;

  // Build a map of all months in range so gaps appear as zeros
  const monthMap = new Map<string, { year: number; month: number; income: number; expenses: number }>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthMap.set(key, { year: d.getFullYear(), month: d.getMonth() + 1, income: 0, expenses: 0 });
  }

  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    const entry = monthMap.get(key);
    if (!entry) continue;
    const amount = parseFloat(row.total.toString());
    if (row.type === 'INCOME') entry.income = amount;
    else entry.expenses = amount;
  }

  return Array.from(monthMap.values()).map((m) => ({
    ...m,
    net: parseFloat((m.income - m.expenses).toFixed(2)),
  }));
}
