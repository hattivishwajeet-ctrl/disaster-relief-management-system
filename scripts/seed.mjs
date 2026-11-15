import { hashPassword } from '../server/security.mjs';
import { event, rows, sql, transaction } from '../server/db.mjs';

const roles = ['admin','volunteer'];
const accounts = roles.map(role => {
  const password = process.env[role.toUpperCase() + '_PASSWORD'];
  if (!password || password.length < 12) throw new Error('Set ' + role.toUpperCase() + '_PASSWORD to at least 12 characters');
  return { role,email:role+'@relief.local',hash:hashPassword(password) };
});

try {
  const result = await transaction(async db => {
    const users = {};
    for (const { role,email,hash } of accounts) {
      await rows(db,'INSERT IGNORE INTO users(email,password_hash,role) VALUES (?,?,?)',[email,hash,role]);
      [users[role]] = await rows(db,'SELECT id FROM users WHERE email=? AND role=?',[email,role]);
      if (!users[role]) throw new Error('Existing account has an incompatible role: ' + email);
    }
    await rows(db,'INSERT IGNORE INTO volunteers(user_id) VALUES (?)',[users.volunteer.id]);
    await rows(db,'INSERT IGNORE INTO availability(user_id,available) VALUES (?,1)',[users.volunteer.id]);
    const disaster = await rows(db,"INSERT IGNORE INTO disasters(name,severity) VALUES ('Riverbend Flood',5)");
    if (!disaster.affectedRows) return null;
    const area = await rows(db,"INSERT INTO affected_areas(disaster_id,name) VALUES (?,'East Bank')",[disaster.insertId]);
    const camp = await rows(db,"INSERT INTO locations(name,kind,area_id,population) VALUES ('East Bank Camp','camp',?,80)",[area.insertId]);
    const warehouse = await rows(db,"INSERT INTO locations(name,kind) VALUES ('Central Warehouse','warehouse')");
    const resource = await rows(db,"INSERT INTO resources(name,unit) VALUES ('Drinking water','L')");
    await rows(db,'INSERT INTO inventory(location_id,resource_id,quantity,threshold) VALUES (?,?,100,50),(?,?,0,0)',
      [warehouse.insertId,resource.insertId,camp.insertId,resource.insertId]);
    const request = await rows(db,'INSERT INTO requests(camp_id,resource_id,created_by,quantity,urgency) VALUES (?,?,?,?,5)',
      [camp.insertId,resource.insertId,users.admin.id,200]);
    await rows(db,'CALL recalculate_priority(?,NULL,NULL,NULL)',[request.insertId]);
    await event(db,'demo_seeded',{ disasterId:disaster.insertId, requestId:request.insertId });
    return { requestId:request.insertId,campId:camp.insertId,disasterId:disaster.insertId };
  });
  console.log('Accounts:', accounts.map(account => account.email).join(', '));
  if (result) console.log('Demo IDs:',result);
  else console.log('Riverbend Flood already exists.');
} finally {
  await sql.end();
}
