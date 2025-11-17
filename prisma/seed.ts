import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if any employees exist (database already seeded)
  const employeeCount = await prisma.employee.count();

  if (employeeCount > 0) {
    console.log('✅ Database already seeded. Skipping...');
    return;
  }

  // Create initial company
  const company = await prisma.company.create({
    data: {
      name: 'Default Company',
    },
  });

  // Hash the default password
  const password = 'admin123'; // Default password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin user
  const adminUser = await prisma.employee.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      companyId: company.id,
      password: hashedPassword, // Add the hashed password
    },
  });

  console.log('🌱 Seeded database with:', {
    company: company.name,
    admin: adminUser.email,
    password: password, // Log the plain password for initial login
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 