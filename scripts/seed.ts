import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Upsert a demo user
  const passwordHash = await bcrypt.hash('Password1', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { name: 'Demo User', email: 'demo@example.com', passwordHash },
  });

  console.log(`✅ User: ${user.email}`);

  // Fetch system categories
  const categories = await prisma.category.findMany({ where: { isDefault: true } });
  const catMap = new Map(categories.map((c) => [c.name, c.id]));

  // Generate 6 months of sample transactions
  const now = new Date();
  const transactions = [];

  for (let month = 5; month >= 0; month--) {
    const base = new Date(now.getFullYear(), now.getMonth() - month, 1);

    // Monthly income
    transactions.push({
      userId: user.id,
      type: TransactionType.INCOME,
      amount: 4500 + Math.random() * 1000,
      categoryId: catMap.get('Other')!,
      date: new Date(base.getFullYear(), base.getMonth(), 1),
      note: 'Monthly salary',
    });

    // Recurring expenses
    const expenses = [
      { category: 'Bills', amount: 800 + Math.random() * 200, note: 'Rent' },
      { category: 'Food', amount: 300 + Math.random() * 150, note: 'Groceries' },
      { category: 'Transport', amount: 80 + Math.random() * 40, note: 'Monthly pass' },
      { category: 'Health', amount: 50 + Math.random() * 100, note: 'Gym & pharmacy' },
      { category: 'Shopping', amount: 120 + Math.random() * 200, note: 'Clothing & misc' },
      { category: 'Leisure', amount: 100 + Math.random() * 150, note: 'Dining & entertainment' },
    ];

    for (const e of expenses) {
      const day = Math.floor(Math.random() * 28) + 1;
      transactions.push({
        userId: user.id,
        type: TransactionType.EXPENSE,
        amount: parseFloat(e.amount.toFixed(2)),
        categoryId: catMap.get(e.category) ?? catMap.get('Other')!,
        date: new Date(base.getFullYear(), base.getMonth(), day),
        note: e.note,
      });
    }
  }

  await prisma.transaction.createMany({ data: transactions, skipDuplicates: false });
  console.log(`✅ Created ${transactions.length} transactions`);
  console.log('\n📧 Demo credentials: demo@example.com / Password1');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
