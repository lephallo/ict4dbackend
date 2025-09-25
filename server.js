import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcryptjs";   // ✅ use bcryptjs instead of bcrypt

const { Pool } = pkg;
const app = express();

app.use(cors({ origin: "*" })); // Allow all origins or restrict to your frontend domain
app.use(express.json());

// Neon.tech database connection
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_MPhNtOYqvV83@ep-blue-silence-adlk5oj3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// Ensure users table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);
    console.log("✅ Users table ready");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  }
})();

// REGISTER endpoint
app.post("/api/register", async (req, res) => {
  const { name, surname, role, email, password } = req.body;
  if (!name || !surname || !role || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // ✅ bcryptjs works the same
    const result = await pool.query(
      `INSERT INTO users (name, surname, role, email, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, surname, role, email`,
      [name, surname, role, email, hashedPassword]
    );
    res
      .status(201)
      .json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
