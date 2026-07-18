/**
 * Seed the real customer testimonials into the testimonials table.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed-testimonials
 *
 * Idempotent: skips any testimonial whose name already exists in the table.
 */

import { asc } from "drizzle-orm";
import { db, testimonialsTable, pool } from "@workspace/db";

const TESTIMONIALS = [
  {
    name: "Mohammed Al-Rashidi",
    quoteEn:
      "I used to spend 20 minutes making an invoice in Word. Now it takes 2 minutes and looks far more professional. The Arabic support is flawless.",
    quoteAr:
      "كنت أقضي 20 دقيقة لإنشاء فاتورة في Word. الآن يستغرق الأمر دقيقتين وتبدو أكثر احترافية. دعم اللغة العربية ممتاز.",
    roleEn: "Freelance Consultant, Saudi Arabia",
    roleAr: "مستشار مستقل، المملكة العربية السعودية",
    stars: 5,
  },
  {
    name: "Sarah Al-Mansoori",
    quoteEn:
      "The VAT calculator and invoice generator together save me hours every month. It's the most useful free business tool I've found for the UAE market.",
    quoteAr:
      "حاسبة الضريبة ومولّد الفواتير معاً يوفران علي ساعات كل شهر. أفضل أداة أعمال مجانية وجدتها لسوق الإمارات.",
    roleEn: "Small Business Owner, UAE",
    roleAr: "صاحبة شركة صغيرة، الإمارات",
    stars: 5,
  },
  {
    name: "Khalid Ibrahim",
    quoteEn:
      "Clean templates, instant PDF, and it actually works offline. I send quotations to clients from my phone between meetings. Brilliant tool.",
    quoteAr:
      "قوالب أنيقة، وPDF فوري، ويعمل دون إنترنت. أرسل عروض أسعار للعملاء من هاتفي بين الاجتماعات. أداة رائعة.",
    roleEn: "Marketing Agency, Egypt",
    roleAr: "وكالة تسويق، مصر",
    stars: 5,
  },
  {
    name: "Fatima Al-Zahrawi",
    quoteEn:
      "Finally a tool that understands both Arabic and English business needs. The stamp maker is an unexpected bonus — clients love the branded documents.",
    quoteAr:
      "أخيراً أداة تفهم احتياجات الأعمال باللغتين العربية والإنجليزية. صانع الأختام إضافة رائعة — العملاء يحبون المستندات المخصصة.",
    roleEn: "Legal Consultant, Jordan",
    roleAr: "مستشارة قانونية، الأردن",
    stars: 5,
  },
  {
    name: "Omar Benali",
    quoteEn:
      "Switched from a paid tool to Xuvilo and haven't looked back. The free plan alone covers everything my freelance business needs.",
    quoteAr:
      "انتقلت من أداة مدفوعة إلى Xuvilo ولم أندم. الخطة المجانية وحدها تغطي كل احتياجات عملي الحر.",
    roleEn: "Freelance Developer, Morocco",
    roleAr: "مطور مستقل، المغرب",
    stars: 5,
  },
];

async function main() {
  const existing = await db
    .select({ name: testimonialsTable.name, sortOrder: testimonialsTable.sortOrder })
    .from(testimonialsTable);
  const existingNames = new Set(existing.map((r) => r.name));
  let nextOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder), 0);

  let inserted = 0;
  for (const t of TESTIMONIALS) {
    if (existingNames.has(t.name)) {
      console.log(`skip (exists): ${t.name}`);
      continue;
    }
    nextOrder += 1;
    await db.insert(testimonialsTable).values({
      ...t,
      active: true,
      sortOrder: nextOrder,
    });
    console.log(`inserted: ${t.name} (sortOrder ${nextOrder})`);
    inserted += 1;
  }

  const rows = await db
    .select({
      id: testimonialsTable.id,
      name: testimonialsTable.name,
      active: testimonialsTable.active,
      sortOrder: testimonialsTable.sortOrder,
    })
    .from(testimonialsTable)
    .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));

  console.log(`\nDone. Inserted ${inserted} new testimonial(s). Table now has ${rows.length} row(s):`);
  for (const r of rows) {
    console.log(`  #${r.id} [order ${r.sortOrder}] active=${r.active} ${r.name}`);
  }
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });
