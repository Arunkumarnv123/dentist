const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables with better path resolution
// Check current directory and parent directory for .env
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'), // From src/config to backend root
  path.resolve(__dirname, '../../../.env') // From src/config to project root
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;
let sequelize;

if (connectionString && connectionString.startsWith('postgres')) {
  console.log('🌐 Attempting to connect to remote Postgres database...');
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  if (isProduction) {
    console.error('❌ ERROR: DATABASE_URL is missing in production environment!');
    throw new Error('DATABASE_URL is required in production. Local fallback is disabled.');
  }

  console.log('🏠 Using local SQLite database (fallback)...');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(process.cwd(), 'database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
    }
  });
}

module.exports = sequelize;
