import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.get('/test', async (_req, res) => {
  const data = await prisma.test.findMany();
  res.json(data);
});

app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
