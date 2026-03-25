const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Default to a local postgres DB if not provided, but mostly expect online Neon DB URL
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dental_camp';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // This bypasses SSL certificate validation which is often needed for Neon
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

module.exports = sequelize;
