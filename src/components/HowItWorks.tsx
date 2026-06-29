import { Camera, Activity, ShieldCheck } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div id="how-it-works-view" className="space-y-8 animate-fade-in max-w-6xl mx-auto py-4">
      {/* Header Section */}
      <div className="space-y-2 text-center md:text-left" id="how-it-works-header">
        <h2 className="text-3xl font-black text-white tracking-tight" id="how-it-works-title">
          How CaseZero Works
        </h2>
        <p className="text-sm text-slate-400 font-medium" id="how-it-works-subtitle">
          Three steps from civic problem to resolution.
        </p>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="how-it-works-grid">
        {/* Section 1 - Report */}
        <div 
          id="how-it-works-card-report" 
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-inner shadow-teal-500/5" 
              id="report-icon-wrapper"
            >
              <Camera size={24} />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase">Step 01</span>
              <h3 className="text-lg font-bold text-white tracking-tight" id="report-title">
                Report Any Civic Issue
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium" id="report-desc">
                Upload a photo of any civic problem — pothole, broken streetlight, illegal dumping. Gemini Vision automatically identifies the issue, estimates severity, and categorizes it instantly.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider" id="report-footer">
            Gemini Vision Analytics
          </div>
        </div>

        {/* Section 2 - Track */}
        <div 
          id="how-it-works-card-track" 
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-inner shadow-teal-500/5" 
              id="track-icon-wrapper"
            >
              <Activity size={24} />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase">Step 02</span>
              <h3 className="text-lg font-bold text-white tracking-tight" id="track-title">
                AI Tracks Every Case
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium" id="track-desc">
                Every report becomes a managed case with root cause analysis, SLA timers, community verification, and automatic escalation if authorities are unresponsive.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider" id="track-footer">
            Active SLA Monitoring
          </div>
        </div>

        {/* Section 3 - Resolve */}
        <div 
          id="how-it-works-card-resolve" 
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-inner shadow-teal-500/5" 
              id="resolve-icon-wrapper"
            >
              <ShieldCheck size={24} />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase">Step 03</span>
              <h3 className="text-lg font-bold text-white tracking-tight" id="resolve-title">
                Hold Councilors Accountable
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium" id="resolve-desc">
                Ward performance scores update in real time. Unresolved cases trigger collective petitions and public escalation posts. Fake resolutions are flagged by AI.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider" id="resolve-footer">
            Councilor Accountability Index
          </div>
        </div>
      </div>

      {/* Decorative summary footer card to blend into dark slate style */}
      <div id="how-it-works-foot-card" className="rounded-2xl border border-teal-500/10 bg-slate-950/40 p-6 text-center space-y-2">
        <h4 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider">Democratizing Local Governance</h4>
        <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
          CaseZero closes the loop between citizens and local government by standardizing civic complaints into trackable, SLA-backed case files. Powered by transparent data and intelligent automation.
        </p>
      </div>
    </div>
  );
}
