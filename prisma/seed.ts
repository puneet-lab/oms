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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
