import { z } from 'zod';
import { documents, event, reportCollections, rows, sql, transaction } from './db.mjs';
import { fieldSummaries } from './reports.mjs';
import { distribution, shortages, unattended } from './analytics.mjs';
import { createSession, passwordMatches, session, sessionCookie } from './security.mjs';

const id = z.number().int().positive().max(2147483647);
const count = z.number().int().min(0).max(2147483647);
const name = z.string().trim().min(1).max(120);
const statuses = ['Requested','Approved','Allocated','Dispatched','In Transit','Delivered','Confirmed'];
const admin = ['admin'];
const all = [...admin, 'volunteer'];
const routes = [];
const loginLimits = new Map();

function route(method, path, roles, action) {
  routes.push({ method, pattern: new RegExp('^/api' + path + '$'), roles, action });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function body(request, schema) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    throw new HttpError(415, 'Use application/json');
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > 65536) throw new HttpError(413, 'Request body exceeds 64 KiB');
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new HttpError(400, 'Invalid JSON'); }
  return schema.parse(value);
}

function numberFilter(search, key, schema = id) {
  const value = search.get(key);
  return value === null || value === '' ? null : schema.parse(Number(value));
}

function like(search) {
  return '%' + (search.get('q') || '').slice(0, 120).replace(/[!%_]/g, '!$&') + '%';
}

async function exists(db, query, params, message) {
  const [row] = await rows(db, query, params);
  if (!row) throw new HttpError(404, message);
  return row;
}

async function recalc(db, requestId = null, campId = null, resourceId = null, disasterId = null) {
  await rows(db, 'CALL recalculate_priority(?,?,?,?)', [requestId, campId, resourceId, disasterId]);
}

route('POST', '/auth/login', null, async ({ request, response }) => {
  const { email, password } = await body(request, z.object({
    email: z.email().max(254), password: z.string().min(1).max(200)
  }));
  const now = Date.now();
  for (const [address, limit] of loginLimits) if (limit.until <= now) loginLimits.delete(address);
  const address = request.socket.remoteAddress;
  const limit = loginLimits.get(address) || { attempts: 0, until: now + 60000 };
  if (limit.attempts >= 12) throw new HttpError(429, 'Too many sign-in attempts. Try again in a minute.');
  limit.attempts++;
  loginLimits.set(address, limit);
  const [user] = await rows(sql, "SELECT * FROM users WHERE email=? AND role IN ('admin','volunteer')", [email.toLowerCase()]);
  if (!passwordMatches(password, user?.password_hash)) throw new HttpError(401, 'Invalid email or password');
  response.setHeader('Set-Cookie', sessionCookie(await createSession(user)));
  return { id: user.id, email: user.email, role: user.role };
});
route('GET', '/auth/me', all, ({ user }) => user);
route('POST', '/auth/logout', all, ({ response }) => {
  response.setHeader('Set-Cookie', sessionCookie(''));
  return { ok: true };
});

