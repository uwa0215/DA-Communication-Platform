const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkUser() {
  try {
    const res = await pool.query('SELECT id, email, name, "isApproved" FROM "User" WHERE email = $1', ['misjoshuamacasadia@gmail.com']);
    console.log("Found User:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkUser();
