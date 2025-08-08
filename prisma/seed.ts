import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.test.createMany({
    data: [{ name: 'Hello OMS' }, { name: 'ScreenCloud OMS' }],
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
