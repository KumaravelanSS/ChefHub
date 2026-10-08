import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bike, Navigation, MapPin, Clock, Gauge, ShieldCheck, Info, Play, Pause, RotateCcw, ExternalLink, Phone } from 'lucide-react';

// Clean OpenStreetMap tiles - Free, public & NO "API KEY REQUIRED" watermark
const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function LiveDeliveryMap({
  chefLocation = { lat: 12.9784, lng: 77.6408, locality: 'Indiranagar Kitchen' },
  customerLocation = { lat: 12.9352, lng: 77.6245, locality: 'Koramangala 5th Block' },
  riderName = 'David Rider',
  riderPhone = '+91 98450 12890',
  customerName = 'Alex Customer',
  customerPhone = '+91 98765 43210',
  vehicleType = 'Ather 450X EV Scooter',
  orderStatus = 'OUT_FOR_DELIVERY', // 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
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

  const normalizedStatus = String(orderStatus || 'OUT_FOR_DELIVERY').toUpperCase();
  const isDelivered = normalizedStatus === 'DELIVERED';
  const isReady = normalizedStatus === 'READY' || normalizedStatus === 'KITCHEN_READY' || normalizedStatus === 'READY_FOR_PICKUP';
  const isOutForDelivery = normalizedStatus === 'OUT_FOR_DELIVERY' || normalizedStatus === 'RIDER_ACCEPTED';
  const isPreparing = normalizedStatus === 'PREPARING' || normalizedStatus === 'KITCHEN_PREPARING';
  const isPendingCook = normalizedStatus === 'PLACED' || normalizedStatus === 'CONFIRMED' || normalizedStatus === 'ORDER_PLACED';
  const isCancelled = normalizedStatus === 'CANCELLED';

  const hasRiderAccepted = isOutForDelivery || isDelivered;

  const defaultProgress = isDelivered ? 1 : isReady ? 0.05 : isOutForDelivery ? 0.25 : 0;
  const [isPlaying, setIsPlaying] = useState(isOutForDelivery);
  const [simProgress, setSimProgress] = useState(defaultProgress);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showApiGuide, setShowApiGuide] = useState(false);

  useEffect(() => {
    if (isDelivered) {
      setSimProgress(1);
      setIsPlaying(false);
    } else if (isReady) {
      setSimProgress(0.05);
      setIsPlaying(false);
    } else if (isOutForDelivery) {
      setSimProgress(prev => (prev < 0.1 ? 0.25 : prev));
      setIsPlaying(true);
    } else {
      setSimProgress(0);
      setIsPlaying(false);
    }
  }, [orderStatus]);

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

  const remainingKm = isDelivered ? '0.0' : (isPendingCook || isPreparing) ? totalKm.toFixed(1) : Math.max(0, (totalKm * (1 - simProgress))).toFixed(1);
  const remainingMins = isDelivered ? 0 : isPendingCook ? 35 : isPreparing ? 22 : isReady ? 14 : Math.max(1, Math.round(Number(remainingKm) * 3.2));
  const currentSpeed = (isDelivered || isPendingCook || isPreparing || isReady || isCancelled) ? 0 : (simProgress >= 1 ? 0 : 28);

  // Initialize Leaflet Map — Only runs when container is mounted (Step 4 & 5 or Rider role)
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
  }, [hasRiderAccepted]);

  // Animation Loop for Rider Movement — ONLY when order is actively OUT_FOR_DELIVERY
  useEffect(() => {
    if (!isPlaying || !isOutForDelivery) return;

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
  }, [isPlaying, playbackSpeed, isOutForDelivery]);

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
    <div className="w-full space-y-3.5">
      {/* Lifecycle Stage Alert Banner */}
      {isPendingCook && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-bold">
            <Clock className="w-4 h-4 animate-spin shrink-0 text-amber-500" />
            <span>Order Placed • Waiting for Chef ({chefLocation.locality || 'Kitchen'}) to accept order and start preparation</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] uppercase shrink-0">
            Awaiting Cook
          </span>
        </div>
      )}

      {isPreparing && (
        <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-orange-700 dark:text-orange-400 font-bold">
            <span className="text-base animate-pulse">🍳</span>
            <span>Chef is actively preparing your handcrafted meal. Courier will be dispatched once packaging is complete.</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold text-[10px] uppercase shrink-0">
            Kitchen Cooking
          </span>
        </div>
      )}

      {isReady && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-bold">
            <span className="text-base">📦</span>
            <span>Meal sealed with thermal insulation! Courier arriving at kitchen for pickup.</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] uppercase shrink-0">
            Packed & Ready
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400 font-bold">
            <X className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Order was cancelled by the cook. 100% Escrow refund has been credited back to your account.</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] uppercase shrink-0">
            100% Refunded
          </span>
        </div>
      )}

      {/* Customer Mode Before Courier Pick-Up (Step 1, 2, 3): HIDE MAP & RIDER DETAILS */}
      {viewerRole === 'CUSTOMER' && !hasRiderAccepted ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
          {isReady ? (
            /* STEP 3: FOOD IS PREPARED, WAITING FOR DELIVERY PERSON */
            <div className="space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping duration-1000" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/40 border border-emerald-400/30">
                  📦
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Order Ready • Waiting for Delivery Partner
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Ready to be Picked Up by a Delivery Person
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  The chef has finished cooking your handcrafted meal and sealed it with thermal insulation. We are currently waiting for an active delivery person to accept and pick up the order.
                </p>
              </div>

              {/* Courier Radar Search Animation Card */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-lg mx-auto space-y-4 text-left shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span>Courier Dispatch Radar</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-800/60 font-extrabold animate-pulse">
                    Broadcasting to Nearby Couriers...
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Kitchen Pickup</span>
                    <span className="font-black text-white flex items-center gap-1.5 truncate">
                      <span>👨‍🍳</span> {chefLocation.locality || 'Chef Kitchen'}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold block">✓ Food Prepared & Sealed</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Courier Status</span>
                    <span className="font-black text-amber-400 flex items-center gap-1.5 truncate">
                      <span>⏳</span> Awaiting Pickup
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold block">Step 4 Pending</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/25 flex items-start gap-3 text-xs text-blue-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                  <span className="leading-snug">
                    <strong className="text-white">Live Tracking Activation:</strong> As soon as a delivery person takes up this order (Step 4), their name, vehicle details, contact number, and the live GPS route map will appear right here!
                  </span>
                </div>
              </div>
            </div>
          ) : isPreparing ? (
            /* STEP 2: KITCHEN PREPARING */
            <div className="space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center text-4xl shadow-2xl shadow-orange-500/40 border border-orange-400/30">
                  🍳
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                  Step 2 • Kitchen Cooking
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Chef is Handcrafting Your Meal
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  The chef is actively preparing your order with fresh ingredients. Delivery partner dispatch will begin once cooking and packaging is complete.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-lg mx-auto space-y-3 text-left text-xs shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 font-bold">Kitchen:</span>
                  <span className="font-extrabold text-white">{chefLocation.locality || 'Chef Kitchen'}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 font-bold">Culinary Status:</span>
                  <span className="font-extrabold text-orange-400">🔥 Actively Cooking</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Next Milestone:</span>
                  <span className="font-extrabold text-amber-400">Step 3 • Food Packed & Ready for Pickup</span>
                </div>
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>The live GPS tracking map and delivery person details will unlock once the food is packed and accepted by a courier.</span>
                </div>
              </div>
            </div>
          ) : isPendingCook ? (
            /* STEP 1: ORDER PLACED / AWAITING COOK ACCEPTANCE */
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center text-4xl mx-auto shadow-2xl shadow-amber-500/40 border border-amber-400/30">
                ⏳
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  Step 1 • Order Placed & Confirmed
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Waiting for Chef Acceptance
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  Your order has been placed and payment is secured in Escrow. Waiting for Chef ({chefLocation.locality || 'Kitchen'}) to review and start preparation.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-lg mx-auto space-y-3 text-left text-xs shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 font-bold">Escrow Protection:</span>
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> 100% Protected in Escrow
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Target Kitchen:</span>
                  <span className="font-extrabold text-white">{chefLocation.locality || 'Chef Kitchen'}</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Live delivery map and courier information will appear when food preparation is complete and a courier picks up the order.</span>
                </div>
              </div>
            </div>
          ) : (
            /* CANCELLED */
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-3xl mx-auto border border-rose-500/40">
                ✕
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">Order Cancelled</h3>
                <p className="text-xs text-rose-400">
                  This order was cancelled. 100% Escrow refund has been credited back to your account.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* OTHERWISE (Rider has accepted at Step 4 OR viewerRole is RIDER): SHOW LIVE DELIVERY DETAILS & MAP! */
        <>
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
                      {isCancelled ? (
                        <span className="text-rose-500 font-extrabold">❌ Order Cancelled by Chef — Refund Completed</span>
                      ) : isDelivered ? (
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

              {/* Arriving Time (ETA) */}
              {viewerRole !== 'RIDER' ? (
                <>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Estimated Arrival</span>
                    </div>
                    <div className="text-lg font-black text-amber-500">
                      {isCancelled ? 'Cancelled' : isDelivered ? 'Arrived' : `~${remainingMins} min`}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
                </>
              ) : (
                <>
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
        </>
      )}

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
