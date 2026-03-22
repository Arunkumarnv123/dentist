const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Arun%40123@127.0.0.1:5432/postgres'
  });

  try {
    await client.connect();
    const res = await client.query('SELECT datname FROM pg_catalog.pg_database WHERE datname = \'dental_camp\'');
    
    if (res.rowCount === 0) {
      console.log('Database dental_camp does not exist, creating it...');
      await client.query('CREATE DATABASE dental_camp');
      console.log('Database created successfully.');
    } else {
      console.log('Database dental_camp already exists.');
    }
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
