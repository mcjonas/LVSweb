import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { courses } from '../lib/schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL!;

async function fixUSD() {
  const client = neon(DATABASE_URL);
  const db = drizzle(client);

  await db.update(courses)
    .set({ 
      priceSingleGHS: 1500,
      priceSingleUSD: 137,
      priceCoupleGHS: 2500,
      priceCoupleUSD: 228
    })
    .where(eq(courses.id, 20));

  console.log('✅ Pre-Marital Counselling USD prices updated: Single=$137, Couple=$228');
}

fixUSD().catch(console.error);
