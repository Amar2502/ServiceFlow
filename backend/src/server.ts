import app from "./app";
import { config } from "./config/config";
import pool from "./config/db";

pool.connect().then(() => {
    console.log("Database connected successfully");

    app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
}).catch((err) => {
    console.log("Database connection failed", err);
    process.exit(1);
});
