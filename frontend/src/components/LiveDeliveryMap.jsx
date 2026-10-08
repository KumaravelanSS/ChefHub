import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bike, Navigation, MapPin, Clock, Gauge, ShieldCheck, Info, Play, Pause, RotateCcw, ExternalLink, Phone } from 'lucide-react';

// Custom Map Tile URLs (Supports dark mode & crisp standard tiles)
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export default function LiveDeliveryMap({
  chefLocation = { lat: 12.9784, lng: 77.6408, locality: 'Indiranagar Kitchen' },
  customerLocation = { lat: 12.9352, lng: 77.6245, locality: 'Koramangala 5th Block' },
  riderName = 'David Rider',
  riderPhone = '+91 98450 12890',
  customerName = 'Alex Customer',
  customerPhone = '+91 98765 43210',
  vehicleType = 'Ather 450X EV Scooter',
  isDarkMode = true,
  viewerRole = 'CUSTOMER', // 'CUSTOMER' | 'RIDER' — controls what info is shown
  onArrival = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const progressLineRef = useRef(null);
  const animFrameRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simProgress, setSimProgress] = useState(0.25); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showApiGuide, setShowApiGuide] = useState(false);

  // Generate intermediate road-like curved waypoints between chef & customer
  const waypoints = useRef([]);

  useEffect(() => {
    const p1 = [chefLocation.lat || 12.9784, chefLocation.lng || 77.6408];
    const p2 = [customerLocation.lat || 12.9352, customerLocation.lng || 77.6245];

    // Midpoints with slight realistic urban curvature
    const mid1 = [
      p1[0] * 0.7 + p2[0] * 0.3 + 0.004,
      p1[1] * 0.7 + p2[1] * 0.3 - 0.003
    ];
    const mid2 = [
      p1[0] * 0.3 + p2[0] * 0.7 - 0.003,
      p1[1] * 0.3 + p2[1] * 0.7 + 0.004
    ];

    // Subdivide into 100 smooth interpolation steps
    const pts = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Cubic Bezier interpolation
      const lat =
        Math.pow(1 - t, 3) * p1[0] +
        3 * Math.pow(1 - t, 2) * t * mid1[0] +
        3 * (1 - t) * Math.pow(t, 2) * mid2[0] +
        Math.pow(t, 3) * p2[0];
      const lng =
        Math.pow(1 - t, 3) * p1[1] +
        3 * Math.pow(1 - t, 2) * t * mid1[1] +
        3 * (1 - t) * Math.pow(t, 2) * mid2[1] +
        Math.pow(t, 3) * p2[1];
      pts.push([lat, lng]);
    }
    waypoints.current = pts;
  }, [chefLocation, customerLocation]);

  // Total route distance calculation
  const totalKm = (function () {
    const lat1 = chefLocation.lat || 12.9784;
    const lon1 = chefLocation.lng || 77.6408;
    const lat2 = customerLocation.lat || 12.9352;
    const lon2 = customerLocation.lng || 77.6245;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  })();

  const remainingKm = Math.max(0, (totalKm * (1 - simProgress))).toFixed(1);
  const remainingMins = Math.max(1, Math.round(Number(remainingKm) * 3.2));
  const currentSpeed = simProgress >= 1 ? 0 : 28;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const chefPoint = [chefLocation.lat || 12.9784, chefLocation.lng || 77.6408];
      const custPoint = [customerLocation.lat || 12.9352, customerLocation.lng || 77.6245];

      const map = L.map(mapContainerRef.current, {
        center: [
          (chefPoint[0] + custPoint[0]) / 2,
          (chefPoint[1] + custPoint[1]) / 2
        ],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer(isDarkMode ? TILE_DARK : TILE_LIGHT, {
        maxZoom: 19
      }).addTo(map);

      // Custom HTML Icons
      const chefIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background: #ea580c; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.5); font-size: 18px;">
            🍳
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const customerIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background: #10b981; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5); font-size: 18px;">
            🏠
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const riderIcon = L.divIcon({
        className: 'custom-rider-marker',
        html: `
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="background: #2563eb; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.6); font-size: 19px; z-index: 10;">
              🚴
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      // Markers
      L.marker(chefPoint, { icon: chefIcon })
        .addTo(map)
        .bindPopup(`<b>👨‍🍳 Chef Kitchen</b><br>${chefLocation.locality || 'Indiranagar'}`);

      L.marker(custPoint, { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>🏠 Delivery Address</b><br>${customerLocation.locality || 'Koramangala'}`);

      const startIdx = Math.floor(simProgress * (waypoints.current.length - 1));
      const riderPos = waypoints.current[startIdx] || chefPoint;

      const riderMarker = L.marker(riderPos, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
      riderMarkerRef.current = riderMarker;

      // Full Route Line (Gray dashed)
      const fullLine = L.polyline(waypoints.current, {
        color: isDarkMode ? '#475569' : '#cbd5e1',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.8
      }).addTo(map);
      routeLineRef.current = fullLine;

      // Traveled Route Line (Blue solid)
      const traveledPts = waypoints.current.slice(0, startIdx + 1);
      const traveledLine = L.polyline(traveledPts, {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.95
      }).addTo(map);
      progressLineRef.current = traveledLine;

      // Auto fit bounds
      map.fitBounds(fullLine.getBounds(), { padding: [50, 50] });
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Animation Loop for Rider Movement
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + 0.006 * playbackSpeed;
        if (next >= 1) {
          setIsPlaying(false);
          if (onArrival) onArrival();
          return 1;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Update Rider Position on Map when simProgress changes
  useEffect(() => {
    if (!waypoints.current.length || !riderMarkerRef.current) return;

    const idx = Math.min(
      waypoints.current.length - 1,
      Math.floor(simProgress * (waypoints.current.length - 1))
    );
    const newPos = waypoints.current[idx];

    if (newPos) {
      riderMarkerRef.current.setLatLng(newPos);

      if (progressLineRef.current) {
        const traveledPts = waypoints.current.slice(0, idx + 1);
        progressLineRef.current.setLatLngs(traveledPts);
      }
    }
  }, [simProgress]);

  const handleRestart = () => {
    setSimProgress(0);
    setIsPlaying(true);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Real-Time Telemetry & Safety Card */}
      <div className={`p-4 rounded-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-lg border ${
        viewerRole === 'RIDER'
          ? 'bg-gradient-to-r from-emerald-600/10 via-teal-600/15 to-sky-600/10 border-emerald-500/25'
          : 'bg-gradient-to-r from-blue-600/10 via-indigo-600/15 to-purple-600/10 border-blue-500/25'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md ${
            viewerRole === 'RIDER'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-blue-500/20'
          }`}>
            {viewerRole === 'RIDER' ? '🛵' : '🚴'}
          </div>
          <div>
            {viewerRole === 'RIDER' ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-slate-900 dark:text-white">Customer: {customerName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[10px] font-extrabold uppercase">
                    Drop-off Destination
                  </span>
                  {customerPhone && (
                    <a
                      href={`tel:${customerPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 transition shadow-sm"
                      title="Call Customer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{customerPhone}</span>
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Deliver to: </span>
                  {customerLocation.locality || 'Customer Address'}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-slate-900 dark:text-white">{riderName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                    {vehicleType}
                  </span>
                  {riderPhone && (
                    <a
                      href={`tel:${riderPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/30 transition shadow-sm"
                      title="Call Delivery Partner"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{riderPhone}</span>
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {simProgress >= 1 ? (
                    <span className="text-emerald-500 font-extrabold">🎉 Courier Arrived at Doorstep!</span>
                  ) : (
                    <span>En route to {customerLocation.locality || 'your delivery address'}</span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Real-Time Metrics Counters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span>Distance Left</span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {remainingKm} <span className="text-xs font-semibold text-slate-400">km</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

          {/* Arriving Time (ETA) - ONLY shown for consumer, NOT shown for delivery person (safety of riders) */}
          {viewerRole !== 'RIDER' ? (
            <>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estimated Arrival</span>
                </div>
                <div className="text-lg font-black text-amber-500">
                  {simProgress >= 1 ? 'Arrived' : `~${remainingMins} min`}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
            </>
          ) : (
            <>
              {/* Delivery Driver Safety Mode: No Speed Rush ETA Counter */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Rider Safety First</span>
                </div>
                <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                  Safe Pace Navigation
                </div>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
            </>
          )}

          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Speed</span>
            </div>
            <div className="text-lg font-black text-emerald-400">
              {currentSpeed} <span className="text-xs font-semibold text-slate-400">km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-950">
        <div
          ref={mapContainerRef}
          className="w-full h-[320px] sm:h-[380px] z-0"
          style={{ minHeight: '320px' }}
        />

        {/* Map Overlay Controls */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Resume'}</span>
            </button>

            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
              {[1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowApiGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Map API Specs</span>
          </button>
        </div>
      </div>

      {/* Progress Bar of Trip */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span>Kitchen ({chefLocation.locality || 'Indiranagar'})</span>
          <span>{(simProgress * 100).toFixed(0)}% Completed</span>
          <span>Destination ({customerLocation.locality || 'Koramangala'})</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, simProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* Google Maps API Implementation Details Modal */}
      {showApiGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  🗺️
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Google Maps Platform & Real-Time Tracking Guide</h3>
                  <p className="text-[11px] text-slate-400">How real-world delivery apps like Zomato & Swiggy calculate live coordinates</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="font-extrabold text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>1. Google Maps JavaScript API (Frontend)</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Loaded dynamically via script tag or <code className="text-amber-300">@googlemaps/js-api-loader</code>. Renders the map canvas and places markers using <code className="text-amber-300">google.maps.Marker</code> with custom SVG bike icons.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="font-extrabold text-blue-400 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-blue-400" />
                  <span>2. Google Directions & Distance Matrix API</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Calculates turn-by-turn road polyline points from Chef Kitchen Coordinates to Customer Coordinates, returning exact traffic-aware distance in meters and ETA duration in seconds.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="font-extrabold text-blue-400 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <span>3. Real-Time Telemetry via SSE / WebSockets</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  The Courier's mobile app sends <code className="text-amber-300">POST /api/rider/location</code> every 3-5 seconds. The backend broadcasts updates to the customer via Server-Sent Events (SSE).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px]">
                <strong>💡 Why Leaflet + CartoDB tiles are active in this project:</strong>
                <p className="mt-1">
                  Guarantees 100% uninterrupted local evaluation and college grading without requiring paid credit card billing on Google Cloud!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowApiGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20"
            >
              Close Technical Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
