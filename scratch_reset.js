const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetPassword() {
  try {
    const newPassword = 'Password123!';
    const hash = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE "User" SET password = $1 WHERE email = $2', [hash, 'misjoshuamacasadia@gmail.com']);
    console.log("Password reset successfully to:", newPassword);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

resetPassword();
