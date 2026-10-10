import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Filter, HeartHandshake, LayoutDashboard,
  LifeBuoy, Search, Settings, ShieldCheck, Users, Wallet, X, RefreshCw
} from 'lucide-react';
import './styles.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: ClipboardList },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'services', label: 'Service types', icon: HeartHandshake },
  { id: 'commissions', label: 'Commissions & payouts', icon: Wallet },
];

function IconButton({ label, children, onClick, className = '' }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function EmptyState({ icon: Icon = ClipboardList, title, description, action, onAction }) {
  return <div className="empty-state">
    <div className="empty-icon"><Icon size={23} /></div>
    <strong>{title}</strong>
    <p>{description}</p>
    {action && <button type="button" className="button button-secondary" onClick={onAction}>{action}</button>}
  </div>;
}

function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="heading-actions">{actions}</div>}
  </div>;
}

function OverviewPage({ apiState, refreshApi, onNavigate }) {
  const stats = [
    { label: 'New leads', value: '—', note: 'Awaiting initial review', icon: ClipboardList },
    { label: 'In follow-up', value: '—', note: 'Open and assigned enquiries', icon: Clock3 },
    { label: 'Services completed', value: '—', note: 'Verified service records', icon: HeartHandshake },
    { label: 'Commissions pending', value: '—', note: 'Awaiting owner approval', icon: Wallet },
  ];

  const sampleLeads = [
    {
      id: 'LD-1001',
      customer: 'Rahul Sharma',
      service: 'Road Ambulance',
      status: 'New',
      agent: 'Not assigned',
    },
    {
      id: 'LD-1002',
      customer: 'Priya Verma',
      service: 'Air Ambulance',
      status: 'In Follow-up',
      agent: 'Amit',
    },
    {
      id: 'LD-1003',
      customer: 'Mohit Jain',
      service: 'Body Transportation',
      status: 'Completed',
      agent: 'Neha',
    },
  ];

  return <>
    <PageHeading eyebrow="OPERATIONS OVERVIEW" title="Good day." description="Review enquiries, coordinate services, and keep every lead moving with care."
      actions={<button className="button button-primary" onClick={() => onNavigate('leads')}><ClipboardList size={16}/> View leads <ArrowUpRight size={16}/></button>} />
    <div className="stat-grid">{stats.map(({ label, value, note, icon: Icon }) => <article className="stat-card" key={label}>
      <div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18}/></span></div>
      <strong className="stat-value">{value}</strong><span className="stat-note">{note}</span>
    </article>)}</div>
    <div className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><h2>Lead activity</h2><p>Recent enquiries and follow-ups</p></div><button className="button button-quiet" onClick={() => onNavigate('leads')}>View all <ArrowUpRight size={14}/></button></div>
        <EmptyState icon={Activity} title="No live lead data yet" description="Lead activity will appear here after the leads API and database are connected." action="Open lead management" onAction={() => onNavigate('leads')} />
      </article>
      <article className="panel">
        <div className="panel-head"><div><h2>Commission approvals</h2><p>Owner review queue</p></div><Wallet size={19} color="#2D8C83"/></div>
        <div className="approval-box"><div className="approval-symbol"><ShieldCheck size={19}/></div><strong>Approval queue not connected</strong><p>Verified completed services will create eligible fixed-commission records for owner review.</p><button className="button button-secondary" onClick={() => onNavigate('commissions')}>Review commission area</button></div>
        <div className="note-line">Payments are recorded manually by an authorized owner.</div>
      </article>
    </div>
    <article className="panel api-panel">
      <div className="panel-head"><div><h2>Backend connection</h2><p>Development API health check</p></div><button className="button button-secondary" onClick={refreshApi}><RefreshCw size={14}/> Check again</button></div>
      <div className={`connection-row ${apiState.status}`}><span className="connection-dot"/><div><strong>{apiState.label}</strong><p>{apiState.detail}</p></div></div>
    </article>
  </>;
}

function LeadsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const sampleLeads = [
    {
      id: 'LD-1001',
      customer: 'Rahul Sharma',
      service: 'Road Ambulance',
      submittedBy: 'Associate Member',
      agent: 'Not assigned',
      status: 'new',
      updated: 'Today',
    },
    {
      id: 'LD-1002',
      customer: 'Priya Verma',
      service: 'Air Ambulance',
      submittedBy: 'Team Member',
      agent: 'Amit',
      status: 'followup',
      updated: 'Yesterday',
    },
    {
      id: 'LD-1003',
      customer: 'Mohit Jain',
      service: 'Body Transportation',
      submittedBy: 'Associate Member',
      agent: 'Neha',
      status: 'completed',
      updated: 'Yesterday',
    },
  ];

  const filteredLeads = sampleLeads.filter((lead) => {
    const searchText = query.toLowerCase();

    const matchesSearch = [
      lead.id,
      lead.customer,
      lead.service,
      lead.submittedBy,
      lead.agent,
    ].some((value) => value.toLowerCase().includes(searchText));

    const matchesStatus = status === 'all' || lead.status === status;

    return matchesSearch && matchesStatus;
  });

  return <>
    <PageHeading eyebrow="OPERATIONS" title="Leads" description="Review enquiries, follow-ups, ownership, and service progress." actions={<button className="button button-secondary" onClick={() => { setQuery(''); setStatus('all'); }}><RefreshCw size={15}/> Reset filters</button>} />
    <section className="panel">
      <div className="toolbar">
        <label className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search lead ID, contact, or hospital" aria-label="Search leads"/></label>
        <label className="select-field"><Filter size={15}/><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by lead status"><option value="all">All statuses</option><option value="new">New lead</option><option value="review">Under review</option><option value="contacted">Contacted</option><option value="followup">Follow-up</option><option value="confirmed">Service confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14}/></label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Service</th>
              <th>Submitted by</th>
              <th>Assigned agent</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>

          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <strong>{lead.id}</strong>
                  <div>{lead.customer}</div>
                </td>
                <td>{lead.service}</td>
                <td>{lead.submittedBy}</td>
                <td>{lead.agent}</td>
                <td>
                  <span className={`lead-status ${lead.status}`}>
                    {lead.status === 'followup'
                      ? 'Follow-up'
                      : lead.status.charAt(0).toUpperCase() +
                      lead.status.slice(1)}
                  </span>
                </td>
                <td>{lead.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLeads.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No leads found"
          description="Try a different search term or status filter."
          action="Clear filters"
          onAction={() => {
            setQuery('');
            setStatus('all');
          }}
        />
      )}
      <span>Showing {filteredLeads.length} leads</span>
    </section>
  </>;
}

function MembersPage() {
  const [role, setRole] = useState('all');
  const [query, setQuery] = useState('');
  return <>
    <PageHeading eyebrow="PEOPLE" title="Members" description="Manage Team Members, independent Associates, and registration access." actions={<span className="soft-tag"><ShieldCheck size={14}/> Team Member signup requires a code</span>} />
    <section className="panel">
      <div className="toolbar">
        <label className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, member ID, or email" aria-label="Search members"/></label>
        <label className="select-field"><Users size={15}/><select value={role} onChange={e => setRole(e.target.value)} aria-label="Filter member role"><option value="all">All roles</option><option value="team_member">Team Member</option><option value="associate">Associate Member</option><option value="calling_agent">Calling Agent</option><option value="admin">Admin</option></select><ChevronDown size={14}/></label>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Account status</th><th>Joined</th><th>Lead count</th></tr></thead></table></div>
      <EmptyState icon={Users} title="Member directory is not connected" description="Member records will load from the protected members API. Associates remain independent unless an explicit permitted relationship is created." />
      <div className="table-footer"><span>Showing 0 members</span><span>Role and status filters are UI-ready; data integration is pending.</span></div>
    </section>
  </>;
}

function ServicesPage() {
  return <>
    <PageHeading eyebrow="CONFIGURATION" title="Service types" description="Maintain the service categories and fixed commission amount used by the business." />
    <div className="callout"><ShieldCheck size={19}/><div><strong>Financial rule</strong><p>Commission amounts should be changed only by an authorized owner. Existing earned commission records must preserve their original amount.</p></div></div>
    <section className="panel">
      <div className="table-wrap"><table><thead><tr><th>Service type</th><th>Description</th><th>Commission rule</th><th>Status</th></tr></thead></table></div>
      <EmptyState icon={HeartHandshake} title="No service types configured" description="Local transportation, international transportation, and other client-approved services will be managed here after the service types API is implemented." />
    </section>
  </>;
}

function CommissionsPage() {
  const [status, setStatus] = useState('all');
  return <>
    <PageHeading eyebrow="FINANCE" title="Commissions & payouts" description="Review eligible commissions, approve amounts, and record payments manually." actions={<span className="soft-tag"><Wallet size={14}/> Manual owner approval</span>} />
    <div className="callout"><ShieldCheck size={19}/><div><strong>No recruitment-based commission</strong><p>Only the eligible member who submitted the lead can earn the configured fixed commission. Team relationships do not create a commission entitlement.</p></div></div>
    <section className="panel">
      <div className="toolbar">
        <label className="select-field"><Filter size={15}/><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter commission status"><option value="all">All commission statuses</option><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select><ChevronDown size={14}/></label>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Commission ID</th><th>Lead / service</th><th>Eligible member</th><th>Amount</th><th>Status</th><th>Payment reference</th></tr></thead></table></div>
      <EmptyState icon={Wallet} title="No commission records yet" description={status === 'all' ? 'Eligible commission records will be generated after a service is verified as completed.' : 'No records match this status. Live commission records will be available after API integration.'} />
      <div className="table-footer"><span>Showing 0 commission records</span><span>Approval and payout actions will be enabled after authorization and API integration.</span></div>
    </section>
  </>;
}

