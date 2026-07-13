import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../src/auth/entities/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'qualite_db',
  entities: [User],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connected');

  const userRepo = dataSource.getRepository(User);

  const existingAdmin = await userRepo.findOne({
    where: { email: 'gaith.ghanmi@gmail.com' },
  });

  if (existingAdmin) {
    console.log('Super Admin already exists');
    await dataSource.destroy();
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('adminUser123*', salt);

  const admin = userRepo.create({
    firstName: 'Gaith',
    lastName: 'Ghanmi',
    matricule: 'SUPER-ADMIN-001',
    email: 'gaith.ghanmi@gmail.com',
    password: hashedPassword,
    role: UserRole.SUPER_ADMIN,
    isApproved: true,
  });

  await userRepo.save(admin);
  console.log('Super Admin created successfully');
  console.log('Email: gaith.ghanmi@gmail.com');
  console.log('Password: adminUser123*');

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
