import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VaultIQ database seed...');

  const salt = '00112233445566778899aabbccddeeff';
  const masterPasswordHash = await bcrypt.hash('masterpassword', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vaultiq.local' },
    update: {},
    create: {
      email: 'admin@vaultiq.local',
      fullName: 'Admin User',
      role: 'ADMIN',
      masterPasswordHash,
      salt,
      tier: 'FREE',
    },
  });

  console.log(`✅ Admin user seeded: ${admin.email}`);
  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