route('GET', '/disasters', all, () => rows(sql, 'SELECT * FROM disasters ORDER BY name'));
route('POST', '/disasters', admin, async ({ request }) => {
  const value = await body(request, z.object({ name, severity: z.number().int().min(1).max(5) }));
  return transaction(async db => {
    const result = await rows(db, 'INSERT INTO disasters(name,severity) VALUES (?,?)', [value.name,value.severity]);
    await event(db, 'disaster_updated', { disasterId: result.insertId });
    return { id: result.insertId };
  });
});
route('PATCH', '/disasters/(\\d+)', admin, async ({ request, params }) => {
  const disasterId = id.parse(Number(params[0]));
  const { severity } = await body(request, z.object({ severity: z.number().int().min(1).max(5) }));
  return transaction(async db => {
    await exists(db, 'SELECT id FROM disasters WHERE id=? FOR UPDATE', [disasterId], 'Disaster not found');
    await rows(db, 'UPDATE disasters SET severity=? WHERE id=?', [severity, disasterId]);
    await recalc(db, null, null, null, disasterId);
    await event(db, 'disaster_updated', { disasterId });
    return { id: disasterId };
  });
});
route('GET', '/areas', all, () => rows(sql, 'SELECT * FROM affected_areas ORDER BY name'));
route('POST', '/areas', admin, async ({ request }) => {
  const { disasterId, name: label } = await body(request, z.object({ disasterId: id, name }));
  return transaction(async db => {
    const result = await rows(db, 'INSERT INTO affected_areas(disaster_id,name) VALUES (?,?)', [disasterId,label]);
    await event(db, 'area_updated', { areaId: result.insertId, disasterId });
    return { id: result.insertId };
  });
});
route('GET', '/camps', all, ({ search }) => {
  const disaster = numberFilter(search, 'disasterId');
  const priority = numberFilter(search,'minPriority',count.max(100));
  const status = search.get('status') ? z.enum(statuses).parse(search.get('status')) : null;
  const query = like(search);
  return rows(sql, `SELECT c.* FROM camp_directory c WHERE (? IS NULL OR c.disaster_id=?)
    AND (c.name LIKE ? ESCAPE '!' OR c.area LIKE ? ESCAPE '!')
    AND ((? IS NULL AND ? IS NULL) OR EXISTS (
      SELECT 1 FROM requests q WHERE q.camp_id=c.id AND (? IS NULL OR q.status=?)
      AND (? IS NULL OR q.priority>=?)
    )) ORDER BY c.name`, [disaster,disaster,query,query,status,priority,status,status,priority,priority]);
});
route('POST', '/camps', admin, async ({ request }) => {
  const { name: label, areaId, population } = await body(request, z.object({ name, areaId: id, population: count }));
  return transaction(async db => {
    const result = await rows(db, "INSERT INTO locations(name,kind,area_id,population) VALUES (?,'camp',?,?)",
      [label,areaId,population]);
    await event(db, 'camp_updated', { campId: result.insertId });
    return { id: result.insertId };
  });
});
route('PATCH', '/camps/(\\d+)', admin, async ({ request, params }) => {
  const campId = id.parse(Number(params[0]));
  const { population } = await body(request, z.object({ population: count }));
  return transaction(async db => {
    await exists(db, "SELECT id FROM locations WHERE id=? AND kind='camp' FOR UPDATE", [campId], 'Camp not found');
    await rows(db, 'UPDATE locations SET population=? WHERE id=?', [population,campId]);
    await recalc(db, null, campId);
    await event(db, 'camp_updated', { campId });
    return { id: campId };
  });
});
route('GET', '/locations', admin, () => rows(sql, 'SELECT id,name,kind FROM locations ORDER BY kind,name'));
route('POST', '/locations', admin, async ({ request }) => {
  const { name: label } = await body(request, z.object({ name }));
  return transaction(async db => {
    const result = await rows(db, "INSERT INTO locations(name,kind) VALUES (?,'warehouse')", [label]);
    await event(db, 'location_updated', { locationId: result.insertId });
    return { id: result.insertId };
  });
});
route('GET', '/resources', all, () => rows(sql, 'SELECT * FROM resources ORDER BY name'));
route('POST', '/resources', admin, async ({ request }) => {
  const { name: label, unit } = await body(request, z.object({ name, unit: z.string().trim().min(1).max(40) }));
  return transaction(async db => {
    const result = await rows(db, 'INSERT INTO resources(name,unit) VALUES (?,?)', [label,unit]);
    await event(db, 'resource_updated', { resourceId: result.insertId });
    return { id: result.insertId };
  });
});
route('GET', '/inventory', admin, async ({ search }) => {
  const location = numberFilter(search,'locationId');
  return {
    totals: await rows(sql, 'SELECT * FROM stock_totals ORDER BY resource'),
    locations: await rows(sql, 'SELECT * FROM stock_by_location WHERE (? IS NULL OR location_id=?) ORDER BY location,resource', [location,location])
  };
});
route('PUT', '/inventory', admin, async ({ request }) => {
  const data = await body(request, z.object({ locationId:id, resourceId:id, quantity:count, threshold:count }));
  return transaction(async db => {
    await rows(db, `INSERT INTO inventory(location_id,resource_id,quantity,threshold) VALUES (?,?,?,?) AS incoming
      ON DUPLICATE KEY UPDATE quantity=incoming.quantity,threshold=incoming.threshold`,
    [data.locationId,data.resourceId,data.quantity,data.threshold]);
    await recalc(db, null, null, data.resourceId);
    await event(db, 'inventory_saved', { locationId: data.locationId, resourceId: data.resourceId });
    return data;
  });
});

