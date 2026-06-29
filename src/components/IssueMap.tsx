import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CivicCase } from '../types';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

interface IssueMapProps {
  cases: CivicCase[];
  onSelectCase: (caseId: string) => void;
}

// Deterministic hashing helper to distribute pins around New Delhi, India
function getCaseCoordinates(caseId: string): [number, number] {
  const coordsLookup: Record<string, [number, number]> = {
    'case-101': [28.6252, 77.2153], // Utilities
    'case-102': [28.6095, 77.1852], // Sanitation
    'case-103': [28.6304, 77.1951], // Public Safety
    'case-104': [28.6051, 77.2255], // Traffic
    'case-105': [28.5955, 77.2102], // Sanitation
    'case-106': [28.6182, 77.2401], // Infrastructure
  };

  if (coordsLookup[caseId]) {
    return coordsLookup[caseId];
  }

  // Simple string hashing for new dynamic/user-created cases
  let hash = 0;
  for (let i = 0; i < caseId.length; i++) {
    hash = caseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Scatter within a reasonable city radius around Connaught Place (approx 28.6139, 77.2090)
  const latOffset = ((Math.abs(hash) % 80) - 40) / 1000; // -0.04 to +0.04
  const lngOffset = ((Math.abs(hash >> 8) % 80) - 40) / 1000; // -0.04 to +0.04
  return [28.6139 + latOffset, 77.2090 + lngOffset];
}

export default function IssueMap({ cases, onSelectCase }: IssueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Custom icon creator utilizing pure HTML & Tailwind styling
  const createCustomIcon = (severity: string) => {
    let colorClass = '';
    let pingClass = '';

    switch (severity) {
      case 'Critical':
        colorClass = 'bg-red-500 border-white';
        pingClass = 'bg-red-400';
        break;
      case 'High':
        colorClass = 'bg-orange-500 border-white';
        pingClass = 'bg-orange-400';
        break;
      case 'Medium':
        colorClass = 'bg-sky-500 border-white';
        pingClass = 'bg-sky-400';
        break;
      case 'Low':
      default:
        colorClass = 'bg-slate-400 border-white';
        pingClass = 'bg-slate-300';
        break;
    }

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <span class="absolute inline-flex h-full w-full rounded-full ${pingClass} opacity-75 animate-ping"></span>
          <div class="relative w-4 h-4 rounded-full border-2 shadow-lg ${colorClass}"></div>
        </div>
      `,
      className: 'custom-leaflet-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -10],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Position custom Zoom control later if needed
      }).setView([28.6139, 77.2090], 12);

      // Add zoom control to top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add OSM tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers before drawing new ones
    // Keep standard tile layers while removing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Populate markers for all active cases
    cases.forEach((c) => {
      const [lat, lng] = getCaseCoordinates(c.id);
      const icon = createCustomIcon(c.severity);
      
      const marker = L.marker([lat, lng], { icon }).addTo(map);

      // Design clean interactive popup container
      const container = document.createElement('div');
      container.className = 'text-slate-100 p-2 space-y-2.5 max-w-[240px]';
      
      // Determine severity color pill
      let severityBadge = '';
      if (c.severity === 'Critical') severityBadge = 'bg-red-500/25 text-red-400 border border-red-500/30';
      else if (c.severity === 'High') severityBadge = 'bg-orange-500/25 text-orange-400 border border-orange-500/30';
      else if (c.severity === 'Medium') severityBadge = 'bg-sky-500/25 text-sky-400 border border-sky-500/30';
      else severityBadge = 'bg-slate-800 text-slate-400 border border-slate-700';

      // Status pill
      let statusBadge = '';
      if (c.status === 'Resolved') statusBadge = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      else if (c.status === 'In Progress') statusBadge = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      else if (c.status === 'Investigating') statusBadge = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      else statusBadge = 'bg-slate-900 text-slate-400 border border-slate-800';

      container.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
            <span>${c.category}</span>
            <span>#${c.id.replace('case-', '')}</span>
          </div>
          <h4 class="font-black text-sm text-white tracking-tight leading-snug">${c.title}</h4>
        </div>

        <div class="flex flex-wrap gap-1.5 pt-0.5">
          <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${severityBadge}">${c.severity}</span>
          <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${statusBadge}">${c.status}</span>
        </div>

        <p class="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2">${c.description}</p>
        
        <button id="map-btn-${c.id}" class="mt-2 w-full rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-extrabold text-[10px] py-2 text-center transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-teal-500/10">
          <span>Inspect Issue Audit</span>
        </button>
      `;

      // Wire up React click event cleanly
      const button = container.querySelector(`#map-btn-${c.id}`);
      if (button) {
        button.addEventListener('click', () => {
          onSelectCase(c.id);
        });
      }

      marker.bindPopup(container, {
        closeButton: false,
        className: 'case-custom-popup-wrapper',
        minWidth: 220,
      });
    });

  }, [cases]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div id="issue-map-page" className="flex flex-col gap-6 p-4 md:p-8 animate-fade-in text-white w-full">
      {/* Dynamic inline stylesheet to invert map tiles into cyber-dark aesthetics and style Leaflet components */}
      <style>{`
        .dark-leaflet-map .leaflet-tile {
          filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(95%);
        }
        .dark-leaflet-map .leaflet-container {
          background: #020617;
          outline: none;
        }
        /* Leaflet Popup overrides for CaseZero dark aesthetic */
        .case-custom-popup-wrapper .leaflet-popup-content-wrapper {
          background-color: #0b1329 !important;
          border: 1px solid #1e293b !important;
          border-radius: 1rem !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5) !important;
          padding: 4px !important;
        }
        .case-custom-popup-wrapper .leaflet-popup-tip {
          background-color: #0b1329 !important;
          border-left: 1px solid #1e293b !important;
          border-bottom: 1px solid #1e293b !important;
        }
        .case-custom-popup-wrapper .leaflet-popup-content {
          margin: 8px 12px !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-5" id="map-header">
        <div className="space-y-1.5" id="map-header-left">
          <div className="flex items-center gap-2" id="map-header-tagline">
            <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">INTELLIGENT CITIZEN AUDIT</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight md:text-3xl" id="map-header-title">
            Interactive Incident Grid
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Spatially analyze high-priority infrastructure and sanitation bottlenecks across New Delhi districts. Use real-time coordinates mapped dynamically by CaseZero engine.
          </p>
        </div>

        {/* Quick Legend / Status counters */}
        <div className="hidden lg:flex items-center gap-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4" id="map-stats-panel">
          <div className="text-center px-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Active Markers</span>
            <span className="text-lg font-black text-white font-mono mt-0.5">{cases.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="space-y-1.5 text-xs text-slate-400 font-semibold" id="map-legend">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Critical</span>
              <span className="h-2 w-2 rounded-full bg-orange-500 ml-2" />
              <span>High</span>
              <span className="h-2 w-2 rounded-full bg-sky-500 ml-2" />
              <span>Medium</span>
              <span className="h-2 w-2 rounded-full bg-slate-400 ml-2" />
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container and Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-4" id="map-grid-layout">
        {/* Left Side: Dynamic List Panel */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-900/20 p-5 space-y-4 flex flex-col max-h-[600px]" id="map-list-sidebar">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3" id="map-sidebar-title-row">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">District Cases</h3>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
              {cases.length} Total
            </span>
          </div>

          <div className="overflow-y-auto space-y-3 pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent" id="map-sidebar-list">
            {cases.map((c) => {
              const [lat, lng] = getCaseCoordinates(c.id);
              
              let severityDot = 'bg-slate-400';
              if (c.severity === 'Critical') severityDot = 'bg-red-500';
              else if (c.severity === 'High') severityDot = 'bg-orange-500';
              else if (c.severity === 'Medium') severityDot = 'bg-sky-500';

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([lat, lng], 15);
                      // Open popup dynamically
                      mapInstanceRef.current.eachLayer((layer) => {
                        if (layer instanceof L.Marker) {
                          const markerLatLng = layer.getLatLng();
                          if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
                            layer.openPopup();
                          }
                        }
                      });
                    }
                  }}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 hover:bg-slate-900/40 hover:border-slate-700 transition-all cursor-pointer space-y-1.5 group"
                  id={`map-sidebar-item-${c.id}`}
                >
                  <div className="flex items-center justify-between" id={`map-sidebar-head-${c.id}`}>
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                      #{c.id.replace('case-', '')}
                    </span>
                    <div className="flex items-center gap-1.5" id={`map-sidebar-sev-${c.id}`}>
                      <span className={`h-2 w-2 rounded-full ${severityDot}`} />
                      <span className="text-[9px] text-slate-500 uppercase font-bold">{c.severity}</span>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-teal-400 transition-all line-clamp-1">
                    {c.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {c.location}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Large Leaflet Map */}
        <div className="lg:col-span-3 relative h-[600px] w-full dark-leaflet-map rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl" id="map-render-box">
          <div ref={mapContainerRef} className="h-full w-full z-10" id="leaflet-root-container" />
          
          {/* Overlay Coordinates Indicator */}
          <div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-1.5 flex items-center gap-2 shadow-lg" id="map-coordinates-overlay">
            <MapPin size={12} className="text-teal-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-bold tracking-wider font-mono">
              NEW DELHI GRID: 28.6139° N, 77.2090° E
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
