require('dotenv').config();

module.exports = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DEV_DB_HOST,
      port: process.env.DEV_DB_PORT || 3306,
      user: process.env.DEV_DB_USER,
      password: process.env.DEV_DB_PASSWORD,
      database: process.env.DEV_DB_NAME,
    },
    useNullAsDefault: true,
    migrations: {
      directory: "src/connection/migrations",
      seeds: { directory: "src/connection/seeds" },
    },
    seeds: {
      directory: "src/connection/seeds",
    },
  },

  production: {
    client: "mysql2",
    connection: {
      host: process.env.PROD_DB_HOST,
      port: process.env.PROD_DB_PORT || 3306,
      user: process.env.PROD_DB_USER,
      password: process.env.PROD_DB_PASSWORD,
      database: process.env.PROD_DB_NAME,
    },
    pool: { min: 2, max: 10 },
    migrations: { directory: "src/connection/migrations" },
    seeds: { directory: "src/connection/seeds" },
  },
};