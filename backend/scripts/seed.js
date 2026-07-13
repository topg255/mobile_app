const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'qualite_db',
  });

  try {
    await client.connect();
    console.log('Database connected for seeding...');

    const existing = await client.query(
      "SELECT id FROM users WHERE email = 'gaith.ghanmi@gmail.com'"
    );

    if (existing.rows.length > 0) {
      console.log('Super Admin already exists');
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('adminUser123*', salt);

    await client.query(
      `INSERT INTO users (id, first_name, last_name, matricule, email, password, role, is_approved, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Gaith', 'Ghanmi', 'SUPER-ADMIN-001', 'gaith.ghanmi@gmail.com', $1, 'super_admin', true, NOW(), NOW())`,
      [hash]
    );

    console.log('Super Admin created successfully');
    console.log('Email: gaith.ghanmi@gmail.com');
    console.log('Password: adminUser123*');
  } catch (e) {
    console.error('Seed error:', e.message);
  } finally {
    await client.end();
  }
}

seed();
