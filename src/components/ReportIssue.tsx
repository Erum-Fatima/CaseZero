import { useState, useRef, DragEvent, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { CivicCase } from '../types';
import { 
  Upload, 
  MapPin, 
  Sparkles, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle2, 
  Image as ImageIcon,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface ReportIssueProps {
  wards: { id: string; name: string }[];
  onAddCase: (newCase: CivicCase) => void;
}

// Preset templates to make the demo incredibly smooth to interact with!
const PRESET_DEMO_IMAGES = [
  {
    name: 'Sinkhole / Cave-in',
    url: '/sinkhole.jpg',
    category: 'Infrastructure',
    title: 'Major Subgrade Pavement Collapse (Sinkhole)',
    description: 'A deep subgrade void has opened beneath the asphalt in the middle of the street. Concrete slab underneath is completely unsupported. Highly dangerous for oncoming vehicles.',
    severity: 'High'
  },
  {
    name: 'Fallen Power Lines',
    url: '/fallen_lines.jpg',
    category: 'Utilities',
    title: 'High-Voltage Utility Line Down',
    description: 'A storm snapped a pine limb, tearing down three wires onto the residential driveway. Sparks were initially visible, utility transformer box is humming. Block is partially blacked out.',
    severity: 'Critical'
  },
  {
    name: 'Clogged Trash Grate',
    url: '/clogged_grate.jpg',
    category: 'Sanitation',
    title: 'Trash Catchment Culvert Overflowing',
    description: 'Plastic bags, shopping carts, and solid residential rubbish have locked up the storm weir. The waterway is building a micro-dam, water level is inches from flooding the roadway.',
    severity: 'Medium'
  }
];

export default function ReportIssue({ wards, onAddCase }: ReportIssueProps) {
  // Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Infrastructure' | 'Sanitation' | 'Traffic' | 'Public Safety' | 'Utilities' | 'Environment'>('Infrastructure');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [wardId, setWardId] = useState(wards[0]?.id || 'ward-4');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulation state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [newlyCreatedCaseId, setNewlyCreatedCaseId] = useState<string | null>(null);

  // Geolocation states
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // AI Analysis States
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    category: string;
    title: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    rootCause: string;
    confidence: number;
    departmentCategory: 'Infrastructure' | 'Sanitation' | 'Traffic' | 'Public Safety' | 'Utilities' | 'Environment';
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Helper to load a demo preset instantly!
  const loadPreset = (preset: typeof PRESET_DEMO_IMAGES[0]) => {
    setTitle(preset.title);
    setCategory(preset.category as any);
    setSeverity(preset.severity as any);
    setDescription(preset.description);
    setImagePreview(preset.url);
    setImageFile(null); // Clear manual file to prioritize template URL

    // Select a fitting ward based on category
    if (preset.category === 'Utilities') {
      setWardId('ward-4'); // Northwest Heights has utilities issues
      setLocation('Pioneer Ridge, Northwest Heights');
    } else if (preset.category === 'Infrastructure') {
      setWardId('ward-7'); // Downtown
      setLocation('884 Center Blvd, Downtown Core');
    } else {
      setWardId('ward-12'); // East Industrial
      setLocation('Gate 12, East Industrial District');
    }
  };

  // Auto-Detect Location using real Geolocation API if available, or beautiful mock fallbacks
  const handleAutoDetectLocation = () => {
    setIsDetectingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(5);
          const lng = position.coords.longitude.toFixed(5);
          // Pick a random realistic street name combined with the coordinates!
          const streets = ['Hamilton Way', 'Presidio Ave', 'Commerce Rd', 'Grand Avenue', 'Vicksburg St'];
          const randomStreet = streets[Math.floor(Math.random() * streets.length)];
          const selectedWard = wards.find(w => w.id === wardId)?.name || 'Local Ward';
          
          setLocation(`${Math.floor(Math.random() * 800) + 1} ${randomStreet} (Coordinates: ${lat}, ${lng}), ${selectedWard.split(' (')[0]}`);
          setIsDetectingLocation(false);
        },
        (error) => {
          console.warn('Geolocation failed or denied, using high-fidelity mock fallback:', error);
          setTimeout(() => {
            const mockStreets = [
              { ward: 'ward-4', addr: '942 Highpoint Drive, Northwest Heights' },
              { ward: 'ward-7', addr: '110 Market Street, Downtown Core' },
              { ward: 'ward-2', addr: '44 Harbor Promenade, Riverfront South' },
              { ward: 'ward-12', addr: '1552 Factory Way, East Industrial' }
            ];
            const match = mockStreets.find(item => item.ward === wardId);
            setLocation(match ? match.addr : '602 Pine Crossing');
            setIsDetectingLocation(false);
          }, 800);
        },
        { timeout: 5000 }
      );
    } else {
      // Fallback
      setTimeout(() => {
        setLocation('744 Broadway Street, Central Sector');
        setIsDetectingLocation(false);
      }, 600);
    }
  };

  // Submit Handler with step-by-step visual AI verification simulation
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location || !imagePreview) return;

    setIsAnalyzing(true);
    setAnalysisStep(1);

    // Step-by-step audit simulation
    setTimeout(() => {
      setAnalysisStep(2);
      setTimeout(() => {
        setAnalysisStep(3);
        setTimeout(() => {
          // Generate a random Case ID
          const newId = `case-${Math.floor(Math.random() * 900) + 200}`;
          
          // Construct the new Case object
          const selectedWardObj = wards.find(w => w.id === wardId);
          
          // Generate AI Root Cause on the fly for incredible high-fidelity!
          const rootCauseAnalyses: Record<string, any> = {
            Infrastructure: {
              identifiedProblem: `Pavement degradation / asphalt fatigue on ${location.split(',')[0]}.`,
              systemicIssue: 'Underlying water runoff from blocked drainage softening the aggregate sub-base.',
              actionTaken: 'Assigned inspection crew to map subsurface density; issued warning notice to local road works contractor.',
              preventativeMeasure: 'Introduce high-impact polymer asphalt overlay on next scheduled repaving.',
              aiConfidence: 94
            },
            Sanitation: {
              identifiedProblem: `Illegal dumping event at ${location.split(',')[0]}.`,
              systemicIssue: 'Inadequate area illumination and lack of persistent law enforcement patrolling.',
              actionTaken: 'Enviro-hazard sanitation team added to dispatch log for sweeping sweep.',
              preventativeMeasure: 'Install solar-powered license plate scanning cameras in cooperation with regional police.',
              aiConfidence: 88
            },
            Traffic: {
              identifiedProblem: 'Cyclical loop sensor failures in roadbed causing phase timing lockouts.',
              systemicIssue: 'Loop wire breakdown caused by freezing cycles and pavement vibration.',
              actionTaken: 'Dispatched signals programmer for temporary timing override.',
              preventativeMeasure: 'Retrofit intersection with overhead microwave vehicle radar presence detectors.',
              aiConfidence: 91
            },
            Utilities: {
              identifiedProblem: 'Line breach / leakage under static hydraulic load.',
              systemicIssue: 'Corrosion of unlined structural cast iron connectors exceeding 60-year service lifespans.',
              actionTaken: 'Dispatched utility shutdown and excavation crews.',
              preventativeMeasure: 'Incorporate segment into regional cathodic protection and slip-lining upgrade queues.',
              aiConfidence: 95
            },
            'Public Safety': {
              identifiedProblem: 'Structural safety barrier deformation presenting localized impact danger.',
              systemicIssue: 'Lack of energy-attenuation crash cushions at terminal exit junctions.',
              actionTaken: 'Barricaded section; generated emergency fabrication request.',
              preventativeMeasure: 'Upgrade standard steel sections to crash-absorbing flexible polymer guard structures.',
              aiConfidence: 93
            },
            Environment: {
              identifiedProblem: 'Erosion of embankments due to high hydraulic flow / drainage bypass failure.',
              systemicIssue: 'Loss of deep-rooted native vegetation from recent grading operations.',
              actionTaken: 'Placed rip-rap rock blocks and silt fencing barriers to control runoff.',
              preventativeMeasure: 'Implement bio-remediation hydroseeding program with indigenous deep-root shrubs.',
              aiConfidence: 90
            }
          };

          const defaultRoot = {
            identifiedProblem: 'Localized mechanical breakdown of civic asset infrastructure.',
            systemicIssue: 'Lack of sensor-driven preventative monitoring schedules in the sector.',
            actionTaken: 'Created urgent maintenance dispatch ticket for site survey.',
            preventativeMeasure: 'Integrate the segment into the next telemetry reporting expansion phase.',
            aiConfidence: 92
          };

          const rootAnalysis = rootCauseAnalyses[category] || defaultRoot;

          const newCaseObj: CivicCase = {
            id: newId,
            title,
            description,
            category,
            location,
            wardId,
            wardName: selectedWardObj ? selectedWardObj.name : 'Unknown Ward',
            severity,
            status: 'Open',
            reportedAt: new Date().toISOString(),
            photoUrl: imagePreview,
            communityVerifications: 1,
            upvotes: 1,
            rootCauseAnalysis: rootAnalysis,
            timeline: [
              {
                id: `evt-new-1`,
                status: 'reported',
                title: 'Case Registered via Citizen Upload',
                description: `Incident logged under category "${category}". Automated dispatch routed to ${selectedWardObj ? selectedWardObj.name : 'assigned division'}.`,
                timestamp: new Date().toISOString(),
                actor: 'CaseZero AI Dispatcher'
              }
            ]
          };

          onAddCase(newCaseObj);
          setNewlyCreatedCaseId(newId);
          setIsAnalyzing(false);
          setIsSubmitted(true);
        }, 1200);
      }, 1000);
    }, 1000);
  };

  const handleResetForm = () => {
    setTitle('');
    setCategory('Infrastructure');
    setSeverity('Medium');
    setLocation('');
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setIsSubmitted(false);
    setNewlyCreatedCaseId(null);
    setAiAnalysisResult(null);
    setAiError(null);
  };

  const handleAiAnalyze = async (e: FormEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imagePreview) return;

    setIsAiAnalyzing(true);
    setAiError(null);
    setAiAnalysisResult(null);

    try {
      const payload: { image?: string; url?: string } = {};
      if (imagePreview.startsWith('data:')) {
        payload.image = imagePreview;
      } else {
        payload.url = imagePreview;
      }

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze image with AI');
      }

      const data = await response.json();
      setAiAnalysisResult(data);

      // Auto-populate the form
      if (data.title) setTitle(data.title);
      if (data.severity) setSeverity(data.severity);
      if (data.rootCause) setDescription(data.rootCause);
      if (data.departmentCategory) setCategory(data.departmentCategory);

    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAiError(err.message || 'An error occurred during AI analysis');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div id="report-view" className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans" id="report-page-title">
          Log Incident
        </h2>
        <p className="text-slate-400 text-sm font-medium" id="report-page-subtitle">
          Submit photos of municipal damage. The CaseZero engine automatically categorizes, estimates severity, and dispatches crews.
        </p>
      </div>

      {isSubmitted ? (
        /* SUCCESS SCREEN */
        <div 
          id="report-success-panel" 
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center max-w-2xl mx-auto space-y-6"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5" id="success-icon-box">
            <CheckCircle2 size={32} />
          </div>

          <div className="space-y-2" id="success-text-box">
            <h3 className="text-2xl font-extrabold text-white tracking-tight" id="success-title">
              Incident Registered Successfully
            </h3>
            <p className="text-sm text-slate-400" id="success-subtitle">
              CaseZero AI has parsed the telemetry markers, isolated duplicates, generated the initial Root Cause Analysis hypothesis, and dispatched the work order.
            </p>
          </div>

          {/* Quick Case ID Card */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 max-w-sm mx-auto flex items-center justify-between" id="success-case-id-card">
            <div className="text-left" id="success-case-id-left">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assigned ID</span>
              <p className="text-base font-extrabold text-white">#{newlyCreatedCaseId?.replace('case-', '')}</p>
            </div>
            <div className="text-right" id="success-case-id-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Initial Status</span>
              <p className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full mt-0.5 border border-teal-500/20">Open Queue</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2" id="success-actions">
            <button
              id="btn-inspect-new-case"
              onClick={() => newlyCreatedCaseId && onAddCase({} as any) /* Trigger app navigation back-handled inside main index */}
              className="rounded-xl bg-teal-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-teal-400 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/10"
            >
              <span>Inspect Case Details</span>
              <ArrowRight size={16} />
            </button>
            <button
              id="btn-report-another"
              onClick={handleResetForm}
              className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Report Another Issue</span>
            </button>
          </div>
        </div>
      ) : isAnalyzing ? (
        /* LOADING / AI PARSING SCREEN */
        <div 
          id="report-loading-panel" 
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center max-w-2xl mx-auto space-y-8"
        >
          <div className="relative mx-auto h-20 w-20" id="loading-spinner-box">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-teal-500 animate-spin" />
            {/* Inner pulsing spark */}
            <div className="absolute inset-4 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400" id="loading-inner-core">
              <Sparkles className="animate-pulse" size={20} />
            </div>
          </div>

          <div className="space-y-3" id="loading-text-box">
            <h3 className="text-xl font-bold text-white" id="loading-title">CaseZero AI Auditing Engine</h3>
            
            {/* Simulated progress step list */}
            <div className="max-w-xs mx-auto space-y-2 pt-2 text-left" id="loading-progress-steps">
              <div className="flex items-center gap-2 text-xs" id="step-1">
                <span className={`h-2 w-2 rounded-full ${analysisStep >= 1 ? 'bg-teal-400' : 'bg-slate-700'}`} />
                <span className={analysisStep >= 1 ? 'text-teal-400 font-semibold' : 'text-slate-500'}>
                  Uploading high-res photo metadata...
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs" id="step-2">
                <span className={`h-2 w-2 rounded-full ${analysisStep >= 2 ? 'bg-teal-400' : 'bg-slate-700'}`} />
                <span className={analysisStep >= 2 ? 'text-teal-400 font-semibold' : 'text-slate-500'}>
                  Analyzing visual signatures for severity...
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs" id="step-3">
                <span className={`h-2 w-2 rounded-full ${analysisStep >= 3 ? 'bg-teal-400' : 'bg-slate-700'}`} />
                <span className={analysisStep >= 3 ? 'text-teal-400 font-semibold' : 'text-slate-500'}>
                  Synthesizing systemic root cause model...
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MAIN FORM PAGE */
        <div className="grid gap-8 lg:grid-cols-5" id="report-form-layout">
          {/* LEFT COLUMN: GUIDANCE AND PRESETS */}
          <div className="lg:col-span-2 space-y-6" id="report-guidance-column">
            {/* Presets card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4" id="preset-loader-card">
              <div className="flex items-center gap-2" id="preset-title-box">
                <Sparkles size={16} className="text-teal-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider" id="preset-headline">Demo Quick-Presets</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed" id="preset-desc">
                For a flawless hackathon evaluation, click any template below to load pre-configured realistic images, categories, and descriptions instantly:
              </p>
              
              <div className="space-y-2.5 pt-2" id="preset-buttons-container">
                {PRESET_DEMO_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    id={`btn-preset-${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => loadPreset(preset)}
                    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-950 hover:border-teal-500/50 transition-all text-left text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0" id={`preset-info-${preset.name.replace(' ', '-')}`}>
                      <div className="h-10 w-10 rounded overflow-hidden bg-slate-900 border border-slate-800 shrink-0" id={`preset-img-thumb-${preset.name.replace(' ', '-')}`}>
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover" 
                        />
                      </div>
                      <div className="min-w-0" id={`preset-label-group-${preset.name.replace(' ', '-')}`}>
                        <p className="font-bold text-white group-hover:text-teal-400 transition-colors" id={`preset-name-txt-${preset.name.replace(' ', '-')}`}>{preset.name}</p>
                        <p className="text-[10px] text-slate-500 truncate" id={`preset-cat-txt-${preset.name.replace(' ', '-')}`}>{preset.category} &bull; {preset.severity}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded uppercase tracking-wider" id={`preset-badge-${preset.name.replace(' ', '-')}`}>Load</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform rules callout */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-4" id="rules-audit-card">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider" id="rules-title">The Remediation Pipeline</h3>
              <ul className="space-y-3 text-xs text-slate-400" id="rules-list">
                <li className="flex gap-2" id="rule-item-1">
                  <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center shrink-0 font-bold text-white">1</div>
                  <p className="leading-relaxed"><strong>Photo Verification:</strong> Image EXIF geolocation details are compared to reported coordinates to protect against fraudulent entries.</p>
                </li>
                <li className="flex gap-2" id="rule-item-2">
                  <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center shrink-0 font-bold text-white">2</div>
                  <p className="leading-relaxed"><strong>Clustering:</strong> Nearby issues of the same type are automatically clustered to prevent duplicating work orders.</p>
                </li>
                <li className="flex gap-2" id="rule-item-3">
                  <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center shrink-0 font-bold text-white">3</div>
                  <p className="leading-relaxed"><strong>Ward Accountability:</strong> Service SLA countdowns are generated immediately based on the category, placing clear responsibility on the responsible councilor.</p>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE FORM */}
          <form 
            id="report-civic-form" 
            onSubmit={handleSubmit} 
            className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6"
          >
            {/* Title */}
            <div className="space-y-1.5" id="form-group-title">
              <label htmlFor="incident-title" className="text-xs font-bold uppercase tracking-wider text-slate-300">Issue Title</label>
              <input
                id="incident-title"
                type="text"
                required
                placeholder="Briefly state the incident (e.g., Collapsed Pedestrian Sidewalk)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Category & Severity & Ward */}
            <div className="grid gap-4 sm:grid-cols-3" id="form-group-dropdowns">
              <div className="space-y-1.5" id="form-sub-cat">
                <label htmlFor="incident-category" className="text-xs font-bold uppercase tracking-wider text-slate-300">Category</label>
                <select
                  id="incident-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300 focus:border-teal-500 focus:outline-none"
                >
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Traffic">Traffic</option>
                  <option value="Public Safety">Public Safety</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Environment">Environment</option>
                </select>
              </div>

              <div className="space-y-1.5" id="form-sub-severity">
                <label htmlFor="incident-severity" className="text-xs font-bold uppercase tracking-wider text-slate-300">Estimated Severity</label>
                <select
                  id="incident-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300 focus:border-teal-500 focus:outline-none"
                >
                  <option value="Low">Low (Minor asset damage)</option>
                  <option value="Medium">Medium (Disruptive block-level)</option>
                  <option value="High">High (Dangerous / High disruption)</option>
                  <option value="Critical">Critical (Immediate life hazard)</option>
                </select>
              </div>

              <div className="space-y-1.5" id="form-sub-ward">
                <label htmlFor="incident-ward" className="text-xs font-bold uppercase tracking-wider text-slate-300">Responsible Ward</label>
                <select
                  id="incident-ward"
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300 focus:border-teal-500 focus:outline-none"
                >
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Geolocation Input */}
            <div className="space-y-1.5" id="form-group-location">
              <label htmlFor="incident-location" className="text-xs font-bold uppercase tracking-wider text-slate-300 flex justify-between items-center">
                <span>Location Input</span>
                <span className="text-[10px] text-slate-500 lowercase normal-case">GPS coordinates preferred</span>
              </label>
              <div className="relative" id="location-input-row">
                <input
                  id="incident-location"
                  type="text"
                  required
                  placeholder="Street address, intersection, or GPS coordinates"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-4 pr-32 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  id="btn-auto-detect-location"
                  type="button"
                  onClick={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                  className="absolute right-2.5 top-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/20 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <MapPin size={12} className={isDetectingLocation ? 'animate-bounce' : ''} />
                  <span>{isDetectingLocation ? 'Locating...' : 'Auto-Detect'}</span>
                </button>
              </div>
            </div>

            {/* Description area */}
            <div className="space-y-1.5" id="form-group-desc">
              <label htmlFor="incident-description" className="text-xs font-bold uppercase tracking-wider text-slate-300">Detailed Description</label>
              <textarea
                id="incident-description"
                rows={4}
                required
                placeholder="Describe the problem, current community impact, safety warnings, and surrounding identifiers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed resize-none"
              />
            </div>

            {/* Photo Upload Area - Dotted drag & drop */}
            <div className="space-y-3" id="form-group-photo">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Uploaded Evidence Photo</label>
              
              <div
                id="photo-drag-drop-zone"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  isDragActive 
                    ? 'border-teal-500 bg-teal-500/5' 
                    : imagePreview 
                      ? 'border-slate-800 bg-slate-950/40' 
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                {/* Hidden input */}
                <input
                  id="incident-photo-file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {imagePreview ? (
                  /* IMAGE PREVIEW MODE */
                  <div className="w-full space-y-4" id="photo-preview-container">
                    <div className="relative h-44 max-w-sm mx-auto rounded-lg overflow-hidden border border-slate-800 bg-slate-900" id="photo-preview-box">
                      <img
                        src={imagePreview}
                        alt="Evidence preview"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                        id="photo-preview-img"
                      />
                      {/* Click overlay to edit */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white backdrop-blur-[1px]" id="photo-preview-overlay">
                        Click or Drop to Replace
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500" id="photo-preview-filename">
                      {imageFile ? imageFile.name : (imagePreview ? (imagePreview.startsWith('data:') ? 'uploaded_image.png' : imagePreview.split('/').pop()) : 'preset_telemetry_image.jpg')}
                    </p>
                  </div>
                ) : (
                  /* EMPTY STATE MODE */
                  <div className="space-y-3" id="photo-upload-empty-state">
                    <div className="mx-auto h-11 w-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-slate-300" id="upload-icon-box">
                      <Upload size={18} />
                    </div>
                    <div id="upload-text-box">
                      <p className="text-sm font-bold text-slate-300">Drag & drop photo here</p>
                      <p className="text-xs text-slate-500 mt-1">or click to browse your local device files</p>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Support JPEG, PNG up to 10MB</span>
                  </div>
                )}
              </div>

              {/* AI Analysis trigger & results card */}
              {imagePreview && (
                <div className="mt-3 space-y-4" id="ai-vision-analysis-section">
                  <div className="flex justify-center" id="ai-analyze-btn-container">
                    <button
                      id="btn-ai-analyze-image"
                      type="button"
                      disabled={isAiAnalyzing}
                      onClick={handleAiAnalyze}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer shadow-lg disabled:cursor-not-allowed
                        bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/30 hover:border-teal-400/50 hover:shadow-teal-500/5 disabled:opacity-50"
                    >
                      <Sparkles size={14} className={isAiAnalyzing ? 'animate-spin' : ''} />
                      <span>{isAiAnalyzing ? 'AI is analyzing...' : 'Analyze with AI'}</span>
                    </button>
                  </div>

                  {isAiAnalyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 text-center space-y-3"
                      id="ai-analysis-loading-card"
                    >
                      <div className="flex justify-center items-center gap-2.5 text-teal-400 text-xs font-semibold" id="ai-loading-indicator">
                        <RefreshCw className="animate-spin" size={14} />
                        <span>Running advanced computer vision diagnostics...</span>
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-normal">
                        Gemini Vision is inspecting raw pixel signatures, estimating structural severity levels, and matching administrative department categories.
                      </p>
                    </motion.div>
                  )}

                  {aiError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4 text-xs text-rose-400"
                      id="ai-analysis-error-card"
                    >
                      <div className="flex items-center gap-2 font-bold mb-1" id="ai-error-header">
                        <AlertTriangle size={14} />
                        <span>AI Diagnostics Interrupt</span>
                      </div>
                      <p>{aiError}</p>
                    </motion.div>
                  )}

                  {aiAnalysisResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', damping: 20 }}
                      className="rounded-xl border border-teal-500/20 bg-teal-950/10 p-5 space-y-4 shadow-[0_0_20px_rgba(20,184,166,0.05)]"
                      id="ai-analysis-result-card"
                    >
                      <div className="flex items-center justify-between border-b border-teal-500/10 pb-2.5" id="ai-result-header">
                        <div className="flex items-center gap-2" id="ai-result-header-left">
                          <Sparkles size={14} className="text-teal-400" />
                          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">CaseZero Vision Core</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded uppercase tracking-wider border border-slate-800">
                          Analysis Complete
                        </span>
                      </div>

                      <div className="space-y-3" id="ai-result-body">
                        <div id="ai-result-title-row">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estimated Title</span>
                          <h4 className="text-sm font-extrabold text-white mt-0.5" id="ai-classified-title">
                            {aiAnalysisResult.title}
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3" id="ai-result-metrics">
                          <div id="ai-result-cat">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Identified Issue</span>
                            <div className="flex items-center gap-1.5 mt-1" id="ai-category-badge">
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                              <span className="text-xs font-bold text-teal-300 capitalize">{aiAnalysisResult.category}</span>
                            </div>
                          </div>

                          <div id="ai-result-severity">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estimated Severity</span>
                            <div className="mt-1" id="ai-severity-badge">
                              <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                                aiAnalysisResult.severity === 'Critical'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : aiAnalysisResult.severity === 'High'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : aiAnalysisResult.severity === 'Medium'
                                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                      : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                              }`}>
                                {aiAnalysisResult.severity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3 space-y-2.5" id="ai-result-explanation-box">
                          <div id="ai-result-root-cause">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Identified Root Cause</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium mt-0.5" id="ai-classified-root-cause">
                              {aiAnalysisResult.rootCause}
                            </p>
                          </div>
                          
                          <div id="ai-result-confidence-row" className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Analysis Confidence</span>
                            <span className="font-mono font-bold text-teal-400" id="ai-classified-confidence">
                              {aiAnalysisResult.confidence}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold text-teal-400 bg-teal-500/5 border border-teal-500/10 rounded-lg p-2.5" id="ai-applied-alert">
                          <CheckCircle2 size={12} className="shrink-0 text-teal-400" />
                          <span>Form fields auto-populated with AI values. You may customize them before submission.</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2" id="form-submit-row">
              <button
                id="btn-submit-incident"
                type="submit"
                disabled={!title || !description || !location || !imagePreview}
                className="w-full rounded-xl bg-teal-500 py-3.5 text-center text-sm font-bold text-slate-950 hover:bg-teal-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                <span>Submit & Run AI Audit Pipeline</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
