import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.barber.upsert({ where: { id: 'esteban' }, update: {}, create: { id: 'esteban', name: 'Esteban', role: 'Barbero principal', bio: 'Estilo, precisión y buena conversación.' } });
  for (const service of [
    { id: 'corte-barba', name: 'Corte y barba', duration: 45, price: 45000, description: 'Corte, perfilado y acabado completo.' },
    { id: 'solo-corte', name: 'Solo corte', duration: 30, price: 30000, description: 'Un corte preciso y personalizado.' },
    { id: 'barba', name: 'Barba', duration: 20, price: 20000, description: 'Perfilado y arreglo de barba.' },
    { id: 'corte-nino', name: 'Corte niño', duration: 30, price: 25000, description: 'Para los más pequeños de la casa.' },
  ]) await prisma.service.upsert({ where: { id: service.id }, update: service, create: service });
}

main().finally(() => prisma.$disconnect());
