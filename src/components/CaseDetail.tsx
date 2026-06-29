import { useState, useEffect } from 'react';
import { CivicCase, TimelineEvent, Ward } from '../types';
import { initialWards } from '../mockData';
import { 
  ThumbsUp, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  MapPin, 
  User, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle2, 
  FileText,
  Building,
  Wrench,
  Plus,
  Check,
  Beaker,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CaseDetailProps {
  activeCase: CivicCase | null;
  onUpvoteCase: (caseId: string) => void;
  onVerifyCase: (caseId: string) => void;
  onSimulateProgress: (caseId: string, nextStatus: CivicCase['status'], nextEvent: TimelineEvent) => void;
  onBackToDashboard: () => void;
  wards?: Ward[];
}

export default function CaseDetail({
  activeCase,
  onUpvoteCase,
  onVerifyCase,
  onSimulateProgress,
  onBackToDashboard,
  wards,
}: CaseDetailProps) {
  const [hasVerifiedThisSession, setHasVerifiedThisSession] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [showDemoControls, setShowDemoControls] = useState(false);

  const [detectorLoading, setDetectorLoading] = useState(false);
  const [detectorResult, setDetectorResult] = useState<{
    isSuspicious: boolean;
    confidenceScore: number;
    reasoning: string;
    verdict: 'CONFIRMED_RESOLVED' | 'SUSPICIOUS_CLOSURE' | 'NEEDS_REINVESTIGATION';
  } | null>(null);
  const [detectorError, setDetectorError] = useState<string | null>(null);

  // Escalation states
  const [escalationLoading, setEscalationLoading] = useState(false);
  const [escalationData, setEscalationData] = useState<{
    shortPost: string;
    longPost: string;
    hashtags: string[];
  } | null>(null);
  const [escalationError, setEscalationError] = useState<string | null>(null);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [activeEscalationTab, setActiveEscalationTab] = useState<'twitter' | 'whatsapp'>('twitter');
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    setDetectorResult(null);
    setDetectorError(null);
    setDetectorLoading(false);
  }, [activeCase?.id]);

  const handleDetectFakeResolution = async () => {
    if (!activeCase) return;
    setDetectorLoading(true);
    setDetectorError(null);
    setDetectorResult(null);

    try {
      const response = await fetch('/api/detect-fake-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseTitle: activeCase.title,
          caseDescription: activeCase.description,
          category: activeCase.category,
          reportedAt: activeCase.reportedAt,
          resolvedAt: activeCase.resolvedAt,
          communityVerifications: activeCase.communityVerifications,
          upvotes: activeCase.upvotes,
          severity: activeCase.severity
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to run fake resolution detector.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch {
          errorMsg = `Server error (${response.status}): ${response.statusText || 'Failed to analyze resolution'}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setDetectorResult(data);
    } catch (err: any) {
      console.error(err);
      setDetectorError(err.message || 'Error executing AI detector');
    } finally {
      setDetectorLoading(false);
    }
  };

  const handleReopenCase = () => {
    if (!activeCase) return;
    const nextEvent: TimelineEvent = {
      id: `evt-reopen-${Math.floor(Math.random() * 800) + 100}`,
      status: 'investigating',
      title: 'Remediation Reopened & Challenged',
      description: `AI Integrity Auditing flagged this closure as ${detectorResult?.verdict.replace(/_/g, ' ')}. Resolution challenged by community coalition consensus.`,
      timestamp: new Date().toISOString(),
      actor: 'CaseZero Integrity Watchdog',
    };

    onSimulateProgress(activeCase.id, 'Investigating', nextEvent);
    setDetectorResult(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleEscalatePublicly = async () => {
    if (!activeCase) return;
    setEscalationLoading(true);
    setEscalationError(null);
    setEscalationData(null);

    const ward = (wards || initialWards)?.find(w => w.id === activeCase.wardId);
    const councilorName = ward?.councilor || 'Eleanor Vance';
    const currentWardName = activeCase.wardName || ward?.name || 'Northwest Heights';

    const reportedDate = new Date(activeCase.reportedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - reportedDate.getTime());
    const calculatedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    try {
      const response = await fetch('/api/generate-escalation-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseTitle: activeCase.title,
          caseDescription: activeCase.description,
          category: activeCase.category,
          severity: activeCase.severity,
          wardName: currentWardName,
          councilor: councilorName,
          daysUnresolved: calculatedDays,
          communityVerifications: activeCase.communityVerifications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate public escalation post.');
      }

      const data = await response.json();
      setEscalationData(data);
      setIsEscalationModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setEscalationError(err.message || 'Error drafting AI escalation post');
    } finally {
      setEscalationLoading(false);
    }
  };

  if (!activeCase) {
    return (
      <div id="case-detail-empty" className="text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-white">No Case Selected</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Please select an incident ticket from the Dashboard list or log a new case to inspect.
        </p>
        <button
          id="btn-empty-back-home"
          onClick={onBackToDashboard}
          className="mt-6 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-teal-400 transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleVerifyClick = () => {
    if (hasVerifiedThisSession) return;
    onVerifyCase(activeCase.id);
    setHasVerifiedThisSession(true);
  };

  // Handler to simulate moving the case forward in the remediation cycle
  const handleTriggerNextStep = () => {
    setSimulationLoading(true);

    setTimeout(() => {
      let nextStatus: CivicCase['status'] = 'Open';
      let eventTitle = '';
      let eventDesc = '';
      let actorName = 'CaseZero Dispatcher';

      if (activeCase.status === 'Open') {
        nextStatus = 'Investigating';
        eventTitle = 'Field Investigation Scheduled';
        eventDesc = 'CaseZero automatically cross-referenced traffic camera data and queued an inspector dispatch order.';
        actorName = 'Operations Room';
      } else if (activeCase.status === 'Investigating') {
        nextStatus = 'In Progress';
        eventTitle = 'Repairs Commenced (In Progress)';
        eventDesc = 'Public Works repair crew #3 has arrived on-site with materials and specialized excavation tools.';
        actorName = 'Muni Public Works Crew';
      } else if (activeCase.status === 'In Progress') {
        nextStatus = 'Resolved';
        eventTitle = 'Remediation Finalized & Verified';
        eventDesc = 'Repair completed, structural integrity confirmed by on-site load sensors, and local utilities fully restored.';
        actorName = 'Lead Engineer J. Vance';
      }

      const nextEvent: TimelineEvent = {
        id: `evt-sim-${Math.floor(Math.random() * 800) + 100}`,
        status: nextStatus.toLowerCase().replace(' ', '_') as any,
        title: eventTitle,
        description: eventDesc,
        timestamp: new Date().toISOString(),
        actor: actorName,
      };

      onSimulateProgress(activeCase.id, nextStatus, nextEvent);
      setSimulationLoading(false);
    }, 1000);
  };

  // Determine severity style for detail indicators
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
      case 'High':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Medium':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  // Determine timeline status markers
  const isStepCompleted = (stepStatus: string) => {
    const statusOrder = ['reported', 'assigned', 'investigating', 'in_progress', 'resolved'];
    const currentStatusFormatted = activeCase.status.toLowerCase().replace(' ', '_');
    
    // Map status strings to order indexes
    const getIndex = (s: string) => {
      if (s === 'open') return 0;
      if (s === 'investigating') return 2;
      if (s === 'in_progress') return 3;
      if (s === 'resolved') return 4;
      return 1; // assigned
    };

    return getIndex(currentStatusFormatted) >= getIndex(stepStatus);
  };

  const reportedDate = new Date(activeCase.reportedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - reportedDate.getTime());
  const daysUnresolved = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  const isEscalationEligible = 
    activeCase.status === 'Open' || activeCase.status === 'Investigating';

  return (
    <div id={`case-detail-view-${activeCase.id}`} className="space-y-8 animate-fade-in">
      {/* Back button and page label */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="case-detail-top-bar">
        <button
          id="btn-detail-back-home"
          onClick={onBackToDashboard}
          className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          &larr; Back to Incident Ledger
        </button>

        <div className="flex items-center gap-2" id="case-id-badges">
          <span className="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            ID: #{activeCase.id.replace('case-', '')}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider ${getSeverityBadgeClass(activeCase.severity)}`}>
            {activeCase.severity} Severity
          </span>
          {activeCase.status !== 'Resolved' && (() => {
            const hoursSinceReported = (new Date().getTime() - new Date(activeCase.reportedAt).getTime()) / (1000 * 60 * 60);
            const remaining = 24 - hoursSinceReported;
            const displayHours = Math.max(0, Math.round(remaining));
            
            let colorClass = 'text-slate-400 bg-slate-900 border-slate-800';
            if (remaining < 2) {
              colorClass = 'text-red-400 bg-red-500/10 border border-red-500/20';
            } else if (remaining < 6) {
              colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            }
            
            return (
              <span className={`text-xs font-bold px-2.5 py-1 rounded border ${colorClass}`} id="case-sla-countdown">
                SLA: {displayHours}h remaining
              </span>
            );
          })()}
          <span className="text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded">
            {activeCase.category}
          </span>
        </div>
      </div>

      {/* Main core layout split */}
      <div className="grid gap-8 lg:grid-cols-5" id="case-detail-body">
        
        {/* LEFT COLUMN: Visual evidence & Interactive timeline (3/5 layout) */}
        <div className="lg:col-span-3 space-y-6" id="case-detail-left-column">
          
          {/* Header block */}
          <div className="space-y-2" id="case-title-block">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans" id="case-detail-title">
              {activeCase.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium" id="case-location-box">
              <MapPin size={14} className="text-teal-400" />
              <span>{activeCase.location}</span>
            </div>
          </div>

          {/* Large Hero Evidence Photo */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl group max-h-[380px]" id="case-photo-container">
            <img
              src={activeCase.photoUrl}
              alt={activeCase.title}
              referrerPolicy="no-referrer"
              className="w-full h-full max-h-[380px] object-cover"
              id="case-detail-img"
            />
            {/* Soft dark vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between" id="case-photo-meta">
              <p className="text-[11px] text-slate-400 font-medium bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800/80 backdrop-blur-sm">
                Reported: {new Date(activeCase.reportedAt).toLocaleDateString()} {new Date(activeCase.reportedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              {activeCase.resolvedAt && (
                <p className="text-[11px] text-emerald-400 font-bold bg-emerald-950/90 px-2.5 py-1 rounded border border-emerald-500/30 backdrop-blur-sm flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Resolved: {new Date(activeCase.resolvedAt).toLocaleDateString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Interactive Community Verification Dashboard */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col sm:flex-row items-center justify-between gap-4" id="community-action-panel">
            <div className="text-center sm:text-left space-y-1" id="comm-action-left">
              <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5" id="comm-action-title">
                <ShieldCheck size={16} className="text-teal-400" />
                <span>Community Verification Status</span>
              </h4>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed" id="comm-action-desc">
                Currently backed by <strong>{activeCase.communityVerifications} residents</strong>. Incident threshold achieved to lock ticket from municipal deletion.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0 items-center justify-center sm:justify-start" id="comm-action-buttons">
              {isEscalationEligible && (
                <button
                  id="btn-escalate-publicly"
                  onClick={handleEscalatePublicly}
                  disabled={escalationLoading}
                  className="rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-500 px-4 py-2.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/30 animate-pulse disabled:opacity-50 shrink-0"
                >
                  <AlertCircle size={14} className={escalationLoading ? "animate-spin" : ""} />
                  <span>{escalationLoading ? 'AI Drafting Post...' : 'Escalate Publicly'}</span>
                </button>
              )}

              <button
                id="btn-verify-incident"
                onClick={handleVerifyClick}
                disabled={hasVerifiedThisSession}
                className={`rounded-xl px-4 py-2.5 text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                  hasVerifiedThisSession 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-500 cursor-pointer shadow-lg shadow-teal-500/5'
                }`}
              >
                <Check size={14} />
                <span>{hasVerifiedThisSession ? 'Verified' : 'Verify Incident'}</span>
              </button>

              <button
                id="btn-upvote-incident"
                onClick={() => onUpvoteCase(activeCase.id)}
                className="rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ThumbsUp size={13} className="text-teal-400" />
                <span>{activeCase.upvotes} Upvotes</span>
              </button>
            </div>
          </div>

          {/* Fake Resolution Audit Result Card */}
          {detectorResult && (
            <div id="fake-resolution-audit-card" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 shadow-xl">
              <div className="flex items-start justify-between flex-wrap gap-3" id="detector-card-header">
                <div className="space-y-1" id="detector-header-left">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider block">
                    AI Integrity Audit
                  </span>
                  <h3 className="text-sm font-extrabold text-white" id="detector-title">
                    Resolution Authenticity Report
                  </h3>
                </div>
                
                {/* Verdict Badge */}
                <div id="detector-verdict-badge">
                  {detectorResult.verdict === 'CONFIRMED_RESOLVED' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Confirmed Resolved
                    </span>
                  )}
                  {detectorResult.verdict === 'SUSPICIOUS_CLOSURE' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs font-bold text-red-400 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      Suspicious Closure
                    </span>
                  )}
                  {detectorResult.verdict === 'NEEDS_REINVESTIGATION' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Needs Reinvestigation
                    </span>
                  )}
                </div>
              </div>

              {/* Confidence & Reasoning Grid */}
              <div className="grid gap-4 sm:grid-cols-4 bg-slate-900/40 rounded-xl border border-slate-800/60 p-4" id="detector-details-grid">
                <div className="sm:col-span-1 border-b sm:border-b-0 sm:border-r border-slate-800/80 pb-3 sm:pb-0 sm:pr-4 flex flex-col justify-center" id="detector-confidence-box">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Audit Confidence
                  </span>
                  <span className="text-xl font-black text-teal-400 font-mono mt-0.5">
                    {detectorResult.confidenceScore}%
                  </span>
                </div>
                
                <div className="sm:col-span-3 flex flex-col justify-center" id="detector-reasoning-box">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    AI Integrity Reasoning
                  </span>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                    {detectorResult.reasoning}
                  </p>
                </div>
              </div>

              {/* Action Buttons: e.g. Reopen Case if suspicious / needs reinvestigation */}
              {(detectorResult.isSuspicious || detectorResult.verdict === 'SUSPICIOUS_CLOSURE' || detectorResult.verdict === 'NEEDS_REINVESTIGATION') && (
                <div className="flex justify-end pt-1" id="detector-actions">
                  <button
                    id="btn-reopen-case"
                    onClick={handleReopenCase}
                    className="rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 px-4 py-2 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/5"
                  >
                    <Wrench size={13} />
                    <span>Reopen Case for Investigation</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {detectorError && (
            <div id="detector-error-box" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-bold text-red-400 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{detectorError}</span>
            </div>
          )}

          {/* Description Block */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/20 p-6" id="case-description-box">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400" id="case-desc-header">Incident Description</h4>
            <p className="text-sm text-slate-300 leading-relaxed font-medium" id="case-desc-para">
              {activeCase.description}
            </p>
          </div>

          {/* Incident Timeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6" id="case-timeline-card">
            <div className="flex items-center justify-between" id="timeline-card-header">
              <div>
                <h3 className="text-base font-bold text-white" id="timeline-title">Remediation Status Timeline</h3>
                <p className="text-sm text-slate-400">Step-by-step progress tracking from original submission</p>
              </div>

              {/* SIMULATION ACCESSORY CONTROL */}
              {activeCase.status !== 'Resolved' && (
                <div className="flex flex-col items-end gap-2" id="demo-controls-container">
                  <button
                    id="btn-demo-controls-toggle"
                    onClick={() => setShowDemoControls(!showDemoControls)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Beaker size={12} className="text-slate-400" />
                    <span>Demo Controls</span>
                    {showDemoControls ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showDemoControls && (
                    <div className="flex flex-col items-end gap-1.5 mt-1 animate-fade-in" id="demo-controls-expanded">
                      <button
                        id="btn-simulate-remediation"
                        onClick={handleTriggerNextStep}
                        disabled={simulationLoading}
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-bold text-teal-400 hover:border-teal-500/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Wrench size={12} className={simulationLoading ? 'animate-spin' : ''} />
                        <span>{simulationLoading ? 'Simulating...' : 'Advance Case Status'}</span>
                      </button>
                      <span className="text-[10px] text-slate-500 text-right max-w-[200px]" id="demo-controls-disclaimer">
                        For evaluation purposes only — simulates real-time case progression
                      </span>
                    </div>
                  )}
                </div>
              )}

              {activeCase.status === 'Resolved' && (
                <button
                  id="btn-challenge-resolution"
                  onClick={handleDetectFakeResolution}
                  disabled={detectorLoading}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-950 px-3.5 py-1.5 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/5"
                >
                  <ShieldCheck size={12} className={detectorLoading ? 'animate-spin' : ''} />
                  <span>{detectorLoading ? 'AI Re-Evaluating...' : 'Challenge Resolution'}</span>
                </button>
              )}
            </div>

            <div className="relative pl-6 space-y-6" id="timeline-stepper">
              {/* Vertical line connector */}
              <div className="absolute left-3 top-2.5 bottom-2.5 w-[2px] bg-slate-800" id="timeline-stepper-line" />

              {/* Step 1: Reported */}
              <div className="relative pl-6" id="step-node-reported">
                <div className={`absolute left-0 top-1 h-6 w-6 -translate-x-1/2 rounded-full border flex items-center justify-center transition-all ${
                  isStepCompleted('reported') 
                    ? 'bg-teal-500 border-teal-500 text-slate-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`} id="step-dot-reported">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-none ${isStepCompleted('reported') ? 'text-white' : 'text-slate-500'}`} id="step-title-reported">
                    1. Reported
                  </h4>
                  {activeCase.timeline.find(e => e.status === 'reported') ? (
                    <div className="mt-1 space-y-1" id="step-details-reported">
                      <p className="text-sm text-slate-300 font-medium">
                        {activeCase.timeline.find(e => e.status === 'reported')?.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Logged on {new Date(activeCase.reportedAt).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 mt-1">Pending submission parameters.</p>
                  )}
                </div>
              </div>

              {/* Step 2: Investigating */}
              <div className="relative pl-6" id="step-node-investigating">
                <div className={`absolute left-0 top-1 h-6 w-6 -translate-x-1/2 rounded-full border flex items-center justify-center transition-all ${
                  isStepCompleted('investigating') 
                    ? 'bg-teal-500 border-teal-500 text-slate-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`} id="step-dot-investigating">
                  <Clock size={12} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-none ${isStepCompleted('investigating') ? 'text-white' : 'text-slate-500'}`} id="step-title-investigating">
                    2. Investigating / Triage
                  </h4>
                  {activeCase.timeline.find(e => e.status === 'investigating') ? (
                    <div className="mt-1 space-y-1" id="step-details-investigating">
                      <p className="text-sm text-slate-300 font-medium">
                        {activeCase.timeline.find(e => e.status === 'investigating')?.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Updated: {new Date(activeCase.timeline.find(e => e.status === 'investigating')?.timestamp || '').toLocaleString()} &bull; Actor: {activeCase.timeline.find(e => e.status === 'investigating')?.actor}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">Awaiting field inspector assignment.</p>
                  )}
                </div>
              </div>

              {/* Step 3: In Progress */}
              <div className="relative pl-6" id="step-node-progress">
                <div className={`absolute left-0 top-1 h-6 w-6 -translate-x-1/2 rounded-full border flex items-center justify-center transition-all ${
                  isStepCompleted('in_progress') 
                    ? 'bg-teal-500 border-teal-500 text-slate-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`} id="step-dot-progress">
                  <Wrench size={11} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-none ${isStepCompleted('in_progress') ? 'text-white' : 'text-slate-500'}`} id="step-title-progress">
                    3. Remediation Commenced
                  </h4>
                  {activeCase.timeline.find(e => e.status === 'resolving' || e.status === 'resolved' && activeCase.status === 'Resolved') || activeCase.status === 'In Progress' ? (
                    <div className="mt-1 space-y-1" id="step-details-progress">
                      <p className="text-sm text-slate-300 font-medium">
                        Work order generated. Crew dispatched to execute structural and asset repairs on-site.
                      </p>
                      <p className="text-xs text-slate-500">Status: In Progress</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">Awaiting crew scheduling and parts acquisition.</p>
                  )}
                </div>
              </div>

              {/* Step 4: Resolved */}
              <div className="relative pl-6" id="step-node-resolved">
                <div className={`absolute left-0 top-1 h-6 w-6 -translate-x-1/2 rounded-full border flex items-center justify-center transition-all ${
                  isStepCompleted('resolved') 
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`} id="step-dot-resolved">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-none ${isStepCompleted('resolved') ? 'text-emerald-400' : 'text-slate-500'}`} id="step-title-resolved">
                    4. Resolved & Audited
                  </h4>
                  {activeCase.status === 'Resolved' && activeCase.timeline.find(e => e.status === 'resolved') ? (
                    <div className="mt-1 space-y-1" id="step-details-resolved">
                      <p className="text-sm text-emerald-300/90 font-semibold">
                        {activeCase.timeline.find(e => e.status === 'resolved')?.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Signed Off on {new Date(activeCase.resolvedAt || '').toLocaleDateString()} by {activeCase.timeline.find(e => e.status === 'resolved')?.actor}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">Remediation sign-off will automatically push to councilor scorecards.</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: AI-Driven Root Cause Analysis and Ward details (2/5 layout) */}
        <div className="lg:col-span-2 space-y-6" id="case-detail-right-column">
          
          {/* AI Root Cause Analysis Card */}
          <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-b from-teal-950/20 to-slate-900/60 p-6 space-y-5" id="ai-rca-card">
            {/* Ambient glow accent */}
            <div className="absolute right-0 top-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-teal-500/10 blur-xl" />

            <div className="flex items-start justify-between" id="rca-header">
              <div className="space-y-1" id="rca-header-left">
                <span className="bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-teal-500/20 flex items-center gap-1">
                  <Sparkles size={10} />
                  <span>Autonomic Audit</span>
                </span>
                <h3 className="text-base font-extrabold text-white" id="rca-title">AI Root Cause Analysis</h3>
              </div>
              <div className="text-right" id="rca-header-right">
                <span className="text-xs uppercase font-semibold text-slate-400 block">Confidence</span>
                <span className="text-lg font-black text-teal-400 leading-none">{activeCase.rootCauseAnalysis.aiConfidence}%</span>
              </div>
            </div>

            <div className="space-y-4 pt-2 text-sm" id="rca-body-sections">
              {/* Problem Identification */}
              <div className="space-y-1" id="rca-problem">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5" id="rca-problem-title">
                  <span className="h-1 w-1 bg-teal-400 rounded-full" />
                  <span>Identified Infrastructure Issue</span>
                </h4>
                <p className="text-slate-300 leading-relaxed font-semibold pl-2.5" id="rca-problem-desc">
                  {activeCase.rootCauseAnalysis.identifiedProblem}
                </p>
              </div>

              {/* Systemic Failure Analysis */}
              <div className="space-y-1" id="rca-systemic">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5" id="rca-systemic-title">
                  <span className="h-1 w-1 bg-amber-400 rounded-full" />
                  <span>Systemic Vulnerability</span>
                </h4>
                <p className="text-slate-300 leading-relaxed font-semibold pl-2.5" id="rca-systemic-desc">
                  {activeCase.rootCauseAnalysis.systemicIssue}
                </p>
              </div>

              {/* Action Taken */}
              <div className="space-y-1" id="rca-action">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5" id="rca-action-title">
                  <span className="h-1 w-1 bg-blue-400 rounded-full" />
                  <span>Mitigation Protocols</span>
                </h4>
                <p className="text-slate-300 leading-relaxed font-semibold pl-2.5" id="rca-action-desc">
                  {activeCase.rootCauseAnalysis.actionTaken}
                </p>
              </div>

              {/* Preventative Measures */}
              <div className="space-y-1" id="rca-prevention">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5" id="rca-prevention-title">
                  <span className="h-1 w-1 bg-emerald-400 rounded-full" />
                  <span>Future-Proofing Plan</span>
                </h4>
                <p className="text-slate-300 leading-relaxed font-semibold pl-2.5" id="rca-prevention-desc">
                  {activeCase.rootCauseAnalysis.preventativeMeasure}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex gap-3 items-center" id="rca-footer">
              <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400 shrink-0" id="rca-footer-icon">
                <FileText size={16} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed" id="rca-footer-text">
                RCA models are synthesized from municipal archive records, material catalogs, and topographical soil indicators.
              </p>
            </div>
          </div>

          {/* Ward Accountability Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4" id="ward-accountability-card">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider" id="ward-card-header">Accountability Assignment</h3>
            
            <div className="flex items-center gap-3 py-1" id="ward-card-officer">
              <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{activeCase.wardName}</p>
                <p className="text-[11px] text-slate-400 font-semibold">{activeCase.rootCauseAnalysis.identifiedProblem ? 'Directed by' : 'Managed by'} {activeCase.wardId === 'ward-4' ? 'Hon. Eleanor Vance' : activeCase.wardId === 'ward-7' ? 'Hon. Marcus Brody' : activeCase.wardId === 'ward-2' ? 'Hon. David Kuan' : 'Hon. Sarah Jenkins'}</p>
              </div>
            </div>

            {/* Score progress row */}
            <div className="space-y-1.5 pt-1" id="ward-card-score-box">
              <div className="flex justify-between items-center text-xs font-semibold" id="ward-card-score-texts">
                <span className="text-slate-400">Ward Performance Score</span>
                <span className={`font-extrabold ${activeCase.wardId === 'ward-4' ? 'text-emerald-400' : activeCase.wardId === 'ward-12' ? 'text-red-400' : 'text-amber-400'}`}>
                  {activeCase.wardId === 'ward-4' ? '92' : activeCase.wardId === 'ward-7' ? '78' : activeCase.wardId === 'ward-2' ? '71' : '49'}/100
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden" id="ward-card-score-bar-container">
                <div 
                  className={`h-full rounded-full ${activeCase.wardId === 'ward-4' ? 'bg-emerald-400' : activeCase.wardId === 'ward-12' ? 'bg-red-400' : 'bg-amber-400'}`} 
                  style={{ width: activeCase.wardId === 'ward-4' ? '92%' : activeCase.wardId === 'ward-7' ? '78%' : activeCase.wardId === 'ward-2' ? '71%' : '49%' }}
                  id="ward-card-score-bar"
                />
              </div>
            </div>

            {/* SLA Warning Block */}
            <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3.5 flex gap-3 items-start" id="ward-card-sla-box">
              <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-0.5" id="ward-card-sla-content">
                <p className="text-[11px] font-bold text-white" id="ward-card-sla-title">SLA Compliance Tracking</p>
                <p className="text-xs text-slate-500 leading-relaxed" id="ward-card-sla-desc">
                  Under local municipal code section 12, inaction on high-priority tickets will systematically degrade this Ward's score and councilor ranking.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Escalation Modal */}
      {isEscalationModalOpen && escalationData && (
        <div id="escalation-modal" className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl border border-red-500/30 bg-slate-950 shadow-2xl overflow-hidden p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4" id="escalation-modal-header">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-xs uppercase font-bold tracking-widest text-red-500 font-mono">CIVIC MOBILIZATION ENGAGEMENT</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">AI Public Accountability Campaign</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Drafted targeting Councilor <strong className="text-red-400">{(wards || initialWards)?.find(w => w.id === activeCase.wardId)?.councilor || 'Eleanor Vance'}</strong> to demand emergency resolution.
                </p>
              </div>
              <button
                onClick={() => setIsEscalationModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-900 font-extrabold text-lg leading-none cursor-pointer"
                id="btn-close-escalation-modal"
              >
                &times;
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800" id="escalation-tabs">
              <button
                onClick={() => setActiveEscalationTab('twitter')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                  activeEscalationTab === 'twitter'
                    ? 'text-red-400 border-red-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
                id="tab-twitter"
              >
                Twitter / X Post
              </button>
              <button
                onClick={() => setActiveEscalationTab('whatsapp')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                  activeEscalationTab === 'whatsapp'
                    ? 'text-amber-400 border-amber-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
                id="tab-whatsapp"
              >
                WhatsApp / Facebook
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeEscalationTab === 'twitter' ? (
                <div className="rounded-xl border border-red-500/20 bg-red-950/5 p-4 space-y-3" id="twitter-panel">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-red-400 uppercase">Viral Draft (under 280 chars)</span>
                    <span className="text-xs font-mono text-slate-500">{escalationData.shortPost.length} chars</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium select-all">
                    {escalationData.shortPost}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/5 p-4 space-y-3" id="whatsapp-panel">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">Detailed Citizen Action Broadcast</span>
                    <span className="text-xs font-mono text-slate-500">Facebook / WhatsApp Format</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap select-all">
                    {escalationData.longPost}
                  </p>
                </div>
              )}

              {/* Hashtags */}
              <div className="space-y-1.5" id="escalation-hashtags-box">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">Campaign Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {escalationData.hashtags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer / Copy Action */}
            <div className="flex items-center justify-between border-t border-slate-900 pt-4" id="escalation-modal-footer">
              <p className="text-xs text-slate-500 font-medium">
                Note: This content utilizes verified municipal dataset metrics to compile civic demand.
              </p>
              <button
                onClick={() => handleCopy(activeEscalationTab === 'twitter' 
                  ? `${escalationData.shortPost}\n\n${escalationData.hashtags.join(' ')}` 
                  : `${escalationData.longPost}\n\n${escalationData.hashtags.join(' ')}`
                )}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeEscalationTab === 'twitter'
                    ? 'bg-red-500 hover:bg-red-400 text-slate-950 shadow-lg shadow-red-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                }`}
                id="btn-copy-escalation-content"
              >
                {copiedText ? 'Copied to Clipboard!' : 'Copy & Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Error Box if any */}
      {escalationError && (
        <div id="escalation-error-toast" className="fixed bottom-4 right-4 z-[9999] rounded-xl border border-red-500/20 bg-red-950/90 text-red-200 p-4 text-xs font-bold shadow-2xl flex items-center gap-2 max-w-sm animate-bounce">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span>{escalationError}</span>
          <button 
            onClick={() => setEscalationError(null)} 
            className="ml-auto text-red-400 hover:text-white font-black cursor-pointer px-1"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