function App() {
  const [activePage, setActivePage] = useState('overview');
  const pages = {
    overview: {
      title: 'Overview',
      heading: 'currentPage.heading',
      description: 'currentPage.description'
    },
    leads: {
      title: 'Leads',
      heading: 'Lead management',
      description: 'Review enquiries and track their progress.'
    },
    members: {
      title: 'Members',
      heading: 'Member management',
      description: 'Manage Team Members and independent Associates.'
    },
    services: {
      title: 'Services',
      heading: 'Service management',
      description: 'Manage funeral-service categories and completion.'
    },
    commissions: {
      title: 'Commissions & payouts',
      heading: 'Commissions & payouts',
      description: 'Review eligible commissions and record payments.'
    }
  };

  const currentPage = pages[activePage];
  const [apiState, setApiState] = useState({ status: 'checking', label: 'Checking backend…', detail: `Trying ${API_BASE}/api/health` });
  const [checkedAt, setCheckedAt] = useState(null);

  

  const refreshApi = async () => {
    setApiState({ status: 'checking', label: 'Checking backend…', detail: `Trying ${API_BASE}/api/health` });
    try {
      const response = await fetch(`${API_BASE}/api/health`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setApiState({ status: 'connected', label: 'Backend reachable', detail: `API responded successfully${payload.timestamp ? ` at ${new Date(payload.timestamp).toLocaleTimeString()}` : ''}. Database connectivity is not yet verified by this endpoint.` });
      setCheckedAt(new Date());
    } catch (error) {
      setApiState({ status: 'offline', label: 'Backend not reachable', detail: `Start the backend on ${API_BASE} and check the terminal. ${error?.message || ''}` });
      setCheckedAt(new Date());
    }
  };

  useEffect(() => { refreshApi(); }, []);

  const pageTitle = useMemo(() => navigation.find(item => item.id === activePage)?.label || 'Overview', [activePage]);
  const navigate = id => setActivePage(id);

  let page;
  if (activePage === 'leads') page = <LeadsPage />;
  else if (activePage === 'members') page = <MembersPage />;
  else if (activePage === 'services') page = <ServicesPage />;
  else if (activePage === 'commissions') page = <CommissionsPage />;
  else page = <OverviewPage apiState={apiState} refreshApi={refreshApi} onNavigate={navigate} />;

  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><strong>CarePath</strong><span>Service operations</span></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`nav ${activePage === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span>{activePage === id && <span className="nav-dot"/>}</button>)}
      </nav>
      <div className="nav-label secondary-label">SUPPORT</div>
      <button type="button" className={`nav ${activePage === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings size={18}/><span>Settings</span></button>
      <button type="button" className={`nav ${activePage === 'help' ? 'active' : ''}`} onClick={() => navigate('help')}><CircleHelp size={18}/><span>Help & notes</span></button>
      <div className="sidebar-bottom"><div className="avatar">AD</div><div><strong>Admin workspace</strong><span>Local development</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="crumb">Workspace /</span> <strong>{currentPage.title}</strong></div><div className="top-right"><span className={`status ${apiState.status}`}><i/> {apiState.status === 'connected' ? 'API connected' : apiState.status === 'checking' ? 'Checking API' : 'API offline'}</span><IconButton label="Check backend connection" onClick={refreshApi}><RefreshCw size={16}/></IconButton><IconButton label="Notifications" onClick={() => window.alert('Notifications will be available after backend integration.')}><Bell size={17}/></IconButton><div className="avatar">AD</div></div></header>
      <div className="page-content">
        {activePage === 'settings' ? <><PageHeading eyebrow="WORKSPACE" title="Settings" description="Environment and application configuration."/><section className="panel settings-list"><div><strong>API base URL</strong><span>{API_BASE}</span></div><div><strong>Environment</strong><span>Development preview</span></div><div><strong>Authentication</strong><span>Not implemented yet — protected data is not available in this UI milestone.</span></div></section></>
          : activePage === 'help' ? <><PageHeading eyebrow="DOCUMENTATION" title="Help & notes" description="Project rules for the admin team."/><section className="panel help-list"><div><strong>Lead ownership</strong><p>The original submitter is retained for commission eligibility.</p></div><div><strong>Member roles</strong><p>Team Member registration requires an owner-issued code. Associates register independently and cannot add members.</p></div><div><strong>Commission rule</strong><p>Fixed amount per eligible completed service, with owner approval and manual payout records.</p></div><div><strong>Development status</strong><p>This milestone is an interactive UI shell. Live data, authentication, and write operations are not yet connected.</p></div></section></>
          : page}
      </div>
      <footer>CarePath Services · Internal operations interface · Development build{checkedAt ? ` · Last API check ${checkedAt.toLocaleTimeString()}` : ''}</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
