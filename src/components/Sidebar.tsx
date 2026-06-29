import { LayoutDashboard, AlertTriangle, ShieldCheck, FileText, Menu, X, Sparkles, Map, HelpCircle } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  selectedCaseId: string | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({
  currentPage,
  onPageChange,
  selectedCaseId,
  mobileMenuOpen,
  setMobileMenuOpen,
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', name: 'Issue Map', icon: Map },
    { id: 'report', name: 'Report Issue', icon: AlertTriangle },
    { id: 'wards', name: 'Ward Accountability', icon: ShieldCheck },
    { id: 'how-it-works', name: 'How It Works', icon: HelpCircle },
  ];

  const handleNavClick = (id: string) => {
    onPageChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header id="mobile-header" className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white md:hidden shadow-md">
        <div className="flex items-center gap-2" id="mobile-brand">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-black tracking-tighter" id="logo-icon-mob">
            CZ
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none" id="brand-name-mob">CaseZero</h1>
            <p className="text-[10px] text-teal-400 font-medium" id="brand-tagline-mob">From report to resolution</p>
          </div>
        </div>
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Backdrop for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed bottom-0 top-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:h-screen`}
      >
        {/* Sidebar Header / Branding */}
        <div className="hidden items-center gap-3 px-6 py-7 border-b border-slate-800 md:flex" id="sidebar-header">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500 font-black text-slate-950 text-xl tracking-tighter shadow-lg shadow-teal-500/10" id="logo-icon-desktop">
            CZ
          </div>
          <div>
            <div className="flex items-center gap-1.5" id="brand-container">
              <h1 className="text-xl font-extrabold tracking-tight text-white" id="brand-name-desktop">CaseZero</h1>
              <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" id="live-indicator"></span>
            </div>
            <p className="text-[11px] text-teal-400 font-semibold tracking-wide uppercase mt-0.5" id="brand-tagline-desktop">
              Resolution Engine
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6" id="sidebar-nav-container">
          <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500" id="nav-section-title">
            Main Platform
          </p>
          <nav className="space-y-1.5" id="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-l-2 border-teal-500'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon size={19} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Contextual Case Detail Shortcut */}
          {selectedCaseId && (
            <div className="mt-8 pt-6 border-t border-slate-800" id="case-detail-shortcut">
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500" id="active-case-label">
                Selected Case
              </p>
              <button
                id="nav-link-case-detail"
                onClick={() => handleNavClick('detail')}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  currentPage === 'detail'
                    ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-l-2 border-teal-500'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <FileText size={19} className={currentPage === 'detail' ? 'text-teal-400' : 'text-slate-400'} />
                <span className="truncate text-left">Case #{selectedCaseId.replace('case-', '')} Details</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30" id="sidebar-footer">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-3" id="ai-status-card">
            <Sparkles size={16} className="text-teal-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white" id="ai-status-title">AI Engine Active</p>
              <p className="text-[10px] text-slate-400" id="ai-status-desc">All systems operational</p>
            </div>
          </div>
          <div className="mt-4 px-3 flex items-center justify-between text-[11px] text-slate-500 font-medium" id="app-version-box">
            <span>Demo Version</span>
            <span>v1.2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
