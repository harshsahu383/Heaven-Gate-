import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Filter, HeartHandshake, LayoutDashboard,
  LifeBuoy, Search, Settings, ShieldCheck, Users, Wallet, X, RefreshCw, Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import './styles.css';
import { getToken, login, clearToken, apiRequest } from './api.js';
// import { apiRequest } from 'api.js';

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


function MyProfilePage({ currentUser }) {
  const fullName = currentUser?.fullName || 'Admin';
  const email = currentUser?.email || 'Not available';
  const role = String(currentUser?.role || 'admin')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT"
        title="My Profile"
        description="View your CarePath account information."
      />

      <section className="panel my-profile-panel">
        <div className="my-profile-header">
          <div className="my-profile-avatar">{initials}</div>
          <div>
            <h2>{fullName}</h2>
            <p>{email}</p>
            <span className="soft-tag">{role}</span>
          </div>
        </div>

        <div className="my-profile-details">
          <div>
            <span>Full name</span>
            <strong>{fullName}</strong>
          </div>

          <div>
            <span>Email address</span>
            <strong>{email}</strong>
          </div>

          <div>
            <span>Account role</span>
            <strong>{role}</strong>
          </div>
        </div>
      </section>
    </>
  );
}


function OverviewPage({ apiState, refreshApi, onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {

    const fetchOverview = async () => {
      try {
        setOverviewLoading(true);

        const result = await apiRequest('/api/admin/overview');

        console.log('Overview API response:', result);

        if (!result.success) {
          throw new Error('Unable to load overview data');
        }

        setOverview(result.data);
      } catch (error) {
        console.error('Overview API error:', error);
      } finally {
        setOverviewLoading(false);
      }
    };


    fetchOverview();
  }, []);


  const stats = [
    {
      label: 'Total leads',
      value: overview?.totalLeads ?? '—',
      note: 'All recorded enquiries',
      icon: ClipboardList,
    },
    {
      label: 'Total members',
      value: overview?.totalMembers ?? '—',
      note: 'Registered members',
      icon: Users,
    },
    {
      label: 'Service types',
      value: overview?.totalServices ?? '—',
      note: 'Configured service categories',
      icon: HeartHandshake,
    },
    {
      label: 'Overview status',
      value: overviewLoading
        ? 'Loading…'
        : overview
          ? 'Live'
          : 'Unavailable',
      note: 'Data fetched from the API',
      icon: Activity,
    },
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
      actions={<button className="button button-primary" onClick={() => onNavigate('leads')}><ClipboardList size={16} /> View leads <ArrowUpRight size={16} /></button>} />
    <div className="stat-grid">{stats.map(({ label, value, note, icon: Icon }) => <article className="stat-card" key={label}>
      <div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div>
      <strong className="stat-value">{value}</strong><span className="stat-note">{note}</span>
    </article>)}</div>
    <div className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><h2>Lead activity</h2><p>Recent enquiries and follow-ups</p></div><button className="button button-quiet" onClick={() => onNavigate('leads')}>View all <ArrowUpRight size={14} /></button></div>
        <EmptyState icon={Activity} title="No live lead data yet" description="Lead activity will appear here after the leads API and database are connected." action="Open lead management" onAction={() => onNavigate('leads')} />
      </article>
      <article className="panel">
        <div className="panel-head"><div><h2>Commission approvals</h2><p>Owner review queue</p></div><Wallet size={19} color="#2D8C83" /></div>
        <div className="approval-box"><div className="approval-symbol"><ShieldCheck size={19} /></div><strong>Approval queue not connected</strong><p>Verified completed services will create eligible fixed-commission records for owner review.</p><button className="button button-secondary" onClick={() => onNavigate('commissions')}>Review commission area</button></div>
        <div className="note-line">Payments are recorded manually by an authorized owner.</div>
      </article>
    </div>
    <article className="panel api-panel">
      <div className="panel-head"><div><h2>Backend connection</h2><p>Development API health check</p></div><button className="button button-secondary" onClick={refreshApi}><RefreshCw size={14} /> Check again</button></div>
      <div className={`connection-row ${apiState.status}`}><span className="connection-dot" /><div><strong>{apiState.label}</strong><p>{apiState.detail}</p></div></div>
    </article>
  </>;
}

function LeadsPage({ onOpenLead }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await apiRequest('/api/admin/leads');

        if (!result.success) {
          throw new Error('Unable to load leads');
        }

        setLeads(result.data);
      } catch (err) {
        console.error('Leads API error:', err);
        setError('Unable to load leads. Please check the backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const normalizeStatus = (value = '') =>
    value.toLowerCase().replace(/[\s-]+/g, '_');

  const filteredLeads = leads.filter((lead) => {
    const searchText = query.trim().toLowerCase();

    const searchableValues = [
      lead.lead_code,
      lead.customer_name,
      lead.customer_phone,
      lead.customer_email,
      lead.hospital_or_location,
    ];

    const matchesSearch = searchableValues.some((value) =>
      String(value ?? '').toLowerCase().includes(searchText)
    );

    const statusAliases = {
      review: 'under_review',
      followup: 'follow_up',
      confirmed: 'service_confirmed',
    };

    const requestedStatus = statusAliases[status] || status;
    const actualStatus = normalizeStatus(lead.status);

    const matchesStatus =
      status === 'all' ||
      actualStatus === requestedStatus ||
      (status === 'confirmed' && actualStatus === 'confirmed');

    return matchesSearch && matchesStatus;
  });





  return <>
    <PageHeading eyebrow="OPERATIONS" title="Leads" description="Review enquiries, follow-ups, ownership, and service progress." actions={<button className="button button-secondary" onClick={() => { setQuery(''); setStatus('all'); }}><RefreshCw size={15} /> Reset filters</button>} />
    <section className="panel">
      <div className="toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search lead ID, contact, or hospital" aria-label="Search leads" /></label>
        <label className="select-field"><Filter size={15} /><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by lead status"><option value="all">All statuses</option><option value="new">New lead</option><option value="review">Under review</option><option value="contacted">Contacted</option><option value="followup">Follow-up</option><option value="confirmed">Service confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14} /></label>
      </div>

      <div className="table-wrap">
        {loading && <p>Loading leads...</p>}

        {error && <p role="alert">{error}</p>}
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
                  <div className="lead-identity">
                    <button
                      type="button"
                      className="lead-code-link"
                      onClick={() => onOpenLead(lead.id)}
                      title={`Open lead ${lead.lead_code}`}
                    >
                      {lead.lead_code}
                    </button>

                    <span className="lead-customer-name">
                      {lead.customer_name || 'Unnamed customer'}
                    </span>
                  </div>
                </td>


                <td>{lead.service_name || 'Unknown service'}</td>
                <td>
                  {lead.submitted_by_name || 'Unknown member'}
                  {lead.submitted_by_role && (
                    <div>{lead.submitted_by_role.replace(/_/g, ' ')}</div>
                  )}
                </td>
                <td>{lead.assigned_agent_name || 'Not assigned'}</td>
                <td>

                  <span
                    className={`lead-status status-${normalizeStatus(lead.status)}`}
                  >
                    <span className="status-indicator" />
                    {String(lead.status || 'new')
                      .replace(/[_-]+/g, ' ')
                      .replace(/\b\w/g, char => char.toUpperCase())}
                  </span>

                </td>
                <td>
                  {lead.updated_at
                    ? new Date(lead.updated_at).toLocaleDateString()
                    : '—'}
                </td>
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
      <div className="table-footer">
        <span>
          Showing <strong>{filteredLeads.length}</strong> of{' '}
          <strong>{leads.length}</strong> leads
        </span>
        <span>Updated from the database</span>
      </div>
    </section>
  </>;
}




function MembersPage({ onOpenMember }) {

  const [role, setRole] = useState('all');
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState({
    teamMembers: [],
    independentAssociates: [],
    otherMembers: [],
  });
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        setError('');


        const result = await apiRequest('/api/admin/members');

        if (!result.success) {
          throw new Error('Unable to load members.');
        }

        const data = result.data;

        if (Array.isArray(data)) {
          // Handle the old API response format safely.
          setMembers({
            teamMembers: data
              .filter((member) => member.role === 'team_member')
              .map((member) => ({ ...member, associates: [] })),
            independentAssociates: data.filter(
              (member) =>
                member.role === 'associate' &&
                member.parent_member_id == null
            ),
            otherMembers: data.filter(
              (member) =>
                member.role === 'admin' ||
                member.role === 'calling_agent'
            ),
          });
        } else {
          setMembers({
            teamMembers: Array.isArray(data?.teamMembers)
              ? data.teamMembers
              : [],
            independentAssociates: Array.isArray(data?.independentAssociates)
              ? data.independentAssociates
              : [],
            otherMembers: Array.isArray(data?.otherMembers)
              ? data.otherMembers
              : [],
          });
        }

      } catch (err) {
        setError(err.message || 'Unable to load members.');
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, []);

  const normalizeRole = (value = '') =>
    value.toLowerCase().replace(/_/g, ' ');

  const matchesSearch = (member) => {
    const search = query.trim().toLowerCase();

    return [
      member.full_name,
      member.email,
      member.phone,
      String(member.id),
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(search)
    );
  };

  const matchesRole = (member) =>
    role === 'all' || member.role === role;

  const filteredTeams = members.teamMembers
    .map((team) => ({
      ...team,
      associates: (team.associates || []).filter(
        (associate) =>
          matchesRole(associate) &&
          matchesSearch(associate)
      ),
    }))
    .filter((team) => {
      const teamMatches =
        matchesRole(team) && matchesSearch(team);

      const associateMatches = team.associates.length > 0;

      return teamMatches || associateMatches;
    });

  const filteredIndependent = members.independentAssociates
    .filter(matchesSearch)
    .filter(matchesRole);

  const filteredOthers = members.otherMembers
    .filter(matchesSearch)
    .filter(matchesRole);

  const visibleCount =
    filteredTeams.reduce(
      (count, team) =>
        count + 1 + team.associates.length,
      0
    ) +
    filteredIndependent.length +
    filteredOthers.length;

  function renderMember(member) {
    return (
      <div className="member-row" key={member.id}>
        <div className="member-avatar">
          {member.full_name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="member-main">

          <button
            type="button"
            className="lead-code-link"
            onClick={() => onOpenMember(member.id)}
            title={`View ${member.full_name} details`}
          >
            {member.full_name}
          </button>

          <span>{member.email || 'No email'}</span>
          <span>{member.phone || 'No phone'}</span>
        </div>

        <span className="member-role">
          {normalizeRole(member.role)}
        </span>

        <span
          className={`member-status status-${member.account_status}`}
        >
          {member.account_status}
        </span>

        <span className="member-date">
          {member.created_at
            ? new Date(member.created_at).toLocaleDateString()
            : '—'}
        </span>
      </div>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="PEOPLE"
        title="Members"
        description="View Team Members, their Associates, and independent members."
        actions={
          <span className="soft-tag">
            <ShieldCheck size={14} />
            Authorized member directory
          </span>
        }
      />

      <section className="panel">
        <div className="toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, ID, email, or phone"
              aria-label="Search members"
            />
          </label>

          <label className="select-field">
            <Users size={15} />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              aria-label="Filter member role"
            >
              <option value="all">All roles</option>
              <option value="team_member">Team Member</option>
              <option value="associate">Associate Member</option>
              <option value="calling_agent">Calling Agent</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {loading && <p>Loading members...</p>}
        {error && <p role="alert">{error}</p>}

        {!loading && !error && (
          <>
            <div className="member-directory">
              {filteredTeams.map((team) => {
                const isExpanded = Boolean(expanded[team.id]);

                return (
                  <section className="member-group" key={team.id}>
                    <button
                      type="button"
                      className="member-team-toggle"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [team.id]: !previous[team.id],
                        }))
                      }
                    >
                      <div className="member-avatar team-avatar">
                        {team.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      <div className="member-main">
                        <strong
                          role="link"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenMember(team.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              onOpenMember(team.id);
                            }
                          }}
                        >
                          {team.full_name}
                        </strong>
                        <span>{team.email || 'No email'}</span>
                        <span>
                          {team.associates.length} matching associate
                          {team.associates.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <span className="member-role">Team Member</span>

                      <span
                        className={`member-status status-${team.account_status}`}
                      >
                        {team.account_status}
                      </span>

                      <ChevronDown
                        className={`member-chevron ${isExpanded ? 'expanded' : ''}`}
                        size={18}
                      />
                    </button>

                    {isExpanded && (
                      <div className="member-associates">
                        {team.associates.length > 0 ? (
                          team.associates.map((associate) => (
                            <div
                              className="member-associate"
                              key={associate.id}
                            >
                              {renderMember(associate)}
                            </div>
                          ))
                        ) : (
                          <p className="member-empty">
                            No associates match your search or filter.
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}

              {filteredIndependent.length > 0 && (
                <section className="member-section">
                  <h3>Independent Associates</h3>
                  {filteredIndependent.map(renderMember)}
                </section>
              )}

              {filteredOthers.length > 0 && (
                <section className="member-section">
                  <h3>Other Accounts</h3>
                  {filteredOthers.map(renderMember)}
                </section>
              )}

              {visibleCount === 0 && (
                <EmptyState
                  icon={Users}
                  title="No members found"
                  description="Try another search term or role filter."
                  action="Clear filters"
                  onAction={() => {
                    setQuery('');
                    setRole('all');
                  }}
                />
              )}
            </div>

            <div className="table-footer">
              <span>
                Showing <strong>{visibleCount}</strong> matching member
                {visibleCount === 1 ? '' : 's'}
              </span>
              <span>Loaded from the database</span>
            </div>
          </>
        )}
      </section>
    </>
  );
}


function MemberDetailsPage({
  memberId,
  onBack,
  onOpenMember,
  onOpenLead,
}) {
  const [details, setDetails] = useState(null);
  const [associates, setAssociates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMemberDetails() {
      try {
        setLoading(true);
        setError('');

        const memberResult = await apiRequest(
          `/api/admin/members/${memberId}`
        );

        if (!memberResult.success) {
          throw new Error('Unable to load member details.');
        }

        setDetails(memberResult.data);

        if (memberResult.data.member.role === 'team_member') {
          const associateResult = await apiRequest(
            `/api/admin/members/${memberId}/associates`
          );

          if (!associateResult.success) {
            throw new Error('Unable to load Associates.');
          }

          setAssociates(associateResult.data || []);
        } else {
          setAssociates([]);
        }

        const leadsResult = await apiRequest(
          `/api/admin/members/${memberId}/leads`
        );

        if (!leadsResult.success) {
          throw new Error('Unable to load submitted leads.');
        }

        setLeads(leadsResult.data || []);
      } catch (err) {
        console.error('Member details API error:', err);
        setError(err.message || 'Unable to load member details.');
      } finally {
        setLoading(false);
      }
    }

    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId]);

  const formatLabel = (value = '') =>
    value.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : '—';

  if (loading) {
    return <section className="panel"><p>Loading member details...</p></section>;
  }

  if (error) {
    return (
      <section className="panel">
        <button className="button button-secondary" onClick={onBack}>
          ← Back to Members
        </button>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (!details?.member) {
    return <p>Member not found.</p>;
  }

  const { member, associateCount, leadSummary } = details;

  const summaryCards = [
    { label: 'Total leads', value: leadSummary?.total ?? 0 },
    { label: 'Completed', value: leadSummary?.completed ?? 0 },
    { label: 'Cancelled', value: leadSummary?.cancelled ?? 0 },
    { label: 'In progress', value: leadSummary?.inProgress ?? 0 },
  ];

  return (
    <div className="lead-details-page">
      <button className="button button-secondary" onClick={onBack}>
        ← Back to Members
      </button>

      <PageHeading
        eyebrow="MEMBER MANAGEMENT"
        title={member.full_name}
        description={`${formatLabel(member.role)} · Member ID ${member.id}`}
      />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Profile information</h2>
            <p>Member contact and account details</p>
          </div>
        </div>

        <div className="lead-info-row">
          <span>Full name</span>
          <strong>{member.full_name || '—'}</strong>
        </div>
        <div className="lead-info-row">
          <span>Email</span>
          <strong>{member.email || '—'}</strong>
        </div>
        <div className="lead-info-row">
          <span>Phone</span>
          <strong>{member.phone || '—'}</strong>
        </div>
        <div className="lead-info-row">
          <span>Role</span>
          <strong>{formatLabel(member.role)}</strong>
        </div>
        <div className="lead-info-row">
          <span>Account status</span>
          <strong>{formatLabel(member.account_status)}</strong>
        </div>
        <div className="lead-info-row">
          <span>Joined</span>
          <strong>{formatDate(member.created_at)}</strong>
        </div>

        {member.role === 'associate' && (
          <div className="lead-info-row">
            <span>Team Member</span>
            <strong>
              {member.parent_member_name || 'Independent Associate'}
            </strong>
          </div>
        )}
      </section>

      <section className="stat-grid">
        {summaryCards.map((item) => (
          <article className="stat-card" key={item.label}>
            <div className="stat-top">
              <span>{item.label}</span>
            </div>
            <strong className="stat-value">{item.value}</strong>
          </article>
        ))}
      </section>

      {member.role === 'team_member' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Associated Associates</h2>
              <p>{associateCount ?? associates.length} linked Associates</p>
            </div>
          </div>

          {associates.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Total leads</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {associates.map((associate) => (
                    <tr key={associate.id}>

                      <td>
                        <button
                          type="button"
                          className="lead-code-link"
                          onClick={() => onOpenMember(associate.id)}
                          title={`View ${associate.full_name} details`}
                        >
                          {associate.full_name}
                        </button>
                      </td>

                      <td>{associate.email || '—'}</td>
                      <td>{formatLabel(associate.account_status)}</td>
                      <td>{associate.total_leads ?? 0}</td>
                      <td>{associate.completed_leads ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="member-empty">No Associates linked to this Team Member.</p>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Submitted leads</h2>
            <p>Leads submitted directly by this member</p>
          </div>
        </div>

        {leads.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>

                    <td>
                      <button
                        type="button"
                        className="lead-code-link"
                        onClick={() => onOpenLead(lead.id)}
                        title={`View lead ${lead.lead_code || lead.id}`}
                      >
                        {lead.lead_code || lead.id}
                      </button>
                    </td>

                    <td>{lead.customer_name || 'Unnamed customer'}</td>
                    <td>{lead.service_name || 'Unknown service'}</td>
                    <td>{formatDate(lead.created_at)}</td>
                    <td>{formatLabel(lead.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="member-empty">This member has not submitted any leads yet.</p>
        )}
      </section>
    </div>
  );
}





function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [deleteService, setDeleteService] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    commission_percentage: '0',
  });

  async function fetchServices() {
    try {
      setLoading(true);
      setError('');

      const result = await apiRequest('/api/admin/service-types');

      if (!result.success) {
        throw new Error('Unable to load service types.');
      }

      setServices(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || 'Unable to load service types.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      commission_percentage: '0',
    });
  }
  function openDeleteModal(service) {
    setDeleteService(service);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  }

  function closeDeleteModal() {
    if (deleting) return;

    setDeleteService(null);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  }

  async function confirmDelete() {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your admin password.');
      return;
    }

    try {
      setDeleting(true);
      setDeleteError('');

      const result = await apiRequest(
        `/api/admin/service-types/${deleteService.id}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ password: deletePassword }),
        }
      );

      if (result.success === false) {
        throw new Error(result.message || 'Unable to delete service.');
      }

      setMessage(result.message || 'Service deleted successfully.');
      setDeleteService(null);
      setDeletePassword('');

      await fetchServices();
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete service.');
    } finally {
      setDeleting(false);
    }
  }
  function startEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name || '',
      description: service.description || '',
      commission_percentage: String(
        service.commission_percentage ?? 0
      ),
    });
    setMessage('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        commission_percentage: Number(form.commission_percentage),
      };

      if (
        !payload.name ||
        !Number.isFinite(payload.commission_percentage) ||
        payload.commission_percentage < 0 ||
        payload.commission_percentage > 100
      ) {
        throw new Error(
          'Enter a name and a commission percentage between 0 and 100.'
        );
      }

      const result = await apiRequest(
        editingId
          ? `/api/admin/service-types/${editingId}`
          : '/api/admin/service-types',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (result.success === false) {
        throw new Error(result.message || 'Unable to save service type.');
      }

      setMessage(
        editingId
          ? 'Service type updated successfully.'
          : 'Service type created successfully.'
      );

      resetForm();
      await fetchServices();
    } catch (err) {
      setError(err.message || 'Unable to save service type.');
    } finally {
      setSaving(false);
    }
  }


  async function toggleStatus(service) {
    setError('');
    setMessage('');

    try {
      const currentlyActive = Number(service.is_active) === 1;

      const result = await apiRequest(
        `/api/admin/service-types/${service.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            is_active: currentlyActive ? 0 : 1,
          }),
        }
      );

      if (!result.success) {
        throw new Error(
          result.message || 'Unable to update service status.'
        );
      }

      setMessage(result.message || 'Service status updated successfully.');

      await fetchServices();
    } catch (err) {
      setError(err.message || 'Unable to update service status.');
    }
  }


  const isActive = (service) =>
    Number(service.is_active) === 1;
  return (
    <>
      <PageHeading
        eyebrow="CONFIGURATION"
        title="Service types"
        description="Manage service categories and commission percentages."
        actions={
          <div className="heading-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={fetchServices}
              disabled={loading}
            >
              <RefreshCw size={15} /> Refresh
            </button>

            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                resetForm();
                setMessage('');
                setError('');
                document
                  .querySelector('.service-form')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              + Add service type
            </button>
          </div>
        }
      />

      <div className="callout">
        <ShieldCheck size={19} />
        <div>
          <strong>Financial rule</strong>
          <p>
            Commission percentages are configured here. Existing earned
            commissions should retain their recorded percentage and amount.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{editingId ? 'Edit service type' : 'Add service type'}</h2>
            <p>Manage service details and commission rules.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="service-form">
          <label>
            Service name
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Enter service name"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Describe this service"
              rows={3}
            />
          </label>

          <label>
            Commission percentage (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commission_percentage}
              onChange={(event) =>
                setForm({
                  ...form,
                  commission_percentage: event.target.value,
                })
              }
              required
            />
          </label>

          <div className="heading-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save changes'
                  : 'Create service type'}
            </button>

            {editingId && (
              <button
                className="button button-secondary"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Configured services</h2>
            <p>{services.length} service types returned by the API</p>
          </div>
        </div>

        {loading ? (
          <p>Loading service types...</p>
        ) : error && services.length === 0 ? (
          <p role="alert">{error}</p>
        ) : services.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="No service types found"
            description="Create a service type using the form above."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service type</th>
                  <th>Description</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{service.description || '—'}</td>
                    <td>{service.commission_percentage ?? 0}%</td>
                    <td>
                      {isActive(service) ? 'Active' : 'Inactive'}
                    </td>
                    <td>
                      <div className="heading-actions">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => startEdit(service)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => toggleStatus(service)}
                        >
                          {isActive(service)
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => openDeleteModal(service)}
                          title={`Delete ${service.name}`}
                        >
                          <Trash2 size={15} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteService && (
        <div
          className="delete-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <section
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="delete-modal-icon">
              <AlertTriangle size={25} />
            </div>

            <button
              type="button"
              className="delete-modal-close"
              onClick={closeDeleteModal}
              disabled={deleting}
              aria-label="Close confirmation"
            >
              <X size={19} />
            </button>

            <span className="delete-modal-eyebrow">
              DESTRUCTIVE ACTION
            </span>

            <h2 id="delete-modal-title">Delete service type?</h2>

            <p className="delete-modal-description">
              You are about to delete
              {' '}
              <strong>{deleteService.name}</strong>.
              This action cannot be undone.
            </p>

            <div className="delete-warning">
              <AlertTriangle size={17} />
              <p>
                If this service is linked to existing leads, deletion may be
                blocked. Deactivate it instead if you need to retain its history.
              </p>
            </div>

            <label className="delete-password-label" htmlFor="delete-admin-password">
              Admin password
            </label>

            <div className="delete-password-field">
              <input
                id="delete-admin-password"
                type={showDeletePassword ? 'text' : 'password'}
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeleteError('');
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={deleting}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') confirmDelete();
                  if (event.key === 'Escape') closeDeleteModal();
                }}
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowDeletePassword((value) => !value)}
                aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                disabled={deleting}
              >
                {showDeletePassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>

            {deleteError && (
              <p className="delete-modal-error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="delete-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-danger"
                onClick={confirmDelete}
                disabled={deleting || !deletePassword.trim()}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={15} className="delete-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete service
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}



function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function fetchCommissions() {
    try {
      setLoading(true);
      setError('');

      const result = await apiRequest('/api/admin/commissions');

      if (result.success === false) {
        throw new Error(
          result.message || 'Unable to load commissions.'
        );
      }

      setCommissions(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load commissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCommissions();
  }, []);

  async function performAction(commission, action) {
    const id = commission.commission_id ?? commission.id;

    if (!id) {
      setError('Commission ID is missing.');
      return;
    }

    let rejection_reason;

    if (action === 'reject') {
      rejection_reason = window.prompt(
        'Enter the reason for rejecting this commission:'
      );

      if (rejection_reason === null) return;

      if (!rejection_reason.trim()) {
        setError('A rejection reason is required.');
        return;
      }
    }

    const labels = {
      approve: 'approve',
      reject: 'reject',
      pay: 'mark as paid',
    };

    if (
      !window.confirm(
        `Are you sure you want to ${labels[action]} commission #${id}?`
      )
    ) {
      return;
    }

    try {
      setActionId(id);
      setError('');
      setMessage('');

      const body =
        action === 'reject'
          ? { rejection_reason: rejection_reason.trim() }
          : undefined;

      const result = await apiRequest(
        `/api/admin/commissions/${id}/${action}`,
        {
          method: 'PATCH',
          ...(body ? { body: JSON.stringify(body) } : {}),
        }
      );

      if (result.success === false) {
        throw new Error(
          result.message || `Unable to ${labels[action]} commission.`
        );
      }

      setMessage(
        result.message ||
        `Commission ${labels[action]} successfully.`
      );

      await fetchCommissions();
    } catch (err) {
      setError(err.message || 'Unable to update commission.');
    } finally {
      setActionId(null);
    }
  }

  const money = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const label = (value = '') =>
    String(value)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const filteredCommissions = commissions.filter((commission) => {
    const currentStatus =
      commission.commission_status ?? commission.status ?? '';

    const matchesStatus =
      status === 'all' || currentStatus === status;

    const search = query.trim().toLowerCase();

    const searchable = [
      commission.commission_id,
      commission.id,
      commission.lead_code,
      commission.customer_name,
      commission.service_name,
      commission.eligible_member_name,
    ];

    const matchesSearch = searchable.some((value) =>
      String(value ?? '').toLowerCase().includes(search)
    );

    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: commissions.length,
    pending: commissions.filter(
      (c) => (c.commission_status ?? c.status) === 'pending'
    ).length,
    approved: commissions.filter(
      (c) => (c.commission_status ?? c.status) === 'approved'
    ).length,
    paid: commissions.filter(
      (c) => (c.commission_status ?? c.status) === 'paid'
    ).length,
    rejected: commissions.filter(
      (c) => (c.commission_status ?? c.status) === 'rejected'
    ).length,
  };

  return (
    <>
      <PageHeading
        eyebrow="FINANCE"
        title="Commissions & payouts"
        description="Review earned commissions, approve eligible amounts, and record payments."
        actions={
          <button
            type="button"
            className="button button-secondary"
            onClick={fetchCommissions}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />

      <div className="callout">
        <ShieldCheck size={19} />
        <div>
          <strong>Commission calculation is locked to the earning record</strong>
          <p>
            Each commission retains the percentage and amount recorded
            when it was generated. Updating a Service Type percentage
            must not recalculate existing commissions. Only the eligible
            lead submitter earns commission.
          </p>
        </div>
      </div>

      {message && (
        <div className="callout" role="status">
          <CheckCircle2 size={19} />
          <div><strong>{message}</strong></div>
        </div>
      )}

      {error && (
        <div className="callout" role="alert">
          <X size={19} />
          <div><strong>{error}</strong></div>
        </div>
      )}

      <div className="stat-grid">
        {[
          ['Total records', counts.all],
          ['Pending approval', counts.pending],
          ['Approved', counts.approved],
          ['Paid', counts.paid],
        ].map(([title, value]) => (
          <article className="stat-card" key={title}>
            <div className="stat-top">
              <span>{title}</span>
              <span className="stat-icon">
                <Wallet size={18} />
              </span>
            </div>
            <strong className="stat-value">{value}</strong>
            <span className="stat-note">Commission records</span>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Commission register</h2>
            <p>
              {filteredCommissions.length} matching record(s)
            </p>
          </div>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lead, customer, service, member..."
              aria-label="Search commissions"
            />
          </label>

          <label className="select-field">
            <Filter size={15} />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter commission status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {loading ? (
          <p>Loading commissions...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Commission</th>
                  <th>Lead / customer</th>
                  <th>Service</th>
                  <th>Eligible member</th>
                  <th>Service amount</th>
                  <th>Rate</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Approval / payment</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCommissions.map((commission) => {
                  const id =
                    commission.commission_id ?? commission.id;

                  const currentStatus =
                    commission.commission_status ??
                    commission.status ??
                    'pending';

                  return (
                    <tr key={id}>
                      <td>#{id}</td>

                      <td>
                        <strong>
                          {commission.lead_code || '—'}
                        </strong>
                        <div>
                          {commission.customer_name || '—'}
                        </div>
                      </td>

                      <td>{commission.service_name || '—'}</td>

                      <td>
                        {commission.eligible_member_name || '—'}
                        <div>
                          {commission.eligible_member_role
                            ? label(commission.eligible_member_role)
                            : ''}
                        </div>
                      </td>

                      <td>
                        {commission.service_amount == null
                          ? '—'
                          : money(commission.service_amount)}
                      </td>

                      <td>
                        {commission.commission_percentage ?? 0}%
                      </td>

                      <td>
                        <strong>
                          {money(commission.commission_amount)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`lead-status status-${currentStatus}`}
                        >
                          <span className="status-indicator" />
                          {label(currentStatus)}
                        </span>
                      </td>

                      <td>
                        {currentStatus === 'rejected' ? (
                          <span title={commission.rejection_reason || ''}>
                            {commission.rejection_reason || 'Rejected'}
                          </span>
                        ) : currentStatus === 'paid' ? (
                          <>
                            <div>
                              Paid by {commission.paid_by_name || 'Admin'}
                            </div>
                            <div>
                              {commission.paid_at
                                ? new Date(
                                  commission.paid_at
                                ).toLocaleString()
                                : 'Payment recorded'}
                            </div>
                          </>
                        ) : currentStatus === 'approved' ? (
                          <>
                            <div>
                              {commission.approved_by_name || 'Admin'}
                            </div>
                            <div>
                              {commission.approved_at
                                ? new Date(
                                  commission.approved_at
                                ).toLocaleDateString()
                                : 'Approved'}
                            </div>
                          </>
                        ) : (
                          'Awaiting review'
                        )}
                      </td>

                      <td>
                        <div className="heading-actions">
                          {currentStatus === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="button button-primary"
                                disabled={actionId !== null}
                                onClick={() =>
                                  performAction(commission, 'approve')
                                }
                              >
                                {actionId === id
                                  ? 'Working...'
                                  : 'Approve'}
                              </button>

                              <button
                                type="button"
                                className="button button-secondary"
                                disabled={actionId !== null}
                                onClick={() =>
                                  performAction(commission, 'reject')
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {currentStatus === 'approved' && (
                            <button
                              type="button"
                              className="button button-primary"
                              disabled={actionId !== null}
                              onClick={() =>
                                performAction(commission, 'pay')
                              }
                            >
                              {actionId === id
                                ? 'Working...'
                                : 'Mark paid'}
                            </button>
                          )}

                          {currentStatus === 'paid' && (
                            <span className="soft-tag">
                              <CheckCircle2 size={14} />
                              Completed
                            </span>
                          )}

                          {currentStatus === 'rejected' && (
                            <span className="soft-tag">
                              Rejected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredCommissions.length === 0 && (
          <EmptyState
            icon={Wallet}
            title={
              commissions.length === 0
                ? 'No commission records found'
                : 'No matching commissions'
            }
            description={
              commissions.length === 0
                ? 'Eligible commission records will appear after a service is completed and the backend generates the commission.'
                : 'Try another search term or status filter.'
            }
            action="Reset filters"
            onAction={() => {
              setQuery('');
              setStatus('all');
            }}
          />
        )}

        <div className="table-footer">
          <span>
            Showing <strong>{filteredCommissions.length}</strong> of{' '}
            <strong>{commissions.length}</strong> commissions
          </span>
          <span>Live data from the protected admin API</span>
        </div>
      </section>
    </>
  );
}



function LoginPage({ onLogin }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginRole, setLoginRole] = React.useState('admin');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password, loginRole);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-layout">
        <div className="login-brand-panel">
          <div className="login-brand">
            <div className="login-brand-icon">✚</div>
            <span>Heaven Gate</span>
          </div>

          <div className="login-brand-content">
            <span className="login-eyebrow">YOUR WORKSPACE, SIMPLIFIED</span>
            <h1>Care that connects.<br />Support that matters.</h1>
            <p>
              Manage service requests, coordinate leads, and help
              families connect with the support they need.
            </p>

            <div className="login-feature">
              <span>✓</span>
              <div>
                <strong>Secure access</strong>
                <small>Role-based access to your workspace</small>
              </div>
            </div>

            <div className="login-feature">
              <span>✓</span>
              <div>
                <strong>One connected platform</strong>
                <small>Keep your service operations organized</small>
              </div>
            </div>
          </div>

          <p className="login-brand-footer">
            Heaven Gate · Professional service management
          </p>
        </div>

        <div className="login-form-panel">
          <form className="login-card" onSubmit={handleSubmit}>
            <span className="login-welcome">WELCOME BACK</span>
            <h2>Sign in to Heaven Gate</h2>
            <p className="login-subtitle">
              Choose your account type to continue.
            </p>

            <div className="login-role-options">
              <button
                type="button"
                className={`login-role-option ${loginRole === 'admin' ? 'active' : ''
                  }`}
                aria-pressed={loginRole === 'admin'}
                onClick={() => setLoginRole('admin')}
              >
                <span className="login-role-icon">♙</span>
                <span>Admin</span>
                <small>Manage platform</small>
              </button>

              <button
                type="button"
                className={`login-role-option ${loginRole === 'calling_agent' ? 'active' : ''
                  }`}
                aria-pressed={loginRole === 'calling_agent'}
                onClick={() => setLoginRole('calling_agent')}
              >
                <span className="login-role-icon">☏</span>
                <span>Calling Agent</span>
                <small>Manage assigned leads</small>
              </button>
            </div>

            <label htmlFor="login-email">Work email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              required
            />

            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && (
              <p className="login-error" role="alert">{error}</p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in securely'}
              {!loading && <span>→</span>}
            </button>

            <p className="login-security">
              <span>✓</span> Protected access to your workspace
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}


function LeadDetailsPage({ leadId, onBack }) {
  const [lead, setLead] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [serviceAmount, setServiceAmount] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function loadLead() {
    setLoading(true);
    setError('');

    try {
      const result = await apiRequest(`/api/admin/leads/${leadId}`);

      const leadData = {
        ...result.data.lead,
        history: result.data.statusHistory || [],
      };

      setLead(leadData);
      setStatus(leadData.status || 'new');
      setServiceAmount(
        leadData.service_amount == null ? '' : String(leadData.service_amount)
      );
    } catch (err) {
      setError(err.message || 'Failed to load lead details.');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (leadId) loadLead();
  }, [leadId]);

  async function handleStatusUpdate(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await apiRequest(`/api/admin/leads/${leadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          notes,
          ...(status === 'completed' ? { service_amount: serviceAmount } : {}),
        }),
      });

      setMessage('Lead status updated successfully.');
      setNotes('');
      await loadLead();
    } catch (err) {
      setError(err.message || 'Unable to update lead status.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading lead details...</p>;
  }

  if (error && !lead) {
    return (
      <section className="panel">
        <button className="button button-secondary" onClick={onBack}>
          ← Back to Leads
        </button>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (!lead) return <p>Lead not found.</p>;

  const formatLabel = (value = '') =>
    value.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="lead-details-page">
      <button className="button button-secondary" onClick={onBack}>
        ← Back to Leads
      </button>

      <div className="lead-details-heading">
        <div>
          <div className="eyebrow">LEAD MANAGEMENT</div>
          <h1>{lead.lead_code}</h1>
          <p>Customer enquiry and service progress</p>
        </div>

        <span className={`lead-status ${lead.status}`}>
          {formatLabel(lead.status)}
        </span>
      </div>

      {error && <div className="lead-alert error" role="alert">{error}</div>}
      {message && <div className="lead-alert success">{message}</div>}

      <div className="lead-details-grid">
        <section className="panel lead-info-card">
          <div className="panel-head">
            <div>
              <h2>Customer Information</h2>
              <p>Contact details for this enquiry</p>
            </div>
          </div>

          <div className="lead-info-row">
            <span>Customer name</span>
            <strong>{lead.customer_name || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Phone number</span>
            <strong>{lead.customer_phone || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Email address</span>
            <strong>{lead.customer_email || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Submitted by</span>
            <strong>{lead.submitted_by_name || '—'}</strong>
          </div>
        </section>

        <section className="panel lead-info-card">
          <div className="panel-head">
            <div>
              <h2>Service Information</h2>
              <p>Requested service and journey details</p>
            </div>
          </div>

          <div className="lead-info-row">
            <span>Service type</span>
            <strong>{lead.service_name || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Service amount</span>
            <strong>
              {lead.service_amount == null
                ? 'Not set'
                : `₹${Number(lead.service_amount).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </strong>
          </div>
          <div className="lead-info-row">
            <span>Hospital / location</span>
            <strong>{lead.hospital_or_location || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Pickup location</span>
            <strong>{lead.pickup_location || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Destination</span>
            <strong>{lead.destination || '—'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Assigned agent</span>
            <strong>{lead.assigned_agent_name || 'Not assigned'}</strong>
          </div>
          <div className="lead-info-row">
            <span>Customer notes</span>
            <strong>{lead.notes || '—'}</strong>
          </div>
        </section>
      </div>

      <section className="panel lead-update-card">
        <div className="panel-head">
          <div>
            <h2>Update Lead Status</h2>
            <p>Choose the new status and record an update note</p>
          </div>
        </div>

        <form onSubmit={handleStatusUpdate} className="lead-status-form">
          <label>
            New status
            <select
              value={status}
              onChange={event => setStatus(event.target.value)}
              required
            >
              <option value="new">New</option>
              <option value="under_review">Under Review</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up">Follow-up</option>
              <option value="service_confirmed">Service Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          {status === 'completed' && (
            <label>
              Final service amount (INR)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={serviceAmount}
                onChange={event => setServiceAmount(event.target.value)}
                placeholder="Enter the service amount"
                required
              />
            </label>
          )}

          <label>
            Update notes
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Enter call details, follow-up information, or reason for status change..."
              rows={3}
            />
          </label>

          <button
            className="button button-primary"
            type="submit"
            disabled={saving || status === lead.status}
          >
            {saving ? 'Saving...' : 'Save Status Update'}
          </button>
        </form>

        <p className="lead-form-hint">
          Every successful status change should be recorded in the lead history.
          Your backend determines whether your account is authorized to update it.
        </p>
      </section>

      <section className="panel lead-history-card">
        <div className="panel-head">
          <div>
            <h2>Status History</h2>
            <p>Recorded changes for this lead</p>
          </div>
          <span className="soft-tag">{lead.history.length} updates</span>
        </div>

        {lead.history.length > 0 ? (
          <div className="lead-timeline">
            {lead.history.map(item => (
              <div className="lead-timeline-item" key={item.id}>
                <span className="timeline-dot" />
                <div>
                  <strong>
                    {item.old_status
                      ? `${formatLabel(item.old_status)} → ${formatLabel(item.new_status)}`
                      : `Lead created → ${formatLabel(item.new_status)}`}
                  </strong>
                  <p>{item.notes || 'No notes recorded'}</p>
                  <small>
                    {item.changed_at
                      ? new Date(item.changed_at).toLocaleString()
                      : 'Time unavailable'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="lead-history-empty">No status history recorded yet.</p>
        )}
      </section>
    </div>
  );
}



function App() {
  const [activePage, setActivePage] = useState(() => {
    return sessionStorage.getItem('carepath_active_page') || 'overview';
  });
  const [selectedLeadId, setSelectedLeadId] = React.useState(null);

  const [selectedMemberId, setSelectedMemberId] = React.useState(() => {
    const savedId = sessionStorage.getItem('carepath_selected_member_id');
    return savedId ? Number(savedId) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = React.useState(
    Boolean(getToken())
  );

  const [currentUser, setCurrentUser] = React.useState(null);

  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);



  React.useEffect(() => {
    sessionStorage.setItem('carepath_active_page', activePage);
  }, [activePage]);


  React.useEffect(() => {
    const handlePopState = (event) => {
      const pageFromHistory = event.state?.page;

      if (pageFromHistory) {
        setActivePage(pageFromHistory);

        if (event.state.memberId) {
          setSelectedMemberId(event.state.memberId);
          sessionStorage.setItem(
            'carepath_selected_member_id',
            String(event.state.memberId)
          );
        }

        if (event.state.leadId) {
          setSelectedLeadId(event.state.leadId);
        }

        return;
      }

      // Fallback for history entries without Heaven Gate state.
      const hash = window.location.hash.slice(1);

      if (hash.startsWith('member-details/')) {
        const memberId = Number(hash.split('/')[1]);
        setSelectedMemberId(memberId);
        setActivePage('member-details');
      } else if (hash.startsWith('lead-details/')) {
        const leadId = Number(hash.split('/')[1]);
        setSelectedLeadId(leadId);
        setActivePage('lead-details');
      } else if (
        ['overview', 'members', 'leads', 'services', 'commissions'].includes(hash)
      ) {
        setActivePage(hash);
      } else {
        setActivePage('overview');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);



  React.useEffect(() => {
    const token = getToken();

    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      return;
    }

    apiRequest('/api/auth/me')
      .then((result) => {
        if (result.success) {
          setCurrentUser(result.user);
          setIsAuthenticated(true);
        } else {
          clearToken();
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      })
      .catch((error) => {
        console.error('Session restoration failed:', error);
        clearToken();
        setCurrentUser(null);
        setIsAuthenticated(false);
      });



  }, []);

  React.useEffect(() => {
    const checkSession = async () => {
      if (!getToken()) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        return;
      }

      try {
        const result = await apiRequest('/api/auth/me');

        if (result.success) {
          setCurrentUser(result.user);
          setIsAuthenticated(true);
        } else {
          clearToken();
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        clearToken();
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    };

    const handlePageShow = () => {
      checkSession();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);



  async function handleLogin(email, password) {
    const user = await login(email, password);

    setCurrentUser(user);
    setIsAuthenticated(true);
  }

  function handleLogout() {
    clearToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActivePage('overview');
  }

  function handleOpenLead(leadId) {
    window.history.pushState({ page: 'lead-details', leadId }, '', `#lead-details/${leadId}`);
    setSelectedLeadId(leadId);
    setActivePage('lead-details');
  }

  function handleOpenMember(memberId) {
    sessionStorage.setItem('carepath_selected_member_id', String(memberId));
    window.history.pushState({ page: 'member-details', memberId }, '', `#member-details/${memberId}`);
    setSelectedMemberId(memberId);
    setActivePage('member-details');
  }
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
    },
    'lead-details': {
      title: 'Lead Details',
      heading: 'Lead Details',
      description: 'View customer information and track lead progress.'
    },

    'member-details': {
      title: 'Member Details',
      heading: 'Member Details',
      description: 'View member profiles, Associates, and submitted leads.'
    },

    'my-profile': {
      title: 'My Profile',
      heading: 'My Profile',
      description: 'View your CarePath account information.'
    },

  };

  const currentPage = pages[activePage] || pages.overview;
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
  const navigate = (id) => {
    if (id === activePage) return;

    window.history.pushState({ page: id }, '', `#${id}`);
    setActivePage(id);
  };


  let page;

  if (activePage === 'my-profile') {
    page = <MyProfilePage currentUser={currentUser} />;
  } else if (activePage === 'leads') {
    page = <LeadsPage onOpenLead={handleOpenLead} />;
  } else if (activePage === 'members') {
    page = <MembersPage onOpenMember={handleOpenMember} />;
  } else if (activePage === 'services') {
    page = <ServicesPage />;
  } else if (activePage === 'commissions') {
    page = <CommissionsPage />;
  } else {
    page = <OverviewPage
      apiState={apiState}
      refreshApi={refreshApi}
      onNavigate={navigate}
    />;
  }

  if (activePage === 'lead-details') {
    page = (
      <LeadDetailsPage
        leadId={selectedLeadId}
        onBack={() => setActivePage('leads')}
      />
    );
  }


  if (activePage === 'member-details') {
    page = (
      <MemberDetailsPage
        memberId={selectedMemberId}
        onBack={() => setActivePage('members')}
        onOpenMember={handleOpenMember}
        onOpenLead={handleOpenLead}
      />
    );
  }


  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }
  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">H</div><div><strong>Heaven Gate</strong><span>Service operations</span></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`nav ${activePage === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{activePage === id && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="nav-label secondary-label">SUPPORT</div>
      <button type="button" className={`nav ${activePage === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings size={18} /><span>Settings</span></button>
      <button type="button" className={`nav ${activePage === 'help' ? 'active' : ''}`} onClick={() => navigate('help')}><CircleHelp size={18} /><span>Help & notes</span></button>
      <div className="sidebar-bottom"><div className="avatar">AD</div><div><strong>Admin workspace</strong><span>Local development</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="crumb">Workspace /</span> <strong>{currentPage.title}</strong></div><div className="top-right"><span className={`status ${apiState.status}`}><i /> {apiState.status === 'connected' ? 'API connected' : apiState.status === 'checking' ? 'Checking API' : 'API offline'}</span><IconButton label="Check backend connection" onClick={refreshApi}><RefreshCw size={16} /></IconButton><IconButton label="Notifications" onClick={() => window.alert('Notifications will be available after backend integration.')}><Bell size={17} /></IconButton><div className="avatar">AD</div>

        <div className="profile-menu">
          <button
            type="button"
            className="profile-trigger"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-label="Open account menu"
          >
            <span className="avatar">
              {(currentUser?.fullName || 'Admin')
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>

          </button>

          {profileMenuOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-heading">
                <strong>{currentUser?.fullName || 'Admin'}</strong>
                <span>{currentUser?.email || 'Signed-in account'}</span>
                <small>{currentUser?.role || 'admin'}</small>
              </div>

              <div className="profile-dropdown-divider" />

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('my-profile');
                }}
              >
                <Users size={16} />
                My profile
              </button>

              <button
                type="button"
                className="profile-signout"
                onClick={() => {
                  setProfileMenuOpen(false);
                  if (
                    window.confirm(
                      'Are you sure you want to sign out of Heaven Gate?'
                    )
                  ) {
                    handleLogout();
                  }
                }}
              >
                <X size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>

      </div></header>
      <div className="page-content">
        {activePage === 'settings' ? <><PageHeading eyebrow="WORKSPACE" title="Settings" description="Environment and application configuration." /><section className="panel settings-list"><div><strong>API base URL</strong><span>{API_BASE}</span></div><div><strong>Environment</strong><span>Development preview</span></div><div><strong>Authentication</strong><span>Not implemented yet — protected data is not available in this UI milestone.</span></div></section></>
          : activePage === 'help' ? <><PageHeading eyebrow="DOCUMENTATION" title="Help & notes" description="Project rules for the admin team." /><section className="panel help-list"><div><strong>Lead ownership</strong><p>The original submitter is retained for commission eligibility.</p></div><div><strong>Member roles</strong><p>Team Member registration requires an owner-issued code. Associates register independently and cannot add members.</p></div><div><strong>Commission rule</strong><p>Fixed amount per eligible completed service, with owner approval and manual payout records.</p></div><div><strong>Development status</strong><p>This milestone is an interactive UI shell. Live data, authentication, and write operations are not yet connected.</p></div></section></>
            : page}
      </div>
      <footer>Heaven Gate · Internal operations interface · Development build{checkedAt ? ` · Last API check ${checkedAt.toLocaleTimeString()}` : ''}</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
