import { PrismaClient } from '@prisma/client';
import { loadSeedData } from './seed.load.js';
import {
  resetDatabase,
  seedGroupsTeamsInvites,
  seedOrganizationsAndUsers,
  seedProjectsAndTasks
} from './seed.write.js';

const prisma = new PrismaClient();

async function main() {
  const data = await loadSeedData();
  await resetDatabase(prisma);
  await seedOrganizationsAndUsers(prisma, data);
  await seedProjectsAndTasks(prisma, data);
  await seedGroupsTeamsInvites(prisma, data);
  console.log('Seed complete. Demo password for seeded users: Password');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

