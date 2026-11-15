'use client';

import { useCallback, useEffect, useState } from 'react';

const lifecycle = ['Requested','Approved','Allocated','Dispatched','In Transit','Delivered','Confirmed'];
const human = value => String(value).replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2');
const eventLabels = {
  critical_request:'Critical request', shortage_alert:'Stock below threshold', priority_updated:'Priority changed',
  report_received:'New field report', allocation_updated:'Allocation recorded',
  delivery_status_changed:'Delivery status changed', volunteer_availability:'Volunteer availability changed'
};

async function api(path, method = 'GET', data) {
  const response = await fetch('/api' + path, {
    method, ...(data === undefined ? {} : { headers: { 'Content-Type':'application/json' }, body:JSON.stringify(data) })
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error);
    error.status = response.status;
    throw error;
  }
  return result;
}

function field(key, label, options = {}) { return { key,label,...options }; }
function choices(items) { return items.map(item => typeof item === 'string' ? [item,item] : [item.id,item.name]); }

function Fields({ title, fields, submit, action = 'Save', onSave, compact = false }) {
  const [message,setMessage] = useState('');
  const [error,setError] = useState(false);
  const [pending,setPending] = useState(false);
  async function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const data = {};
    for (const entry of fields) {
      const value = values.get(entry.key);
      if (value !== '' && value !== null) data[entry.key] = entry.number ? Number(value) : value;
    }
    setPending(true);
    setMessage('');
    try {
      await submit(data);
      if (!compact) setMessage('Saved');
      onSave?.();
    } catch (problem) {
      setError(true);
      setMessage(problem.message);
    } finally {
      setPending(false);
    }
  }
  return <form className={compact ? 'filters' : 'panel form-panel'} onSubmit={onSubmit}>
    {title && <h2>{title}</h2>}
    <div className="fields">{fields.map(entry => <label key={entry.key}>{entry.label}
      {entry.options ? <select name={entry.key} required={!entry.optional} defaultValue={entry.defaultValue ?? ''}>
        <option value="">{entry.optional ? 'Any' : 'Select…'}</option>
        {entry.options.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select> : entry.type === 'textarea' ?
        <textarea name={entry.key} required={!entry.optional} maxLength={4000} rows={3} /> :
        <input name={entry.key} type={entry.type || (entry.number ? 'number' : 'text')}
          min={entry.min} max={entry.max} maxLength={entry.number ? undefined : entry.maxLength ?? 120}
          required={!entry.optional} defaultValue={entry.defaultValue} autoComplete={entry.autoComplete} />}
    </label>)}</div>
    <button disabled={pending} onClick={() => setError(false)}>{pending ? 'Working…' : action}</button>
    {message && <p className={error ? 'error' : 'success'} role={error ? 'alert' : 'status'}>{message}</p>}
  </form>;
}

