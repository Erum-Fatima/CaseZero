import { useState, useMemo, useEffect, useRef } from 'react';
import { initialCases, initialWards, initialActivities } from './mockData';
import { CivicCase, Ward, ActivityFeedItem, TimelineEvent } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ReportIssue from './components/ReportIssue';
import CaseDetail from './components/CaseDetail';
import WardAccountability from './components/WardAccountability';
import IssueMap from './components/IssueMap';
import HowItWorks from './components/HowItWorks';
import { Sparkles, Activity, Plus, ShieldCheck } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

// Helper to filter out undefined values so they don't break Firestore writes
const cleanData = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanData);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        newObj[key] = cleanData(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>('case-101'); // Default select first case
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('casezero_welcome_seen');
    } catch {
      return true;
    }
  });

  const handleCloseWelcomeModal = () => {
    try {
      sessionStorage.setItem('casezero_welcome_seen', 'true');
    } catch (e) {
      console.error(e);
    }
    setShowWelcomeModal(false);
  };

  // Load and seed data from Firestore on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch/Seed cases
        const casesSnapshot = await getDocs(collection(db, 'cases'));
        let casesData: CivicCase[] = [];
        if (casesSnapshot.empty) {
          for (const item of initialCases) {
            await setDoc(doc(db, 'cases', item.id), cleanData(item));
          }
          casesData = [...initialCases];
        } else {
          casesSnapshot.forEach((doc) => {
            casesData.push(doc.data() as CivicCase);
          });
        }

        // Fetch/Seed wards
        const wardsSnapshot = await getDocs(collection(db, 'wards'));
        let wardsData: Ward[] = [];
        if (wardsSnapshot.empty) {
          for (const item of initialWards) {
            await setDoc(doc(db, 'wards', item.id), cleanData(item));
          }
          wardsData = [...initialWards];
        } else {
          wardsSnapshot.forEach((doc) => {
            wardsData.push(doc.data() as Ward);
          });
        }

        // Fetch/Seed activities
        const activitiesSnapshot = await getDocs(collection(db, 'activities'));
        let activitiesData: ActivityFeedItem[] = [];
        if (activitiesSnapshot.empty) {
          for (const item of initialActivities) {
            await setDoc(doc(db, 'activities', item.id), cleanData(item));
          }
          activitiesData = [...initialActivities];
        } else {
          activitiesSnapshot.forEach((doc) => {
            activitiesData.push(doc.data() as ActivityFeedItem);
          });
        }

        // Sort dynamically for clean initial UX order
        casesData.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
        activitiesData.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        setCases(casesData);
        setWards(wardsData);
        setActivities(activitiesData);
      } catch (error) {
        console.error("Error loading or seeding Firestore database:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Active selected case object finder
  const activeCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  // Handler to select a case and switch views
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentPage('detail');
  };

  // Handler to upvote an incident ticket
  const handleUpvoteCase = async (caseId: string) => {
    let updatedCase: CivicCase | null = null;
    setCases((prevCases) =>
      prevCases.map((c) => {
        if (c.id === caseId) {
          updatedCase = { ...c, upvotes: c.upvotes + 1 };
          return updatedCase;
        }
        return c;
      })
    );

    if (updatedCase) {
      try {
        await setDoc(doc(db, 'cases', caseId), cleanData(updatedCase));
      } catch (err) {
        console.error("Error saving upvote to Firestore:", err);
      }
    }
  };

  // Handler to verify an incident ticket from the community dashboard
  const handleVerifyCase = async (caseId: string) => {
    let updatedCase: CivicCase | null = null;
    setCases((prevCases) =>
      prevCases.map((c) => {
        if (c.id === caseId) {
          updatedCase = { ...c, communityVerifications: c.communityVerifications + 1 };
          return updatedCase;
        }
        return c;
      })
    );

    // Append a verification activity log dynamically
    const targetCase = cases.find((c) => c.id === caseId);
    if (targetCase) {
      const newAct: ActivityFeedItem = {
        id: `act-ver-${Math.floor(Math.random() * 900) + 100}`,
        caseId: caseId,
        caseTitle: targetCase.title,
        type: 'verified',
        message: `Citizen verified incident: "${targetCase.title}"`,
        timestamp: new Date().toISOString(),
        user: 'Community Member',
      };
      setActivities((prev) => [newAct, ...prev]);

      try {
        if (updatedCase) {
          await setDoc(doc(db, 'cases', caseId), cleanData(updatedCase));
        }
        await setDoc(doc(db, 'activities', newAct.id), cleanData(newAct));
      } catch (err) {
        console.error("Error saving verification to Firestore:", err);
      }
    }
  };

  // Handler to simulate progress on an active case (e.g., advancing repairs)
  const handleSimulateProgress = async (
    caseId: string,
    nextStatus: CivicCase['status'],
    nextEvent: TimelineEvent
  ) => {
    // 1. Update case status & append timeline step
    let updatedCase: CivicCase | null = null;
    setCases((prevCases) =>
      prevCases.map((c) => {
        if (c.id === caseId) {
          const isResolved = nextStatus === 'Resolved';
          const isReopening = nextStatus === 'Investigating' && c.status === 'Resolved';
          updatedCase = {
            ...c,
            status: nextStatus,
            resolvedAt: isResolved ? new Date().toISOString() : (isReopening ? undefined : c.resolvedAt),
            timeline: [...c.timeline, nextEvent],
          };
          return updatedCase;
        }
        return c;
      })
    );

    // 2. Add an activity feed log to the live stream
    const targetCase = cases.find((c) => c.id === caseId);
    if (targetCase) {
      const isReopening = nextStatus === 'Investigating' && targetCase.status === 'Resolved';
      const newAct: ActivityFeedItem = {
        id: `act-sim-ev-${Math.floor(Math.random() * 900) + 100}`,
        caseId: caseId,
        caseTitle: targetCase.title,
        type: nextStatus === 'Resolved' ? 'resolved' : 'status_change',
        message: isReopening 
          ? `${nextEvent.actor} reopened and challenged "${targetCase.title}"`
          : `${nextEvent.actor} advanced status to [${nextStatus}] on "${targetCase.title}"`,
        timestamp: new Date().toISOString(),
        user: nextEvent.actor || 'Operations Dept',
      };
      setActivities((prev) => [newAct, ...prev]);

      // 3. Dynamically adjust Ward resolution counts & scores if resolved or reopened
      if (nextStatus === 'Resolved') {
        setWards((prevWards) =>
          prevWards.map((w) => {
            if (w.id === targetCase.wardId) {
              const newResolved = w.resolvedCases + 1;
              const newActive = Math.max(w.activeCases - 1, 0);
              const newRate = Number(((newResolved / w.totalCases) * 100).toFixed(1));
              const newScore = Math.min(w.accountabilityScore + 4, 100);
              return {
                ...w,
                resolvedCases: newResolved,
                activeCases: newActive,
                resolutionRate: newRate,
                accountabilityScore: newScore,
              };
            }
            return w;
          })
        );
      } else if (isReopening) {
        setWards((prevWards) =>
          prevWards.map((w) => {
            if (w.id === targetCase.wardId) {
              const newResolved = Math.max(w.resolvedCases - 1, 0);
              const newActive = w.activeCases + 1;
              const newRate = Number(((newResolved / w.totalCases) * 100).toFixed(1));
              const newScore = Math.max(w.accountabilityScore - 4, 0);
              return {
                ...w,
                resolvedCases: newResolved,
                activeCases: newActive,
                resolutionRate: newRate,
                accountabilityScore: newScore,
              };
            }
            return w;
          })
        );
      }

      // Write updates to Firestore asynchronously
      try {
        if (updatedCase) {
          await setDoc(doc(db, 'cases', caseId), cleanData(updatedCase));
        }
        await setDoc(doc(db, 'activities', newAct.id), cleanData(newAct));

        // Re-fetch/calculate ward state for robust writing
        const w = wards.find((x) => x.id === targetCase.wardId);
        if (w) {
          let updatedW: Ward;
          if (nextStatus === 'Resolved') {
            const newResolved = w.resolvedCases + 1;
            const newActive = Math.max(w.activeCases - 1, 0);
            const newRate = Number(((newResolved / w.totalCases) * 100).toFixed(1));
            const newScore = Math.min(w.accountabilityScore + 4, 100);
            updatedW = {
              ...w,
              resolvedCases: newResolved,
              activeCases: newActive,
              resolutionRate: newRate,
              accountabilityScore: newScore,
            };
          } else { // isReopening
            const newResolved = Math.max(w.resolvedCases - 1, 0);
            const newActive = w.activeCases + 1;
            const newRate = Number(((newResolved / w.totalCases) * 100).toFixed(1));
            const newScore = Math.max(w.accountabilityScore - 4, 0);
            updatedW = {
              ...w,
              resolvedCases: newResolved,
              activeCases: newActive,
              resolutionRate: newRate,
              accountabilityScore: newScore,
            };
          }
          await setDoc(doc(db, 'wards', updatedW.id), cleanData(updatedW));
        }
      } catch (err) {
        console.error("Error saving simulate progress action to Firestore:", err);
      }
    }
  };

  // Keep refs up-to-date to prevent stale closures in interval
  const casesRef = useRef<CivicCase[]>(cases);
  const handleSimulateProgressRef = useRef(handleSimulateProgress);

  useEffect(() => {
    casesRef.current = cases;
  }, [cases]);

  useEffect(() => {
    handleSimulateProgressRef.current = handleSimulateProgress;
  }, [handleSimulateProgress]);

  // SLA Escalation Engine running every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentCases = casesRef.current;

      currentCases.forEach((c) => {
        if (c.status === 'Open') {
          const reportedTime = new Date(c.reportedAt);
          const diffMs = now.getTime() - reportedTime.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours > 24) {
            const nextEvent: TimelineEvent = {
              id: `evt-sla-${Math.floor(Math.random() * 9000) + 1000}`,
              status: 'investigating',
              title: "Auto-Escalated by SLA Engine",
              description: "System automatically escalated issue for investigation due to exceeding the 24h response SLA.",
              timestamp: new Date().toISOString(),
              actor: "CaseZero Auto-Dispatch"
            };
            handleSimulateProgressRef.current(c.id, 'Investigating', nextEvent);
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Handler to log a brand new issue from the Report Issue Form
  const handleAddCase = async (newCase: CivicCase) => {
    // 1. Append new case to active database
    setCases((prev) => [newCase, ...prev]);
    setSelectedCaseId(newCase.id);

    // 2. Append new report activity log to live stream
    const newAct: ActivityFeedItem = {
      id: `act-new-${Math.floor(Math.random() * 900) + 100}`,
      caseId: newCase.id,
      caseTitle: newCase.title,
      type: 'reported',
      message: `New issue registered: "${newCase.title}" in ${newCase.wardName.split(' (')[0]}`,
      timestamp: new Date().toISOString(),
      user: 'CaseZero AI Auto-Triage',
    };
    setActivities((prev) => [newAct, ...prev]);

    // 3. Dynamically update local Ward metrics
    setWards((prevWards) =>
      prevWards.map((w) => {
        if (w.id === newCase.wardId) {
          const newTotal = w.totalCases + 1;
          const newActive = w.activeCases + 1;
          const newRate = Number(((w.resolvedCases / newTotal) * 100).toFixed(1));
          const newScore = Math.max(w.accountabilityScore - 2, 0); // Temporary backlog penalty
          return {
            ...w,
            totalCases: newTotal,
            activeCases: newActive,
            resolutionRate: newRate,
            accountabilityScore: newScore,
          };
        }
        return w;
      })
    );

    // 4. Force selection and redirect to Detail Page
    setCurrentPage('detail');

    // Firestore updates
    try {
      await setDoc(doc(db, 'cases', newCase.id), cleanData(newCase));
      await setDoc(doc(db, 'activities', newAct.id), cleanData(newAct));

      const w = wards.find((x) => x.id === newCase.wardId);
      if (w) {
        const newTotal = w.totalCases + 1;
        const newActive = w.activeCases + 1;
        const newRate = Number(((w.resolvedCases / newTotal) * 100).toFixed(1));
        const newScore = Math.max(w.accountabilityScore - 2, 0);
        const directUpdatedW = {
          ...w,
          totalCases: newTotal,
          activeCases: newActive,
          resolutionRate: newRate,
          accountabilityScore: newScore,
        };
        await setDoc(doc(db, 'wards', directUpdatedW.id), cleanData(directUpdatedW));
      }
    } catch (err) {
      console.error("Error saving new case to Firestore:", err);
    }
  };

  // Render current view depending on selected page
  const renderViewContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            cases={cases}
            activities={activities}
            onSelectCase={handleSelectCase}
            onUpvoteCase={handleUpvoteCase}
          />
        );
      case 'report':
        return <ReportIssue wards={wards} onAddCase={handleAddCase} />;
      case 'map':
        return <IssueMap cases={cases} onSelectCase={handleSelectCase} />;
      case 'detail':
        return (
          <CaseDetail
            activeCase={activeCase}
            onUpvoteCase={handleUpvoteCase}
            onVerifyCase={handleVerifyCase}
            onSimulateProgress={handleSimulateProgress}
            onBackToDashboard={() => setCurrentPage('dashboard')}
            wards={wards}
          />
        );
      case 'wards':
        return (
          <WardAccountability
            wards={wards}
            cases={cases}
            onSelectCase={handleSelectCase}
            onPageChange={setCurrentPage}
          />
        );
      case 'how-it-works':
        return <HowItWorks />;
      default:
        return (
          <Dashboard
            cases={cases}
            activities={activities}
            onSelectCase={handleSelectCase}
            onUpvoteCase={handleUpvoteCase}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white" id="app-loading-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="font-mono text-xs tracking-wider text-slate-400">CONNECTING TO SECURE CIVIC AUDIT DATABASE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 md:flex-row" id="casezero-app-root">
      
      {/* Platform Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        selectedCaseId={selectedCaseId}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main viewport segment */}
      <main className="flex-1 overflow-y-auto px-4 py-8 md:p-8 lg:p-10" id="casezero-main-viewport">
        
        {/* Upper Platform Info Rail */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4 text-xs font-semibold" id="app-viewport-header-rail">
          <div className="flex items-center gap-2 text-slate-400" id="audit-ticker-rail">
            <Activity size={14} className="text-teal-400 animate-pulse" />
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Audit Node Live:</span>
            <span className="text-teal-400 font-mono text-[11px]">ZERO-BIAS CIVIC DISPATCH</span>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400" id="quick-action-rail">
            <button
              id="btn-rail-report"
              onClick={() => setCurrentPage('report')}
              className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-[11px] font-extrabold text-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer"
            >
              <Plus size={12} />
              <span>Log Civic Issue</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-400 font-medium" id="system-time-rail">
              <span className="text-[10px] text-slate-500 uppercase font-bold">System Local Time:</span>
              <span className="text-[11px] font-mono text-slate-300">2026-06-25 11:14 UTC</span>
            </div>
          </div>
        </div>

        {/* Dynamic content rendering with keyframe transition triggers */}
        <div key={currentPage} className="max-w-7xl mx-auto" id="dynamic-content-box">
          {renderViewContent()}
        </div>
      </main>

      {/* One-time welcome modal */}
      {showWelcomeModal && (
        <div 
          id="welcome-modal-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in"
        >
          <div 
            id="welcome-modal-card" 
            className="relative w-full max-w-md rounded-2xl border border-teal-500/30 bg-slate-900 p-8 text-center shadow-2xl shadow-teal-500/15"
          >
            {/* Logo and Icon */}
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/25 shadow-inner shadow-teal-500/5 animate-pulse" id="welcome-modal-icon">
              <ShieldCheck className="h-7 w-7 text-teal-400" />
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight" id="welcome-modal-title">
              CaseZero
            </h2>
            
            <p className="mt-2 text-sm font-bold text-teal-400" id="welcome-modal-tagline">
              From report to resolution. Automatically.
            </p>

            {/* Explanation lines */}
            <div className="my-6 space-y-4 border-y border-slate-800/80 py-5 text-left text-xs text-slate-300" id="welcome-modal-features">
              <div className="flex items-start gap-3" id="feat-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-[10px] font-bold text-teal-400 border border-teal-500/25">1</span>
                <div>
                  <p className="font-extrabold text-slate-200">AI-powered civic issue tracking</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">Automated document analysis, severity classification, and status reporting.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3" id="feat-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-[10px] font-bold text-teal-400 border border-teal-500/25">2</span>
                <div>
                  <p className="font-extrabold text-slate-200">Every report becomes a tracked case</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">Continuous verification loop and dynamic SLA response timers.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3" id="feat-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-[10px] font-bold text-teal-400 border border-teal-500/25">3</span>
                <div>
                  <p className="font-extrabold text-slate-200">Ward councilors held publicly accountable</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">Transparent SLA scorecards and community-driven collective petitions.</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-center gap-3" id="welcome-modal-actions">
              <button
                id="btn-welcome-explore"
                onClick={handleCloseWelcomeModal}
                className="w-full rounded-xl bg-teal-500 py-3 text-sm font-black text-slate-950 hover:bg-teal-400 transition-all cursor-pointer shadow-lg shadow-teal-500/20 active:scale-[0.98]"
              >
                Start Exploring
              </button>
              
              <button
                id="btn-welcome-skip"
                onClick={handleCloseWelcomeModal}
                className="text-xs font-semibold text-slate-500 hover:text-slate-400 transition-all cursor-pointer"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
