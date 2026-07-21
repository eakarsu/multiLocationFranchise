const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const email = String(
  process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.PROVISION_ADMIN_EMAIL || '',
).trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.PROVISION_ADMIN_PASSWORD || '';
const fullName = String(
  process.env.BOOTSTRAP_ADMIN_NAME || process.env.PROVISION_ADMIN_NAME || 'Platform Administrator',
).trim();
const [firstName, ...lastParts] = fullName.split(/\s+/);
const lastName = lastParts.join(' ') || 'Administrator';

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address');
}
if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password)
  || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain 12-128 characters with upper-case, lower-case, and numeric characters');
}

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Administrator identity already exists for ${email}`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      firstName,
      lastName,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`Administrator identity created for ${email}`);
}

main()
  .catch((error) => {
    console.error(`Administrator bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