function Table({ title, data, columns, render = {} }) {
  return <section className="panel">
    <h2>{title}</h2>
    {!data?.length ? <p className="muted">No records to display.</p> : <div className="table-scroll"><table>
      <thead><tr>{columns.map(([key,label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
      <tbody>{data.map((row,index) => <tr key={row._id ?? row.id ?? index}>
        {columns.map(([key]) => <td key={key}>{render[key] ? render[key](row) : row[key] ?? '—'}</td>)}
      </tr>)}</tbody>
    </table></div>}
  </section>;
}

function Status({ value }) { return <span className="tag">{value}</span>; }

function Login({ onLogin }) {
  return <main className="login">
    <div className="login-story"><Brand /><h1>Disaster relief coordination</h1>
    </div>
    <div className="login-form"><Fields title="Sign in" action="Sign in" fields={[
      field('email','Email',{ type:'email',maxLength:254,autoComplete:'username' }),
      field('password','Password',{ type:'password',maxLength:200,autoComplete:'current-password' })
    ]} submit={async data => onLogin(await api('/auth/login','POST',data))} /></div>
  </main>;
}

function Brand() {
  return <div className="brand"><span aria-hidden="true">✚</span> Relief Operations</div>;
}

const tabs = ['Overview','Requests','Allocation','Inventory','Camps','Reports','Analytics','Administration','My availability'];
const access = {
  admin:tabs.slice(0,8), volunteer:['Camps','Reports','My availability']
};
const tabPath = tab => tab.toLowerCase().replaceAll(' ','-');
const descriptions = {
  Overview:'Monitor the priority queue, delivery progress, and incoming alerts.',
  Requests:'Create requests and track each shipment through confirmation.',
  Allocation:'Assign stock from a warehouse or another camp to an approved request.',
  Inventory:'Review stock totals and quantities at each location.',
  Camps:'Find relief camps and view affected populations.',
  Reports:'Submit and review emergency reports and field observations.',
  Analytics:'Review resource distribution, stock shortages, and field-report summaries.',
  Administration:'Manage disasters, affected areas, locations, and resources.',
  'My availability':'Tell admins whether you are available to respond.'
};

function useLive(enabled,refresh) {
  const [state,setState] = useState('Connecting');
  useEffect(() => {
    if (!enabled) return;
    let socket, retry, update, disposed = false;
    function connect() {
      socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/events');
      socket.onopen = () => { setState('Live'); refresh(); };
      socket.onmessage = () => {
        clearTimeout(update);
        update = setTimeout(refresh,150);
      };
      socket.onclose = () => {
        if (disposed) return;
        setState('Reconnecting');
        retry = setTimeout(connect,2000);
      };
    }
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      clearTimeout(update);
      socket?.close();
    };
  },[enabled,refresh]);
  return state;
}

const requestColumns = [['id','Request'],['camp','Camp'],['resource','Resource'],['quantity','Quantity'],['priority','Priority'],['status','Status']];
const requestCells = {
  id:row => '#' + row.id, quantity:row => row.quantity + ' ' + row.unit,
  priority:row => <span className={row.critical ? 'score critical' : 'score'}>{row.priority}{Boolean(row.critical) && ' · Critical'}</span>,
  status:row => <Status value={row.status} />
};
const formatTime = value => value ? new Date(value).toLocaleString() : '—';

export default function Workspace() {
  const [user,setUser] = useState(undefined);
  const [startupError,setStartupError] = useState('');
  const logout = useCallback(() => setUser(null),[]);
  useEffect(() => {
    api('/auth/me').then(setUser).catch(error => {
      if (error.status === 401) setUser(null);
      else setStartupError(error.message);
    });
  },[]);
  if (startupError) return <main className="loading"><p role="alert">{startupError}</p><button onClick={() => location.reload()}>Retry</button></main>;
  if (user === undefined) return <main className="loading" role="status">Loading Relief Operations…</main>;
  if (!user) return <Login onLogin={setUser} />;
  return <Dashboard user={user} onLogout={logout} />;
}

function Dashboard({ user,onLogout }) {
  const volunteer = user.role === 'volunteer';
  const admin = user.role === 'admin';
  const [tab,setTab] = useState(access[user.role][0]);
  const [filters,setFilters] = useState({});
  const [version,setVersion] = useState(0);
  const [data,setData] = useState(null);
  const [problem,setProblem] = useState('');
  const [delivery,setDelivery] = useState(null);
  const refresh = useCallback(() => setVersion(value => value+1),[]);
  const live = useLive(!volunteer,refresh);
  useEffect(() => {
    function selectFromUrl() {
      const allowed = access[user.role];
      const match = allowed.find(item => '#' + tabPath(item) === location.hash);
      const selected = match || allowed[0];
      if (!match) history.replaceState(null,'','#' + tabPath(selected));
      setData(null);
      setFilters({});
      setProblem('');
      setDelivery(null);
      setTab(selected);
    }
    selectFromUrl();
    window.addEventListener('hashchange',selectFromUrl);
    return () => window.removeEventListener('hashchange',selectFromUrl);
  },[user.role]);
  const pendingReports = volunteer && tab === 'Reports' && data?.selected.some(report => !report.processed);
  useEffect(() => {
    if (!pendingReports) return;
    const timer = setTimeout(refresh,1500);
    return () => clearTimeout(timer);
  },[pendingReports,data,refresh]);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(filters).toString();
    const selected = '/'+ ({ Overview:'priority', Requests:'requests', Allocation:'allocations', Inventory:'inventory',
      Camps:'camps', Reports:'reports', Analytics:'analytics', 'My availability':'availability/me' }[tab] || 'areas');
    const paths = { selected:selected + (query ? '?' + query : ''), disasters:'/disasters' };
    if (['Requests','Allocation','Reports'].includes(tab)) paths.camps = '/camps';
    if (['Requests','Inventory','Administration'].includes(tab)) paths.resources = '/resources';
    if (['Allocation','Inventory'].includes(tab)) paths.locations = '/locations';
    if (tab === 'Allocation') paths.approved = '/requests?status=Approved';
    if (tab === 'Camps' && admin) paths.areas = '/areas';
    if (tab === 'Overview') Object.assign(paths,{ alerts:'/notifications', deliveries:'/allocations', volunteers:'/volunteers' });
    Promise.all(Object.entries(paths).map(async ([key,path]) => [key,await api(path)])).then(results => {
      if (active) { setData(Object.fromEntries(results)); setProblem(''); }
    }).catch(error => {
      if (!active) return;
      if (error.status === 401) onLogout();
      else setProblem(error.message);
    });
    return () => { active = false; };
  },[tab,filters,version,admin,onLogout]);

  const select = (key,label,items,optional = false) => field(key,label,{ options:choices(items),number:true,optional });
  const save = (path,method = 'POST') => value => api(path,method,value);
  const form = (title,fields,path,method,action) => <Fields key={title} title={title} fields={fields} submit={save(path,method)} onSave={refresh} action={action} />;
  const disasterFilter = data && select('disasterId','Disaster',data.disasters,true);
  async function deliveryDetail(requestId) {
    try { setDelivery(await api('/requests/'+requestId+'/delivery')); }
    catch (error) { setProblem(error.message); }
  }
  async function advance(requestId,status) {
    try {
      await api('/requests/'+requestId+'/delivery','PATCH',{status});
      await deliveryDetail(requestId);
      refresh();
    } catch (error) { setProblem(error.message); }
  }
  const statusAction = row => {
    const requestId = row.request_id || row.id;
    const next = lifecycle[lifecycle.indexOf(row.status)+1];
    return <div className="row-actions">
      <button className="secondary" onClick={() => deliveryDetail(requestId)}>History</button>
      {next && next !== 'Allocated' && <button onClick={() => advance(requestId,next)}>{next === 'Approved' ? 'Approve' : 'Mark ' + next.toLowerCase()}</button>}
    </div>;
  };
  let content;
  if (data) {
    const current = data.selected;
    switch (tab) {
      case 'Overview':
        content = <>
          <div className="stats">
            <div><span>Requests in queue</span><strong>{current.length}</strong></div>
            <div><span>Critical in queue</span><strong>{current.filter(row => row.critical).length}</strong></div>
            <div><span>Active deliveries</span><strong>{data.deliveries.filter(row => row.status !== 'Confirmed').length}</strong></div>
            <div><span>Available volunteers</span><strong>{data.volunteers.filter(row => row.available).length}</strong></div>
          </div>
          <Table title="Priority queue" data={current} columns={[[ 'queue_position','Rank'],...requestColumns,['actions','Actions']]} render={{...requestCells,actions:statusAction}} />
          <Table title="Delivery tracker" data={data.deliveries} columns={[[ 'request_id','Request'],['camp','Destination'],['source','Source'],['status','Status'],['actions','Actions']]}
            render={{ ...requestCells,request_id:row => '#' + row.request_id,actions:statusAction }} />
          <Table title="Recent notifications" data={data.alerts} columns={[[ 'type','Event'],['payload','Details'],['createdAt','Time']]} render={{
            type:row => eventLabels[row.type] || human(row.type),
            payload:row => Object.entries(row.payload).map(([key,value]) => human(key)+' '+(value ?? '—')).join(' · '),
            createdAt:row => formatTime(row.createdAt)
          }} />
          <Table title="Volunteer availability" data={data.volunteers} columns={[[ 'email','Volunteer'],['available','Status'],['updated_at','Updated']]}
            render={{ available:row => row.available ? 'Available' : 'Unavailable',updated_at:row => formatTime(row.updated_at) }} />
        </>;
        break;
      case 'Requests':
        content = <>
          <Fields key={tab} compact action="Filter" fields={[disasterFilter,field('status','Status',{ options:choices(lifecycle),optional:true }),
            field('minPriority','Minimum priority',{ number:true,min:0,max:100,optional:true }),field('q','Search requests',{optional:true})]} submit={setFilters} />
          <Table title="Requests" data={current} columns={[...requestColumns,['actions','Actions']]} render={{...requestCells,actions:statusAction}} />
          {form('New request',[select('campId','Camp',data.camps),select('resourceId','Resource',data.resources),
            field('quantity','Quantity',{number:true,min:1}),field('urgency','Urgency (1–5)',{number:true,min:1,max:5})],'/requests',undefined,'Create request')}
        </>;
        break;
      case 'Allocation':
        content = <>
          {form('Allocate stock',[select('requestId','Approved request',data.approved.map(row => ({
            id:row.id,name:'#'+row.id+' · '+row.camp+' · '+row.quantity+' '+row.unit+' '+row.resource+' · priority '+row.priority
          }))),select('sourceId','Source location',data.locations)],'/allocations',undefined,'Allocate stock')}
          <Table title="Allocations" data={current} columns={[[ 'request_id','Request'],['source','Source'],['camp','Destination'],['resource','Resource'],['quantity','Quantity'],['status','Status']]} render={requestCells} />
        </>;
        break;
      case 'Inventory':
        content = <>
          <Fields key={tab} compact action="Filter" fields={[select('locationId','Stock location',data.locations,true)]} submit={setFilters} />
          <Table title="Inventory by location" data={current.locations} columns={[[ 'location','Location'],['kind','Type'],['resource','Resource'],['quantity','On hand'],['threshold','Alert threshold']]} render={requestCells} />
          <Table title="Total inventory" data={current.totals} columns={[[ 'resource','Resource'],['quantity','On hand']]} render={requestCells} />
          {admin && form('Set stock level',[select('locationId','Location',data.locations),select('resourceId','Resource',data.resources),
            field('quantity','On-hand quantity',{number:true,min:0}),field('threshold','Alert threshold',{number:true,min:0})],'/inventory','PUT')}
        </>;
        break;
      case 'Camps':
        content = <>
          <Fields key={tab} compact action="Filter" fields={[disasterFilter,field('q','Camp or area name',{optional:true}),
            field('status','Request status',{options:choices(lifecycle),optional:true}),
            field('minPriority','Minimum request priority',{number:true,min:0,max:100,optional:true})]} submit={setFilters} />
          <Table title="Camp directory" data={current} columns={[[ 'name','Camp'],['area','Area'],['disaster','Disaster'],['population','Affected population']]} />
          {admin && <div className="grid">
            {form('Add camp',[field('name','Name'),select('areaId','Affected area',data.areas),field('population','Population',{number:true,min:0})],'/camps')}
            <Fields title="Update camp population" fields={[select('campId','Camp',current),field('population','Population',{number:true,min:0})]}
              submit={({campId,population}) => api('/camps/'+campId,'PATCH',{population})} onSave={refresh} />
          </div>}
        </>;
        break;
      case 'Reports': {
        const types = [['emergency_reports','Emergency report'],['field_observations','Field observation']];
        content = <>
          <Fields key={tab} compact action="Filter" fields={[disasterFilter,select('campId','Camp',data.camps,true),
            field('collection','Collection',{options:types,optional:true}),field('reportType','Report type',{optional:true}),
            field('q','Search report text',{optional:true})]} submit={setFilters} />
          <Table title={volunteer ? 'My reports' : 'Field reports'} data={current} columns={[[ 'title','Report'],['description','Details'],['reportType','Type'],
            ['campId','Camp'],['timestamp','Submitted'],['processed','Processing']]} render={{
              campId:row => data.camps.find(camp => camp.id === row.campId)?.name ?? row.campId,
              timestamp:row => formatTime(row.timestamp),processed:row => row.processed ? 'Processed' : 'Pending'
            }} />
          <ReportForm camps={data.camps} types={types} refresh={refresh} />
        </>;
        break;
      }
      case 'Analytics':
        content = <>
          <Fields key={tab} compact action="Filter" fields={[disasterFilter]} submit={setFilters} />
          <Table title="Resource distribution" data={current.distribution} columns={[[ 'disaster','Disaster'],['resource','Resource'],['unit','Unit'],['requests','Requests'],['requested','Requested'],['allocated','Allocated'],['confirmed','Confirmed']]} />
          <Table title="Shortages across all locations" data={current.shortages} columns={[[ 'resource','Resource'],['unit','Unit'],['locations_below_threshold','Locations'],['deficit','Deficit']]} />
          <Table title="Unattended high-priority requests" data={current.unattended} columns={requestColumns.filter(([key]) => ['id','camp','resource','priority'].includes(key))} render={requestCells} />
          <Table title="Field-report summaries" data={current.reports} columns={[[ 'disasterId','Disaster'],['reportType','Report type'],['count','Reports'],['largestPopulation','Largest reported population'],['latest','Latest report']]}
            render={{ disasterId:row => data.disasters.find(disaster => disaster.id === row.disasterId)?.name ?? row.disasterId,latest:row => formatTime(row.latest) }} />
        </>;
        break;
      case 'Administration':
        content = <>
          <Table title="Disasters" data={data.disasters} columns={[[ 'name','Disaster'],['severity','Severity']]} />
          <Table title="Affected areas" data={current} columns={[[ 'name','Area'],['disaster_id','Disaster']]} render={{
            disaster_id:row => data.disasters.find(disaster => disaster.id === row.disaster_id)?.name
          }} />
          <div className="grid">
            {form('Add disaster',[field('name','Name'),field('severity','Severity (1–5)',{number:true,min:1,max:5})],'/disasters')}
            <Fields title="Update severity" fields={[select('disasterId','Disaster',data.disasters),field('severity','Severity (1–5)',{number:true,min:1,max:5})]}
              submit={({disasterId,severity}) => api('/disasters/'+disasterId,'PATCH',{severity})} onSave={refresh} />
            {form('Add affected area',[field('name','Name'),select('disasterId','Disaster',data.disasters)],'/areas')}
            {form('Add warehouse',[field('name','Name')],'/locations')}
            {form('Add resource',[field('name','Name'),field('unit','Unit',{maxLength:40})],'/resources')}
          </div>
        </>;
        break;
      default:
        content = <section className="panel"><h2>Current status</h2><Status value={current.available ? 'Available' : 'Unavailable'} />
          <button className="availability" onClick={async () => {
            try { await api('/availability/me','PUT',{available:!current.available}); refresh(); }
            catch (error) { setProblem(error.message); }
          }}>{current.available ? 'Mark unavailable' : 'Mark available'}</button></section>;
    }
  }

  return <div className="workspace">
    <aside className="sidebar"><Brand /><nav aria-label="Workspace">
      {access[user.role].map(item => <a key={item} href={'#'+tabPath(item)} aria-current={tab === item ? 'page' : undefined}>{item}</a>)}
    </nav><div className="account"><strong>{human(user.role)}</strong><span>{user.email}</span><button className="secondary" onClick={async () => {
      try { await api('/auth/logout','POST',{}); onLogout(); }
      catch (error) { if (error.status === 401) onLogout(); else setProblem(error.message); }
    }}>Sign out</button></div></aside>
    <main className="main">
      <header className="page-heading"><div><h1>{tab}</h1><p>{descriptions[tab]}</p></div>
        {!volunteer && <span className={live === 'Live' ? 'live online' : 'live'}>{live}</span>}</header>
      {problem && <p className="error" role="alert">{problem}</p>}
      {delivery && <section className="delivery"><button className="secondary" onClick={() => setDelivery(null)}>Close history</button>
        <Table title={'Delivery history · Request #' + delivery.current.id} data={delivery.history} columns={[[ 'status','Status'],['created_at','Recorded']]}
          render={{status:requestCells.status,created_at:row => formatTime(row.created_at)}} /></section>}
      {content || (!problem && <p role="status" className="muted">Loading records…</p>)}
    </main>
  </div>;
}

function ReportForm({ camps,types,refresh }) {
  return <Fields title="Submit field report" action="Submit report" onSave={refresh} fields={[
    field('collection','Collection',{options:types}),field('campId','Camp',{options:choices(camps),number:true}),
    field('requestId','Related request ID',{number:true,min:1,optional:true}),
    field('reportType','Report type'),field('title','Title'),
    field('affectedPopulation','Updated affected population',{number:true,min:0,optional:true}),
    field('description','Description',{type:'textarea'})
  ]} submit={report => api('/reports','POST',{ ...report,disasterId:camps.find(camp => camp.id === report.campId).disaster_id })} />;
}
