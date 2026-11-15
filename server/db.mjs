import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

export const sql = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3307),
  database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD, timezone: 'Z', connectionLimit: 12
});
export const mongo = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/?replicaSet=relief&directConnection=true');
export const documents = mongo.db(process.env.MONGO_DATABASE || 'disaster_relief');
export const reportCollections = ['emergency_reports', 'field_observations'];

export async function transaction(work) {
  for (let attempt = 0; ; attempt++) {
    const connection = await sql.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      if (attempt >= 2 || !['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw error;
    } finally {
      connection.release();
    }
  }
}

export async function rows(db, query, params = []) {
  const [result] = await db.execute(query, params);
  return result;
}

export async function event(db, type, payload) {
  await rows(db, 'INSERT INTO notifications(event_type,payload) VALUES (?,?)', [type, JSON.stringify(payload)]);
}
