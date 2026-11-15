import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { rows, sql } from '../server/db.mjs';

const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
async function call(path, { method = 'GET', data, cookie, expected = 200 } = {}) {
  const response = await fetch(origin + '/api' + path,{
    method, headers:{ Origin:origin, ...(cookie ? { Cookie:cookie } : {}),
      ...(data === undefined ? {} : { 'Content-Type':'application/json' }) },
    ...(data === undefined ? {} : { body:JSON.stringify(data) })
  });
  const result = await response.json();
  assert.equal(response.status,expected,JSON.stringify(result));
  return { result,cookie:response.headers.get('set-cookie')?.split(';')[0] };
}

async function login(role) {
  const { cookie } = await call('/auth/login',{ method:'POST',data:{
    email:role.toLowerCase()+'@relief.local',password:process.env[role+'_PASSWORD']
  } });
  return cookie;
}

test('report raises priority from 70 to 92, allocation is atomic, and delivery reaches Confirmed', { timeout:45000 }, async t => {
  t.after(() => sql.end());
  const admin = await login('ADMIN');
  const volunteer = await login('VOLUNTEER');
  const suffix = randomUUID().slice(0,8);
  const create = async (path,data,cookie = admin) =>
    (await call(path,{ method:'POST',data,cookie,expected:201 })).result.id;

  const disasterId = await create('/disasters',{ name:'Test flood '+suffix,severity:5 });
  const areaId = await create('/areas',{ disasterId,name:'East Bank' });
  const campId = await create('/camps',{ areaId,name:'Camp '+suffix,population:80 });
  const competitor = await create('/camps',{ areaId,name:'Other camp '+suffix,population:150 });
  const sourceId = await create('/locations',{ name:'Warehouse '+suffix });
  const resourceId = await create('/resources',{ name:'Water '+suffix,unit:'L' });
  const stock = quantity => call('/inventory',{ method:'PUT',cookie:admin,
    data:{ locationId:sourceId,resourceId,quantity,threshold:50 } });
  await stock(100);
  const otherId = await create('/requests',{ campId:competitor,resourceId,quantity:200,urgency:5 });
  const requestId = await create('/requests',{ campId,resourceId,quantity:200,urgency:5 });
  const priorities = async () => (await call('/priority?disasterId='+disasterId,{ cookie:admin })).result;
  assert.deepEqual((await priorities()).map(row => [row.id,row.priority]),[[otherId,77],[requestId,70]]);
  await call('/allocations',{ method:'POST',cookie:volunteer,data:{ requestId,sourceId },expected:403 });

  assert.equal((await fetch(origin)).status,200);
  const socket = new WebSocket(origin.replace(/^http/,'ws')+'/events',{ headers:{ Cookie:admin,Origin:origin } });
  t.after(() => socket.terminate());
  const events = [];
  socket.on('message', message => events.push(JSON.parse(message)));
  await once(socket,'open');
  async function waitForEvent(type, matches) {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (events.some(entry => entry.type === type && matches(entry.payload))) return;
      await delay(150);
    }
    assert.fail('Missing WebSocket event ' + type);
  }
  const { result:report } = await call('/reports',{ method:'POST',cookie:volunteer,expected:202,
    data:{ collection:'emergency_reports',disasterId,campId,requestId,reportType:'population',
      title:'Population update '+suffix,description:'Survey found 300 affected residents',affectedPopulation:300 } });
  await waitForEvent('priority_updated',data => data.requestId === requestId && data.previousPriority === 70 && data.priority === 92);
  await waitForEvent('report_received',data => data.reportId === report.id);
  assert.deepEqual((await priorities()).map(row => [row.id,row.priority]),[[requestId,92],[otherId,77]]);
  const filteredCamps = (await call('/camps?disasterId='+disasterId+'&status=Requested&minPriority=90',
    { cookie:admin })).result;
  assert.deepEqual(filteredCamps.map(camp => camp.id),[campId]);
  const analytics = (await call('/analytics?disasterId='+disasterId,{ cookie:admin })).result;
  assert.equal(analytics.reports[0].largestPopulation,300);
  assert.equal(analytics.distribution[0].requests,2);
  const { result:reports } = await call('/reports?q=survey&collection=emergency_reports&campId='+campId,
    { cookie:volunteer });
  assert.deepEqual(reports.map(row => row._id),[report.id]);
  await rows(sql,'UPDATE requests SET created_at=CURRENT_TIMESTAMP(3)-INTERVAL 16 MINUTE WHERE id=?',[requestId]);
  await waitForEvent('critical_request',data => data.requestId === requestId);
  assert.equal((await priorities())[0].critical,1);

  const change = (id,status,expected = 200) => call('/requests/'+id+'/delivery',{
    method:'PATCH',cookie:admin,data:{ status },expected
  });
  await change(requestId,'Delivered',409);
  await change(requestId,'Approved');
  await change(otherId,'Approved');
  const allocate = (id,expected) => call('/allocations',{ method:'POST',cookie:admin,
    data:{ requestId:id,sourceId },expected });
  await allocate(requestId,409);
  const onHand = async locationId => (await call('/inventory?locationId='+locationId,{cookie:admin})).result.locations[0]?.quantity;
  assert.equal(await onHand(sourceId),100);
  assert.equal((await priorities()).find(row => row.id === requestId).status,'Approved');
  await stock(220);
  const attempts = await Promise.all([requestId,otherId].map(async id => {
    const response = await fetch(origin+'/api/allocations',{ method:'POST',
      headers:{ Origin:origin,Cookie:admin,'Content-Type':'application/json' },
      body:JSON.stringify({ requestId:id,sourceId }) });
    return { id,status:response.status };
  }));
  assert.deepEqual(attempts.map(result => result.status).sort(),[201,409]);
  const winner = attempts.find(result => result.status === 201).id;
  await waitForEvent('shortage_alert',data => data.locationId === sourceId);
  await waitForEvent('allocation_updated',data => data.requestId === winner);
  assert.equal(await onHand(sourceId),20);
  for (const status of ['Dispatched','In Transit','Delivered','Confirmed','Confirmed']) await change(winner,status);
  const { result:delivery } = await call('/requests/'+winner+'/delivery',{cookie:admin});
  assert.deepEqual(delivery.history.map(row => row.status),['Requested','Approved','Allocated','Dispatched','In Transit','Delivered','Confirmed']);
  assert.equal(await onHand(delivery.current.camp_id),200);
  await waitForEvent('delivery_status_changed',data => data.requestId === winner && data.status === 'Confirmed');
  await call('/availability/me',{ method:'PUT',cookie:volunteer,data:{ available:true } });
  await waitForEvent('volunteer_availability',data => data.available === true);
});
