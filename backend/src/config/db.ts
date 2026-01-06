import pg from "pg";
import { config } from "./config";


const pool = new pg.Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
});

export default pool;
