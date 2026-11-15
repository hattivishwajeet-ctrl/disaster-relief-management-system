import { rows, sql } from '../server/db.mjs';

try {
  const [role] = await rows(sql, "SHOW COLUMNS FROM users LIKE 'role'");
  if (!role) throw new Error('Initialize the MySQL schema before running migrations');
  if (role.Type.includes("'coordinator'")) {
    // Preserve user IDs for existing requests, allocations, and reports.
    await rows(sql, "ALTER TABLE users MODIFY role ENUM('admin','coordinator','volunteer') DEFAULT NULL");
    const retired = await rows(sql, "UPDATE users SET role=NULL WHERE role='coordinator'");
    await rows(sql, "ALTER TABLE users MODIFY role ENUM('admin','volunteer') DEFAULT NULL");
    console.log('Disabled retired accounts:', retired.affectedRows);
  }
  console.log('MySQL user roles are up to date');
} finally {
  await sql.end();
}
