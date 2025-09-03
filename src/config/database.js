const { Sequelize } = require('sequelize');

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    define: { underscored: true, timestamps: true },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });
} else {
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || 'mypassword';
  sequelize = new Sequelize(
    process.env.DB_NAME || 'mydatabase',
    process.env.DB_USER || 'myuser',
    password,
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      define: { underscored: true, timestamps: true },
    }
  );
}

module.exports = { sequelize };
