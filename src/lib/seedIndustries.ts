import logger from "./logger";
import { db } from "./db";
import { industries, categories } from "./db/schema";
import { eq, and } from "drizzle-orm";

export type SeedIndustry = {
  name: string;
  description?: string | null;
  categories?: string[];
};

const DEFAULT_DATA: SeedIndustry[] = [
  {
    name: "Financial",
    description: "Financial services industry",
    categories: [
      "Investments",
      "Asset Management",
      "Wealth Management",
      "Banking",
      "Retail Banking",
      "Corporate Banking",
      "Insurance",
      "Fintech",
      "Payments",
      "Lending",
      "Microfinance",
      "Capital Markets",
      "Brokerage",
      "Pension Funds",
      "Venture Capital",
      "Private Equity",
      "Treasury Services",
    ],
  },
  {
    name: "Technology",
    description: "Technology and software industry",
    categories: ["Software", "SaaS", "Cybersecurity", "DevOps", "AI/ML"],
  },
];

export async function seedIndustries(list: SeedIndustry[] = DEFAULT_DATA) {
  const result: {
    industries: { name: string; id: string; created: boolean }[];
    categories: {
      industry: string;
      name: string;
      id: string;
      created: boolean;
    }[];
  } = { industries: [], categories: [] };

  for (const item of list) {
    const name = item.name.trim();
    try {
      // find existing industry by name
      const found = await db
        .select({ id: industries.id })
        .from(industries)
        .where(eq(industries.name, name));
      let industryId: string;
      if (found.length > 0) {
        industryId = found[0].id;
        result.industries.push({ name, id: industryId, created: false });
      } else {
        const created = await db
          .insert(industries)
          .values({ name, description: item.description ?? null })
          .returning({ id: industries.id });
        industryId = created[0].id;
        result.industries.push({ name, id: industryId, created: true });
      }

      // handle categories
      const cats = item.categories ?? [];
      for (const c of cats) {
        const cname = c.trim();
        if (!cname) continue;
        const foundCat = await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.name, cname),
              eq(categories.industryId, industryId),
            ),
          );
        if (foundCat.length > 0) {
          result.categories.push({
            industry: name,
            name: cname,
            id: foundCat[0].id,
            created: false,
          });
          continue;
        }
        const createdCat = await db
          .insert(categories)
          .values({ name: cname, industryId })
          .returning({ id: categories.id });
        result.categories.push({
          industry: name,
          name: cname,
          id: createdCat[0].id,
          created: true,
        });
      }
    } catch (err) {
      logger.error("seedIndustries: Error seeding industry", {
        error: err,
        industry: name,
      });
      throw err;
    }
  }

  return result;
}

if (require.main === module) {
  (async () => {
    try {
      logger.info("Seeding industries and categories...");
      const res = await seedIndustries();
      logger.info("Seeding complete", { summary: res });
      process.exit(0);
    } catch (err) {
      logger.error("Seeding failed", { error: err });
      process.exit(1);
    }
  })();
}

export default seedIndustries;
