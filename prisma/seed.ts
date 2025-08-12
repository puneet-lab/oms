import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Warehouses from the brief (name, lat, lng, stock)
  const warehouses = [
    { name: 'Los Angeles', lat: 33.9425, lng: -118.408056, stockUnits: 355 },
    { name: 'New York', lat: 40.639722, lng: -73.778889, stockUnits: 578 },
    { name: 'São Paulo', lat: -23.435556, lng: -46.473056, stockUnits: 265 },
    { name: 'Paris', lat: 49.009722, lng: 2.547778, stockUnits: 694 },
    { name: 'Warsaw', lat: 52.165833, lng: 20.967222, stockUnits: 245 },
    { name: 'Hong Kong', lat: 22.308889, lng: 113.914444, stockUnits: 419 },
  ];

  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { name: w.name },
      update: { lat: w.lat, lng: w.lng, stockUnits: w.stockUnits },
      create: w,
    });
  }

  console.log('Seeded warehouses ✔');

  const ruleSetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const rs = await prisma.pricingRuleSet.upsert({
    where: { id: ruleSetId },
    update: {},
    create: {
      id: ruleSetId,
      name: 'Default v1',
      effectiveFrom: new Date(Date.now() - 60_000),
      unitPriceCents: 15000,
      unitWeightKg: 0.365,
      shipRatePerKgKm: 0.01,
      shippingMaxRatio: 0.15,
    },
  });

  const tiers = [
    { threshold: 250, pct: 20, priority: 4 },
    { threshold: 100, pct: 15, priority: 3 },
    { threshold: 50, pct: 10, priority: 2 },
    { threshold: 25, pct: 5, priority: 1 },
  ];

  await prisma.discountTier.deleteMany({ where: { ruleSetId: rs.id } });
  await prisma.discountTier.createMany({
    data: tiers.map((t) => ({ ...t, ruleSetId: rs.id })),
    skipDuplicates: true,
  });

  console.log('Seeded pricing rules ✔');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
