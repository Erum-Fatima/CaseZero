import { useState, useMemo, useEffect, useRef } from 'react';
import { Ward, CivicCase } from '../types';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Clock, 
  Search, 
  ArrowUpRight, 
  CheckCircle, 
  ChevronRight,
  Info,
  Mail,
  Copy,
  Check,
  FileText,
  AlertCircle
} from 'lucide-react';

interface WardAccountabilityProps {
  wards: Ward[];
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
  onPageChange: (page: string) => void;
}

export default function WardAccountability({
  wards,
  cases,
  onSelectCase,
  onPageChange,
}: WardAccountabilityProps) {
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  
  const [generatingWardId, setGeneratingWardId] = useState<string | null>(null);
  const [petitionResult, setPetitionResult] = useState<{
    wardId: string;
    wardName: string;
    councilor: string;
    subject: string;
    body: string;
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedImpactedResidents: number;
  } | null>(null);
  const [petitionError, setPetitionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flashingWards, setFlashingWards] = useState<Record<string, 'increase' | 'decrease' | null>>({});
  const prevWardsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const changes: Record<string, 'increase' | 'decrease' | null> = {};
    let hasChanges = false;

    wards.forEach(ward => {
      const prevScore = prevWardsRef.current[ward.id];
      if (prevScore !== undefined && prevScore !== ward.accountabilityScore) {
        changes[ward.id] = ward.accountabilityScore > prevScore ? 'increase' : 'decrease';
        hasChanges = true;
      }
      prevWardsRef.current[ward.id] = ward.accountabilityScore;
    });

    if (hasChanges) {
      setFlashingWards(prev => ({ ...prev, ...changes }));

      const timer = setTimeout(() => {
        setFlashingWards(prev => {
          const updated = { ...prev };
          Object.keys(changes).forEach(id => {
            updated[id] = null;
          });
          return updated;
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [wards]);

  // Group cases by ward to display localized list
  const wardCases = useMemo(() => {
    const grouped: Record<string, CivicCase[]> = {};
    cases.forEach(c => {
      if (!grouped[c.wardId]) {
        grouped[c.wardId] = [];
      }
      grouped[c.wardId].push(c);
    });
    return grouped;
  }, [cases]);

  const handleGeneratePetition = async (ward: Ward) => {
    setGeneratingWardId(ward.id);
    setPetitionError(null);
    setPetitionResult(null);
    setCopied(false);

    try {
      const openCasesForWard = (wardCases[ward.id] || []).filter(c => c.status !== 'Resolved');
      const response = await fetch('/api/generate-petition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wardName: ward.name,
          councilor: ward.councilor,
          cases: openCasesForWard.map(c => ({
            title: c.title,
            description: c.description,
            category: c.category,
            severity: c.severity,
            reportedAt: c.reportedAt,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate collective petition letter.');
      }

      const data = await response.json();
      setPetitionResult({
        wardId: ward.id,
        wardName: ward.name,
        councilor: ward.councilor,
        subject: data.subject,
        body: data.body,
        urgencyLevel: data.urgencyLevel,
        estimatedImpactedResidents: data.estimatedImpactedResidents,
      });
    } catch (err: any) {
      console.error(err);
      setPetitionError(err.message || 'Error occurred while drafting collective petition.');
    } finally {
      setGeneratingWardId(null);
    }
  };

  const handleCopyPetition = () => {
    if (!petitionResult) return;
    const fullText = `Subject: ${petitionResult.subject}\n\n${petitionResult.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Sort wards dynamically by score for rankings
  const rankedWards = useMemo(() => {
    return [...wards].sort((a, b) => b.accountabilityScore - a.accountabilityScore);
  }, [wards]);

  const ward12 = useMemo(() => {
    return wards.find(w => w.id === 'ward-12');
  }, [wards]);

  // Highlight specific selected ward details or default to rank 1
  const activeWard = useMemo(() => {
    if (selectedWardId) {
      return wards.find(w => w.id === selectedWardId) || wards[0];
    }
    return rankedWards[0];
  }, [wards, selectedWardId, rankedWards]);

  // Ranking badges styles
  const getRankingBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-500/10';
      case 2:
        return 'bg-slate-300 text-slate-950 font-black border-slate-200 shadow-md shadow-slate-500/10';
      case 3:
        return 'bg-amber-600 text-slate-950 font-black border-amber-500 shadow-md shadow-amber-600/10';
      default:
        return 'bg-slate-800 text-slate-400 font-semibold border-slate-700';
    }
  };

  // Score styling helper
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 70) return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
    if (score >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div id="wards-view" className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans" id="wards-title">
          Ward Performance Ledger
        </h2>
        <p className="text-slate-400 text-sm font-medium" id="wards-subtitle">
          Auditing administrative districts in real-time. Dynamic rankings hold councilors publicly accountable for resolution speed.
        </p>
      </div>

      {/* Top Section - Ward Rankings (Leaderboard) & Top Ward detail */}
      <div className="grid gap-6 lg:grid-cols-3" id="wards-rankings-row">
        {/* Ranked Leaderboard table (2/3 width) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 lg:col-span-2 space-y-5" id="leaderboard-container">
          <div className="flex items-center justify-between" id="leaderboard-header">
            <div>
              <h3 className="text-base font-bold text-white" id="leaderboard-title">District Performance Leaderboard</h3>
              <p className="text-xs text-slate-400">Wards sorted by their overall accountability scoring index</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20">Updated Live</span>
          </div>

          <div className="overflow-x-auto" id="leaderboard-table-box">
            <table className="w-full text-left text-xs" id="leaderboard-table">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px] pb-3" id="leaderboard-thead">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Ward District</th>
                  <th className="pb-3">Council Representative</th>
                  <th className="pb-3 text-center">Resolution %</th>
                  <th className="pb-3 text-center">Avg Days</th>
                  <th className="pb-3 text-right pr-2">Audit Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60" id="leaderboard-tbody">
                {rankedWards.map((w, index) => {
                  const rank = index + 1;
                  const isSelected = activeWard.id === w.id;
                  return (
                    <tr
                      key={w.id}
                      id={`leaderboard-row-${w.id}`}
                      onClick={() => setSelectedWardId(w.id)}
                      className={`group cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-gradient-to-r from-teal-500/5 to-slate-900/40 font-semibold' 
                          : 'hover:bg-slate-950/40'
                      }`}
                    >
                      <td className="py-3.5 pl-2">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold leading-none ${getRankingBadge(rank)}`}>
                          {rank}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-white group-hover:text-teal-400 transition-colors">
                        {w.name.split(' (')[0]}
                        <span className="block text-[10px] text-slate-500 font-medium font-mono mt-0.5">{w.id.toUpperCase()}</span>
                      </td>
                      <td className="py-3.5 text-slate-300 font-medium">
                        {w.councilor}
                      </td>
                      <td className="py-3.5 text-center font-bold text-slate-400 font-mono">
                        {w.resolutionRate}%
                      </td>
                      <td className="py-3.5 text-center font-bold text-slate-400 font-mono">
                        {w.averageResolutionDays}d
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${getScoreColorClass(w.accountabilityScore)}`}>
                          {w.accountabilityScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Ward Deep Dive Sidebar (1/3 width) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between" id="ward-dive-sidebar">
          <div className="space-y-4" id="ward-dive-top">
            <div className="flex justify-between items-start" id="ward-dive-header">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">District Audit</span>
                <h3 className="text-base font-extrabold text-white mt-1.5" id="ward-dive-title">{activeWard.name}</h3>
              </div>
              <span className={`h-9 w-9 rounded-xl border flex items-center justify-center font-bold text-sm ${getScoreColorClass(activeWard.accountabilityScore)}`}>
                {activeWard.accountabilityScore}
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex gap-3 items-center" id="ward-dive-councilor">
              <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0 text-xs uppercase">
                {activeWard.councilor.split('. ').pop()?.slice(0, 2)}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Representative</p>
                <p className="text-xs font-bold text-white">{activeWard.councilor}</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3" id="ward-dive-stats">
              <div className="rounded-xl border border-slate-850 p-3 text-center" id="dive-stat-resolved">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Resolved</span>
                <span className="text-lg font-black text-emerald-400 block mt-0.5">{activeWard.resolvedCases}</span>
              </div>
              <div className="rounded-xl border border-slate-850 p-3 text-center" id="dive-stat-backlog">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Open Backlog</span>
                <span className="text-lg font-black text-amber-400 block mt-0.5">{activeWard.activeCases}</span>
              </div>
            </div>

            {/* Local Active cases list */}
            <div className="space-y-2 pt-1" id="ward-dive-cases">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Active Incidents in Ward</h4>
              <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1" id="ward-dive-scrollable-cases">
                {(!wardCases[activeWard.id] || wardCases[activeWard.id].filter(c => c.status !== 'Resolved').length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">No active issues in queue.</p>
                ) : (
                  wardCases[activeWard.id].filter(c => c.status !== 'Resolved').map((c) => (
                    <div
                      key={c.id}
                      id={`ward-case-mini-${c.id}`}
                      onClick={() => onSelectCase(c.id)}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-700 transition-colors cursor-pointer flex justify-between items-center text-[11px] group"
                    >
                      <div className="min-w-0 pr-2" id={`ward-case-mini-text-${c.id}`}>
                        <p className="font-bold text-white group-hover:text-teal-400 truncate transition-colors">{c.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{c.location.split(',')[0]}</p>
                      </div>
                      <ChevronRight size={11} className="text-slate-500 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4" id="ward-dive-footer">
            {activeWard.accountabilityScore < 60 ? (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex gap-2 items-start" id="warning-box">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-red-300 font-medium">
                  <strong>Critical Backlog Warning:</strong> This district has exceeded target SLAs. Automated municipal audits have initiated a ranking correction warning.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2 items-start" id="healthy-box">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-emerald-300 font-medium">
                  <strong>SLA Compliance Normal:</strong> Response cycles remain under standard thresholds. No negative performance triggers are pending.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Grid: Detailed Accountability Scorecards */}
      <div className="space-y-4" id="wards-scorecards-container">
        <div>
          <h3 className="text-lg font-bold text-white" id="scorecards-title">District Scorecards</h3>
          <p className="text-xs text-slate-400">Granular performance benchmarks of individual administrative zones</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" id="scorecards-grid">
          {wards.map((w) => {
            const openCases = (wardCases[w.id] || []).filter(c => c.status !== 'Resolved');
            const hasThreeOrMoreOpen = openCases.length >= 3;

            return (
              <div
                key={w.id}
                id={`scorecard-${w.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3" id={`scorecard-top-${w.id}`}>
                  <div className="flex justify-between items-start" id={`scorecard-head-${w.id}`}>
                    <div>
                      <h4 className="text-sm font-bold text-white" id={`scorecard-name-${w.id}`}>{w.name.split(' (')[0]}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5" id={`scorecard-councilor-${w.id}`}>Rep: {w.councilor.replace('Hon. ', '')}</p>
                    </div>
                    <span 
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition-colors duration-500 ${getScoreColorClass(w.accountabilityScore)} ${
                        flashingWards[w.id] === 'decrease' 
                          ? '!text-red-500' 
                          : flashingWards[w.id] === 'increase' 
                          ? '!text-green-500' 
                          : ''
                      }`} 
                      id={`scorecard-score-${w.id}`}
                    >
                      {w.accountabilityScore}
                    </span>
                  </div>

                  {/* Linear Resolution rate bar */}
                  <div className="space-y-1.5" id={`scorecard-progress-box-${w.id}`}>
                    <div className="flex justify-between items-center text-[10px] font-bold" id={`scorecard-progress-text-${w.id}`}>
                      <span className="text-slate-500">RESOLUTION VELOCITY</span>
                      <span className="text-slate-300 font-mono">{w.resolutionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1" id={`scorecard-bar-bg-${w.id}`}>
                      <div 
                        className={`h-full rounded-full ${w.accountabilityScore >= 70 ? 'bg-teal-400' : w.accountabilityScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${w.resolutionRate}%` }}
                        id={`scorecard-bar-fill-${w.id}`}
                      />
                    </div>
                  </div>

                  {/* Bullet stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1" id={`scorecard-bullets-${w.id}`}>
                    <div id={`sc-bullet-total-${w.id}`}>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Total Filed</p>
                      <p className="text-sm font-extrabold text-white mt-0.5">{w.totalCases}</p>
                    </div>
                    <div id={`sc-bullet-days-${w.id}`}>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Avg Response</p>
                      <p className="text-sm font-extrabold text-slate-300 mt-0.5">{w.averageResolutionDays} days</p>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div className="space-y-2 pt-2" id={`scorecard-actions-${w.id}`}>
                  <button
                    id={`btn-scorecard-inspect-${w.id}`}
                    onClick={() => setSelectedWardId(w.id)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-950 hover:border-slate-700 py-2 text-center text-[11px] font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Inspect District Audit</span>
                    <ChevronRight size={10} />
                  </button>

                  {hasThreeOrMoreOpen && (
                    <button
                      id={`btn-generate-petition-${w.id}`}
                      onClick={() => handleGeneratePetition(w)}
                      disabled={generatingWardId !== null}
                      className="w-full rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800/40 text-slate-950 disabled:text-slate-400 py-2.5 text-center text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-teal-500/10"
                    >
                      {generatingWardId === w.id ? (
                        <>
                          <Clock size={11} className="animate-spin" />
                          <span>AI Drafting Petition...</span>
                        </>
                      ) : (
                        <>
                          <Mail size={11} />
                          <span>Generate Collective Petition</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prominent Ward 12 Petition Escalation Section */}
        {ward12 && (
          <div id="ward-12-petition-callout" className="rounded-2xl border border-teal-500/30 bg-slate-900/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md mt-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">Ward 12 Escalation Priority</span>
              <h4 className="text-base font-extrabold text-white">Generate Collective Petition for {ward12.name.split(' (')[0]}</h4>
              <p className="text-xs text-slate-400 max-w-xl">
                Ward 12 currently holds the highest volume of open municipal service backlogs in our database. Mobilize community action immediately to petition Councilor {ward12.councilor}.
              </p>
            </div>
            <button
              id="btn-generate-petition-ward-12-prominent"
              onClick={() => handleGeneratePetition(ward12)}
              disabled={generatingWardId !== null}
              className="px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800/40 text-slate-950 disabled:text-slate-400 text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] shrink-0"
            >
              {generatingWardId === 'ward-12' ? (
                <>
                  <Clock size={16} className="animate-spin" />
                  <span>AI Drafting Petition...</span>
                </>
              ) : (
                <>
                  <FileText size={16} />
                  <span>Generate Collective Petition for Ward 12</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Dynamic Collective Petition Panel */}
        {petitionResult && (
          <div 
            id="petition-draft-panel" 
            className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6 shadow-2xl animate-fade-in mt-4"
          >
            <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-4" id="petition-panel-header">
              <div className="space-y-1" id="petition-header-left">
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20">
                  Collective Action Drafted
                </span>
                <h3 className="text-lg font-black text-white mt-1.5" id="petition-panel-title">
                  Formal Petition: {petitionResult.wardName.split(' (')[0]}
                </h3>
                <p className="text-xs text-slate-400">
                  Addressed to Representative {petitionResult.councilor}
                </p>
              </div>

              {/* Badges & Info */}
              <div className="flex items-center gap-3" id="petition-header-right">
                {/* Urgency Badge */}
                <div id="petition-urgency-badge">
                  {petitionResult.urgencyLevel === 'CRITICAL' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-black text-red-400 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      Critical Urgency
                    </span>
                  )}
                  {petitionResult.urgencyLevel === 'HIGH' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 text-xs font-black text-orange-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      High Urgency
                    </span>
                  )}
                  {petitionResult.urgencyLevel === 'MEDIUM' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Medium Urgency
                    </span>
                  )}
                  {petitionResult.urgencyLevel === 'LOW' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      Low Urgency
                    </span>
                  )}
                </div>

                {/* Estimated Impacted Residents */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1 text-center" id="petition-impact-residents">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Est. Impacted</span>
                  <span className="text-xs font-black text-teal-400 font-mono mt-0.5">
                    {petitionResult.estimatedImpactedResidents.toLocaleString()} residents
                  </span>
                </div>
              </div>
            </div>

            {/* Subject & Body */}
            <div className="space-y-4" id="petition-content-box">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4 space-y-1.5" id="petition-subject-card">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Subject Line</span>
                <p className="text-sm font-bold text-white" id="petition-subject-text">
                  {petitionResult.subject}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5 space-y-3" id="petition-body-card">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Letter Body</span>
                <div 
                  className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap font-sans max-h-[380px] overflow-y-auto pr-2" 
                  id="petition-body-text"
                >
                  {petitionResult.body}
                </div>
              </div>
            </div>

            {/* Copy and Send Button */}
            <div className="flex justify-between items-center flex-wrap gap-3" id="petition-footer-row">
              <span className="text-[11px] text-slate-500 font-medium">
                Copy this formal petition letter to dispatch to ward officials or distribute to neighborhood associations.
              </span>
              <button
                id="btn-copy-send-petition"
                onClick={handleCopyPetition}
                className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg ${
                  copied 
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/10' 
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/10'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy & Send Petition</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {petitionError && (
          <div id="petition-error-box" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400 flex items-center gap-2 animate-fade-in mt-4">
            <AlertCircle size={14} />
            <span>{petitionError}</span>
          </div>
        )}
      </div>

      {/* Bottom Row - SVG Graph Comparing Resolution Velocities */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6" id="wards-charts-panel">
        <div>
          <h3 className="text-base font-bold text-white" id="charts-panel-title">Comparative Resolution Velocity (Days)</h3>
          <p className="text-xs text-slate-400">Shorter bars represent faster response cycles (ideal). Wards exceeding 7-day targets are subject to SLA remediation.</p>
        </div>

        {/* Custom SVG Line or Bar Chart */}
        <div className="grid gap-6 md:grid-cols-4 pt-2" id="charts-grid-bars">
          {wards.map((w) => {
            const avgDays = w.averageResolutionDays;
            // Target is 5 days. Map bar height.
            const maxDays = 15;
            const percentageHeight = (avgDays / maxDays) * 100;
            const isBreaching = avgDays > 7;

            return (
              <div 
                key={w.id} 
                id={`chart-block-${w.id}`}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between h-44 transition-all hover:border-slate-750"
              >
                <div className="flex justify-between items-start" id={`chart-block-head-${w.id}`}>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{w.name.split(' (')[0]}</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Average Days</p>
                  </div>
                  <span className={`text-xs font-mono font-extrabold ${isBreaching ? 'text-red-400' : 'text-emerald-400'}`}>
                    {avgDays}d
                  </span>
                </div>

                {/* Bottom Graphic representation */}
                <div className="space-y-3" id={`chart-block-graphics-${w.id}`}>
                  <div className="h-6 w-full bg-slate-900 border border-slate-800/80 rounded overflow-hidden relative" id={`chart-block-bar-bg-${w.id}`}>
                    <div 
                      className={`absolute left-0 top-0 bottom-0 rounded-r transition-all duration-500 ${
                        isBreaching 
                          ? 'bg-gradient-to-r from-red-500/20 to-red-500/80' 
                          : 'bg-gradient-to-r from-teal-500/20 to-teal-400/80'
                      }`}
                      style={{ width: `${Math.min(percentageHeight, 100)}%` }}
                      id={`chart-block-bar-fill-${w.id}`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500" id={`chart-block-footer-${w.id}`}>
                    <span>TARGET: 5.0d</span>
                    <span className={isBreaching ? 'text-red-400/90' : 'text-emerald-400/90'}>
                      {isBreaching ? 'SLA EXCEEDED' : 'SLA COMPLIANT'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
