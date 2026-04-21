import { createCipheriv, randomBytes } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is required');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Test-only encryption: uses a fixed dev key (32 bytes hex)
const DEV_KEY = Buffer.from('0'.repeat(64), 'hex');

function encryptForSeed(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', DEV_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

async function main() {
  console.log('Seeding plans...');

  const plans = [
    {
      name: 'Free',
      slug: 'free',
      scriptLimit: 5,
      narrationLimit: 5,
      exportLimit: 3,
      priceMonthlyBrl: 0,
    },
    {
      name: 'Starter',
      slug: 'starter',
      scriptLimit: 30,
      narrationLimit: 30,
      exportLimit: 20,
      priceMonthlyBrl: 49.9,
    },
    {
      name: 'Creator',
      slug: 'creator',
      scriptLimit: null,
      narrationLimit: null,
      exportLimit: null,
      priceMonthlyBrl: 149.9,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        scriptLimit: plan.scriptLimit,
        narrationLimit: plan.narrationLimit,
        exportLimit: plan.exportLimit,
        priceMonthlyBrl: plan.priceMonthlyBrl,
      },
      create: plan,
    });
    console.log(`  ✓ Plan "${plan.name}" seeded`);
  }

  console.log('Seeding test YouTube credentials...');

  // Upsert a test organization for seed purposes
  const testOrg = await prisma.organization.upsert({
    where: { slug: 'test-org-seed' },
    update: {},
    create: {
      name: 'Test Org (Seed)',
      slug: 'test-org-seed',
    },
  });

  await prisma.youtubeOAuthToken.upsert({
    where: { organizationId: testOrg.id },
    update: {},
    create: {
      organizationId: testOrg.id,
      accessToken: encryptForSeed('ya29.test_access_token_seed'),
      refreshToken: encryptForSeed('1//test_refresh_token_seed'),
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
  });
  console.log('  ✓ YoutubeOAuthToken (test credential) seeded');

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
