const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query('SELECT password FROM "User" WHERE email = $1', ['misjoshuamacasadia@gmail.com']);
  if (res.rows.length) {
    const match = await bcrypt.compare('Password123!', res.rows[0].password);
    console.log('Match?', match);
  } else {
    console.log('User not found.');
  }
  pool.end();
}
run();
