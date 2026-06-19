// 用 Node 24 原生 TS: `node prisma/seed.ts`（见 package.json db:seed）
import { PrismaClient } from "../src/generated/prisma/index.js";
import { BUILTIN_PRESETS } from "../src/lib/presets/builtin.ts";

const prisma = new PrismaClient();

async function main() {
  for (const p of BUILTIN_PRESETS) {
    await prisma.stylePreset.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        category: p.category,
        provider: p.provider,
        promptTemplate: p.promptTemplate,
        negativePrompt: p.negativePrompt,
        lockedParams: p.lockedParams,
      },
      create: p,
    });
    console.log("seeded preset:", p.name);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