route('GET', '/requests', admin, ({ search }) => {
  const disaster = numberFilter(search,'disasterId');
  const priority = numberFilter(search,'minPriority',count.max(100));
  const status = search.get('status') ? z.enum(statuses).parse(search.get('status')) : null;
  const query = like(search);
  return rows(sql, `SELECT * FROM request_details WHERE (? IS NULL OR disaster_id=?) AND (? IS NULL OR status=?)
    AND (? IS NULL OR priority>=?) AND (camp LIKE ? ESCAPE '!' OR resource LIKE ? ESCAPE '!' OR CAST(id AS CHAR) LIKE ? ESCAPE '!')
    ORDER BY critical DESC,priority DESC,created_at,id LIMIT 250`, [disaster,disaster,status,status,priority,priority,query,query,query]);
});
route('POST', '/requests', admin, async ({ request, user }) => {
  const data = await body(request, z.object({ campId:id, resourceId:id, quantity:id, urgency:z.number().int().min(1).max(5) }));
  return transaction(async db => {
    const result = await rows(db, `INSERT INTO requests(camp_id,resource_id,created_by,quantity,urgency)
      VALUES (?,?,?,?,?)`, [data.campId,data.resourceId,user.id,data.quantity,data.urgency]);
    await recalc(db,result.insertId);
    return exists(db,'SELECT * FROM request_details WHERE id=?',[result.insertId],'Request not found');
  });
});
route('GET', '/priority', admin, ({ search }) => {
  const disaster = numberFilter(search, 'disasterId');
  return rows(sql, 'SELECT * FROM live_priority WHERE (? IS NULL OR disaster_id=?) ORDER BY queue_position LIMIT 250',
    [disaster,disaster]);
});
route('GET', '/allocations', admin, () => rows(sql, `SELECT a.*,q.quantity,q.resource,q.unit,q.camp,q.status,l.name AS source
  FROM allocations a JOIN request_details q ON q.id=a.request_id JOIN locations l ON l.id=a.source_id
  ORDER BY a.id DESC LIMIT 250`));
