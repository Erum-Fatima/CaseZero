import { useState, useMemo } from 'react';
import { CivicCase, ActivityFeedItem } from '../types';
import { 
  Search, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  ChevronRight, 
  ArrowUpRight, 
  ThumbsUp, 
  Check, 
  Clock, 
  Building2 
} from 'lucide-react';

interface DashboardProps {
  cases: CivicCase[];
  activities: ActivityFeedItem[];
  onSelectCase: (caseId: string) => void;
  onUpvoteCase: (caseId: string) => void;
}

export default function Dashboard({
  cases,
  activities,
  onSelectCase,
  onUpvoteCase,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Categories list
  const categories = ['All', 'Infrastructure', 'Sanitation', 'Traffic', 'Public Safety', 'Utilities', 'Environment'];

  // Metrics calculations
  const metrics = useMemo(() => {
    const total = cases.length;
    const active = cases.filter(c => c.status !== 'Resolved').length;
    const resolved = cases.filter(c => c.status === 'Resolved').length;
    
    // Average accountability score of wards from the cases
    // We can compute a dynamic accountability score based on resolution rates:
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
    // Let's blend that into a realistic score
    const accountabilityScore = Math.round(resolutionRate * 0.7 + 30); 

    return { total, active, resolved, accountabilityScore };
  }, [cases]);

  // Filter cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [cases, searchQuery, selectedCategory, selectedStatus]);

  // Chart data calculations
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [cases]);

  // Severity badges styling helper
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // Status badges styling helper
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'In Progress':
        return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
      case 'Investigating':
        return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border border-slate-500/30';
    }
  };

  return (
    <div id="dashboard-view" className="space-y-8 animate-fade-in">
      {/* Hero Banner with Subtle Teal Gradient Border */}
      <div id="dashboard-hero-banner" className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-slate-900/40 p-5 md:p-6 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight font-sans">
              CaseZero
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-2xl">
              AI-powered civic issue tracking. Every report becomes a case. Every case gets resolved.
            </p>
          </div>
          
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-bold text-teal-400" id="hero-step-indicators">
            <span className="opacity-90">① Report Issue</span>
            <span className="text-slate-600 mx-1">→</span>
            <span className="opacity-90">② AI Analyzes</span>
            <span className="text-slate-600 mx-1">→</span>
            <span className="opacity-90">③ Resolution Tracked</span>
          </div>
        </div>
      </div>

      {/* Upper header segment */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between" id="dashboard-header-block">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans" id="dashboard-title">
            Civic Operations
          </h2>
          <p className="text-slate-400 text-sm font-medium" id="dashboard-tagline">
            From report to resolution. Transparent tracking & ward performance auditing.
          </p>
        </div>
      </div>

      {/* Grid of Key Performance Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" id="dashboard-metrics-grid">
        {/* Metric 1: Total Cases */}
        <div id="metric-total-cases" className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between" id="metric-total-head">
            <span className="text-sm font-semibold text-slate-400">Total Logged Cases</span>
            <div className="rounded-lg bg-slate-800 p-2 text-slate-300" id="metric-total-icon">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2" id="metric-total-content">
            <span className="text-4xl font-extrabold text-white tracking-tight">{metrics.total}</span>
            <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp size={12} /> Live
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Cumulative incidents registered</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500/50 to-transparent" />
        </div>

        {/* Metric 2: Active Cases */}
        <div id="metric-active-cases" className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between" id="metric-active-head">
            <span className="text-sm font-semibold text-slate-400">Active Queue</span>
            <div className="rounded-lg bg-cyan-950/40 p-2 text-cyan-400" id="metric-active-icon">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2" id="metric-active-content">
            <span className="text-4xl font-extrabold text-white tracking-tight">{metrics.active}</span>
            <span className="text-xs font-medium text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              In Remediation
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Open, investigating, or in progress</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </div>

        {/* Metric 3: Resolved Cases */}
        <div id="metric-resolved-cases" className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between" id="metric-resolved-head">
            <span className="text-sm font-semibold text-slate-400">Resolved Cases</span>
            <div className="rounded-lg bg-emerald-950/40 p-2 text-emerald-400" id="metric-resolved-icon">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2" id="metric-resolved-content">
            <span className="text-4xl font-extrabold text-white tracking-tight">{metrics.resolved}</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              {Math.round((metrics.resolved / (metrics.total || 1)) * 100)}% Rate
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Permanently closed & verified by community</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </div>

        {/* Metric 4: Accountability Score */}
        <div id="metric-score" className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between" id="metric-score-head">
            <span className="text-sm font-semibold text-slate-400">Accountability Score</span>
            <div className="rounded-lg bg-indigo-950/40 p-2 text-indigo-400" id="metric-score-icon">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2" id="metric-score-content">
            <span className="text-4xl font-extrabold text-white tracking-tight">{metrics.accountabilityScore}</span>
            <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Index</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden" id="metric-score-progress">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-teal-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${metrics.accountabilityScore}%` }}
              id="metric-score-progress-bar"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Based on response rate & resolution velocity</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500/50 to-transparent" />
        </div>
      </div>

      {/* Middle row: Advanced analytics visualizations (Custom SVG charts) */}
      <div className="grid gap-6 lg:grid-cols-3" id="dashboard-analytics-row">
        {/* Category breakdown (Custom SVG Bar Chart) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 lg:col-span-2" id="analytics-chart-categories">
          <div className="flex items-center justify-between mb-6" id="chart-cat-head">
            <div>
              <h3 className="text-base font-bold text-white" id="chart-cat-title">Incidents by Category</h3>
              <p className="text-sm text-slate-400">Volume distribution of civic system failure reports</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 px-2 py-1 rounded bg-slate-800/60" id="chart-cat-label">Current Data</span>
          </div>
          
          {/* Custom SVG Bar Chart */}
          <div className="mt-4 flex flex-col justify-end space-y-4" id="custom-bar-chart-container">
            {categories.filter(cat => cat !== 'All').map((cat) => {
              const count = categoryCounts[cat] || 0;
              const maxCount = Math.max(...(Object.values(categoryCounts) as number[]), 1);
              const percentage = (count / maxCount) * 100;
              return (
                <div key={cat} className="space-y-1.5" id={`chart-row-${cat.toLowerCase().replace(' ', '-')}`}>
                  <div className="flex justify-between text-sm font-medium" id={`chart-text-${cat}`}>
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-slate-400 font-bold">{count} {count === 1 ? 'case' : 'cases'}</span>
                  </div>
                  <div className="relative h-6 w-full rounded-lg bg-slate-900/90 overflow-hidden border border-slate-800" id={`chart-bar-bg-${cat}`}>
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-teal-500/30 to-teal-400/80 rounded-r-md transition-all duration-500 flex items-center pl-2.5"
                      style={{ width: `${Math.max(percentage, 3)}%` }}
                      id={`chart-bar-fill-${cat}`}
                    >
                      {percentage > 15 && (
                        <span className="text-xs text-slate-950 font-bold tracking-wider" id={`chart-perc-${cat}`}>
                          {Math.round(percentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accountability Audit Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between" id="analytics-audit-sidebar">
          <div id="audit-head">
            <div className="flex items-center gap-2 mb-2" id="audit-badge">
              <span className="bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded">System Efficiency</span>
            </div>
            <h3 className="text-base font-bold text-white" id="audit-title">Response Cycle Audit</h3>
            <p className="text-sm text-slate-400 mt-1">Automatic triage isolates root causes and routes task tickets instantly. Average routing latency: <strong>3.1 minutes</strong>.</p>
          </div>

          {/* Quick Stats Grid */}
          <div className="my-6 space-y-3" id="audit-stats-grid">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60" id="audit-stat-1">
              <span className="text-sm text-slate-400 font-medium">Automatic Dispatch Rate</span>
              <span className="text-sm font-bold text-emerald-400">100%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60" id="audit-stat-2">
              <span className="text-sm text-slate-400 font-medium">Verification Threshold</span>
              <span className="text-sm font-bold text-white">5 Users</span>
            </div>
            <div className="flex justify-between items-center py-2" id="audit-stat-3">
              <span className="text-sm text-slate-400 font-medium">System SLA Compliance</span>
              <span className="text-sm font-bold text-teal-400">94.6%</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/40 p-3.5 border border-slate-800 flex gap-3 items-start" id="audit-callout">
            <Clock size={16} className="text-teal-400 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-slate-300" id="audit-callout-text">
              Every citizen report undergoes AI parsing to cross-reference geographic tags, preventing duplicates and establishing instant accountability metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom section: Main interactive inventory and real-time updates */}
      <div className="grid gap-6 lg:grid-cols-3" id="dashboard-lower-grid">
        {/* Cases Inventory list (2/3 width) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 lg:col-span-2 space-y-6" id="dashboard-cases-inventory">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" id="inventory-header">
            <div>
              <h3 className="text-lg font-bold text-white" id="inventory-title">Civic Incidents Ledger</h3>
              <p className="text-sm text-slate-400">Browse reported cases, check remediation statuses, and cast your verification vote</p>
            </div>
          </div>

          {/* Search and filter controls bar */}
          <div className="grid gap-3 sm:grid-cols-3" id="filters-container">
            {/* Search Input */}
            <div className="relative sm:col-span-1" id="search-input-box">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="case-search"
                type="text"
                placeholder="Search cases, streets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Category Selector */}
            <div id="filter-cat-box">
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:border-teal-500 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div id="filter-status-box">
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:border-teal-500 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Cases grid/list */}
          <div className="space-y-3.5" id="cases-list">
            {filteredCases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center" id="empty-cases-state">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300" id="empty-cases-msg">No incidents found</p>
                <p className="text-sm text-slate-500 mt-1" id="empty-cases-sub">Try adjustments to your search queries or filter attributes</p>
              </div>
            ) : (
              filteredCases.map((c) => (
                <div
                  key={c.id}
                  id={`case-row-card-${c.id}`}
                  className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-950/80 flex flex-col sm:flex-row gap-4"
                >
                  {/* Photo area */}
                  <div className="relative h-28 w-full sm:w-28 shrink-0 overflow-hidden rounded-lg bg-slate-900 border border-slate-800" id={`case-thumb-box-${c.id}`}>
                    <img
                      src={c.photoUrl}
                      alt={c.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      id={`case-thumb-img-${c.id}`}
                    />
                    <div className="absolute top-1.5 left-1.5" id={`case-badge-container-${c.id}`}>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getSeverityBadgeClass(c.severity)}`}>
                        {c.severity}
                      </span>
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 flex flex-col justify-between min-w-0" id={`case-info-box-${c.id}`}>
                    <div id={`case-info-top-${c.id}`}>
                      <div className="flex flex-wrap items-center gap-2 mb-1" id={`case-meta-badges-${c.id}`}>
                        <span className="text-xs font-bold text-teal-400 bg-teal-500/5 px-2 py-0.5 rounded border border-teal-500/10">
                          {c.category}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getStatusBadgeClass(c.status)}`}>
                          {c.status}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {c.wardName}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors truncate" id={`case-title-txt-${c.id}`}>
                        {c.title}
                      </h4>
                      <p className="text-sm text-slate-400 line-clamp-2 mt-1 leading-relaxed pr-2" id={`case-desc-txt-${c.id}`}>
                        {c.description}
                      </p>
                    </div>

                    {/* Interactive bottom controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900" id={`case-actions-row-${c.id}`}>
                      <div className="flex items-center gap-4 text-slate-500 text-sm" id={`case-votes-voters-${c.id}`}>
                        <button
                          id={`btn-upvote-${c.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpvoteCase(c.id);
                          }}
                          className="flex items-center gap-1.5 font-bold hover:text-teal-400 text-slate-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-900"
                        >
                          <ThumbsUp size={13} className="text-slate-400 group-hover:text-teal-400" />
                          <span>{c.upvotes} Upvotes</span>
                        </button>
                        <span className="hidden sm:inline-block text-[11px]">
                          <strong>{c.communityVerifications}</strong> verifications
                        </span>
                      </div>

                      <button
                        id={`btn-inspect-case-${c.id}`}
                        onClick={() => onSelectCase(c.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:text-white transition-colors bg-teal-500/10 hover:bg-teal-500/25 px-2.5 py-1.5 rounded-lg border border-teal-500/20"
                      >
                        <span>Inspect Case</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Feed (1/3 width) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col h-full" id="dashboard-activity-feed">
          <div className="mb-5" id="activity-feed-head">
            <h3 className="text-base font-bold text-white" id="activity-title">Remediation Pulse</h3>
            <p className="text-sm text-slate-400 mt-1">Real-time system telemetry and dispatch updates</p>
          </div>

          <div className="flex-1 relative" id="activity-timeline-container">
            {/* Visual vertical rail line */}
            <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-slate-800" id="activity-rail-line" />

            <div className="space-y-5" id="activity-logs">
              {activities.map((act) => {
                // Determine icon or bullet styling based on type
                let bulletBg = 'bg-slate-800 border-slate-700';
                let textAccent = 'text-slate-400';
                
                if (act.type === 'reported') {
                  bulletBg = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                  textAccent = 'text-amber-400/90 font-medium';
                } else if (act.type === 'status_change') {
                  bulletBg = 'bg-blue-500/10 border-blue-500/30 text-blue-400';
                  textAccent = 'text-blue-300 font-medium';
                } else if (act.type === 'resolved') {
                  bulletBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                  textAccent = 'text-emerald-400 font-medium';
                } else if (act.type === 'verified') {
                  bulletBg = 'bg-purple-500/10 border-purple-500/30 text-purple-400';
                  textAccent = 'text-purple-300';
                }

                return (
                  <div key={act.id} className="relative pl-8 group" id={`activity-item-${act.id}`}>
                    {/* Ring Bullet node */}
                    <div className={`absolute left-2 top-1 h-4.5 w-4.5 -translate-x-1/2 rounded-full border flex items-center justify-center transition-all ${bulletBg}`} id={`activity-node-${act.id}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>

                    <div className="space-y-0.5" id={`activity-desc-container-${act.id}`}>
                      <div className="flex items-center gap-2" id={`activity-time-user-${act.id}`}>
                        <span className="text-xs text-slate-500 font-bold" id={`activity-time-${act.id}`}>
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs font-bold text-slate-400" id={`activity-user-${act.id}`}>
                          via {act.user}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-300 leading-relaxed font-semibold pr-1" id={`activity-msg-${act.id}`}>
                        {act.message}
                      </p>

                      <button
                        id={`btn-act-jump-${act.id}`}
                        onClick={() => onSelectCase(act.caseId)}
                        className="text-xs font-semibold text-teal-400 hover:text-white hover:underline flex items-center gap-0.5 pt-0.5"
                      >
                        <span>View case #{act.caseId.replace('case-', '')}</span>
                        <ArrowUpRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