route('POST', '/allocations', admin, async ({ request, user }) => {
  const { requestId, sourceId } = await body(request, z.object({ requestId:id, sourceId:id }));
  for (let attempt = 0; ; attempt++) {
    try {
      const [result] = await rows(sql, 'CALL allocate_request(?,?,?)', [requestId,sourceId,user.id]);
      return result[0];
    } catch (error) {
      if (attempt >= 2 || !['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw error;
    }
  }
});
route('GET', '/requests/(\\d+)/delivery', admin, async ({ params }) => {
  const requestId = id.parse(Number(params[0]));
  const current = await exists(sql,'SELECT * FROM request_details WHERE id=?',[requestId],'Request not found');
  return { current, history: await rows(sql,'SELECT * FROM delivery_history WHERE request_id=? ORDER BY id',[requestId]) };
});
route('PATCH', '/requests/(\\d+)/delivery', admin, async ({ request, params }) => {
  const requestId = id.parse(Number(params[0]));
  const { status } = await body(request, z.object({ status:z.enum(statuses.filter(value => value !== 'Allocated' && value !== 'Requested')) }));
  return transaction(async db => {
    const current = await exists(db, 'SELECT status,resource_id FROM requests WHERE id=? FOR UPDATE', [requestId], 'Request not found');
    if (current.status !== status) {
      await rows(db, 'UPDATE requests SET status=? WHERE id=?', [status,requestId]);
      if (status === 'Confirmed') await recalc(db,null,null,current.resource_id);
    }
    return { id:requestId,status };
  });
});

route('GET', '/volunteers', admin, () => rows(sql,`SELECT v.user_id,u.email,COALESCE(a.available,0) AS available,a.updated_at
  FROM volunteers v JOIN users u ON u.id=v.user_id LEFT JOIN availability a ON a.user_id=v.user_id ORDER BY u.email`));
route('GET', '/availability/me', ['volunteer'], async ({ user }) => {
  const [result] = await rows(sql, 'SELECT * FROM availability WHERE user_id=?', [user.id]);
  return result || { available: false };
});
route('PUT', '/availability/me', ['volunteer'], async ({ request, user }) => {
  const { available } = await body(request, z.object({ available:z.boolean() }));
  return transaction(async db => {
    await rows(db, `INSERT INTO availability(user_id,available) VALUES (?,?) AS incoming
      ON DUPLICATE KEY UPDATE available=incoming.available`, [user.id,available]);
    await event(db,'volunteer_availability',{ userId:user.id, available });
    return { available };
  });
});
route('GET', '/notifications', admin, () => rows(sql,
  'SELECT id,event_type AS type,payload,created_at AS createdAt FROM notifications ORDER BY id DESC LIMIT 80'));

const reportSchema = z.object({
  collection: z.enum(reportCollections),
  disasterId:id, campId:id, requestId:id.optional(), reportType:name, title:name,
  description:z.string().trim().min(1).max(4000), affectedPopulation:count.optional(),
  details:z.record(z.string(),z.union([z.string().max(1000),z.number(),z.boolean(),z.null()])).optional()
});
route('POST', '/reports', all, async ({ request, user, response }) => {
  const { collection, ...report } = await body(request, reportSchema);
  await exists(sql,'SELECT id FROM camp_directory WHERE id=? AND disaster_id=?',[report.campId,report.disasterId],'Camp does not belong to this disaster');
  if (report.requestId) {
    await exists(sql,'SELECT id FROM requests WHERE id=? AND camp_id=?',[report.requestId,report.campId],'Request does not belong to this camp');
  }
  const result = await documents.collection(collection).insertOne({
    ...report, submittedBy:user.id, timestamp:new Date(), processed:false
  });
  response.statusCode = 202;
  return { id:result.insertedId.toHexString() };
});
route('GET', '/reports', all, async ({ search, user }) => {
  const filter = {};
  for (const key of ['disasterId','campId']) {
    const value = numberFilter(search,key);
    if (value !== null) filter[key] = value;
  }
  if (user.role === 'volunteer') filter.submittedBy = user.id;
  if (search.get('reportType')) filter.reportType = name.parse(search.get('reportType'));
  const query = search.get('q')?.trim();
  if (query) filter.$text = { $search: query.slice(0,120) };
  const selected = search.get('collection');
  const collections = selected ? [z.enum(reportCollections).parse(selected)] : reportCollections;
  const groups = await Promise.all(collections.map(async collection =>
    (await documents.collection(collection).find(filter).sort({ timestamp:-1, _id:-1 }).limit(100).toArray())
      .map(report => ({ ...report, collection }))));
  return groups.flat().sort((a,b) => b.timestamp-a.timestamp).slice(0,100);
});

route('GET', '/analytics', admin, async ({ search }) => {
  const disaster = numberFilter(search,'disasterId');
  const [distributionRows, shortageRows, unattendedRows, reports] = await Promise.all([
    rows(sql,distribution,[disaster,disaster]), rows(sql,shortages),
    rows(sql,unattended,[disaster,disaster]), fieldSummaries(disaster)
  ]);
  return { distribution:distributionRows, shortages:shortageRows, unattended:unattendedRows, reports };
});

export async function api(request, response, url, origin) {
  response.setHeader('Content-Type','application/json; charset=utf-8');
  response.setHeader('Cache-Control','no-store');
  response.setHeader('X-Content-Type-Options','nosniff');
  try {
    const handler = routes.find(entry => entry.method === request.method && entry.pattern.test(url.pathname));
    if (!handler) throw new HttpError(404,'Endpoint not found');
    if (request.method !== 'GET' && request.headers.origin !== origin) throw new HttpError(403,'Invalid origin');
    const user = handler.roles ? await session(request) : null;
    if (handler.roles && !user) throw new HttpError(401,'Sign in to continue');
    if (handler.roles && !handler.roles.includes(user.role)) throw new HttpError(403,'Your role cannot perform this action');
    const result = await handler.action({
      request,response,user,search:url.searchParams,params:handler.pattern.exec(url.pathname).slice(1)
    });
    if (request.method === 'POST' && response.statusCode === 200 && !url.pathname.startsWith('/api/auth/')) response.statusCode = 201;
    response.end(JSON.stringify(result));
  } catch (error) {
    let status = error.status || 500;
    let message = error.message;
    if (error instanceof z.ZodError) {
      status = 400;
      message = error.issues.map(issue => [issue.path.join('.'),issue.message].filter(Boolean).join(' ')).join('; ');
    } else if (error.sqlState === '45000') {
      status = 409;
      message = error.sqlMessage;
    } else if (['ER_DUP_ENTRY','ER_NO_REFERENCED_ROW_2','ER_CHECK_CONSTRAINT_VIOLATED'].includes(error.code)) {
      status = 409;
      message = 'The record conflicts with existing data or a database constraint';
    } else if (status === 500) {
      console.error(error);
      message = 'The server could not complete the request';
    }
    response.statusCode = status;
    response.end(JSON.stringify({ error:message }));
  }
}
