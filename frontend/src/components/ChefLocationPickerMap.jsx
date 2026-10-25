import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Crosshair, ZoomIn, ZoomOut, Compass } from 'lucide-react';

const TILE_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// Fast 7-Character Geohash Generator (~150m precision for spatial indexing)
export function computeGeohash(latitude, longitude, precision = 7) {
  const BITS = [16, 8, 4, 2, 1];
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let isEven = true;
  let lat = [-90.0, 90.0];
  let lon = [-180.0, 180.0];
  let geohash = '';
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    let mid;
    if (isEven) {
      mid = (lon[0] + lon[1]) / 2;
      if (longitude > mid) {
        ch |= BITS[bit];
        lon[0] = mid;
      } else {
        lon[1] = mid;
      }
    } else {
      mid = (lat[0] + lat[1]) / 2;
      if (latitude > mid) {
        ch |= BITS[bit];
        lat[0] = mid;
      } else {
        lat[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

export default function ChefLocationPickerMap({
  latitude = 12.9784,
  longitude = 77.6408,
  onChange,
  localityName = 'Chef Kitchen'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Safe parsed coordinates
  const currentLat = Number(latitude) || 12.9784;
  const currentLng = Number(longitude) || 77.6408;
  const [activeGeohash, setActiveGeohash] = useState(() => computeGeohash(currentLat, currentLng, 7));

  // Custom Chef Kitchen Pin Icon
  const createChefIcon = () => {
    return L.divIcon({
      className: 'chef-kitchen-map-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="position: absolute; bottom: 12px; width: 44px; height: 44px; background: rgba(16, 185, 129, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 42px; height: 42px; border-radius: 16px; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -3px rgba(16, 185, 129, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.1); font-size: 20px; z-index: 10;">
            👨‍🍳
          </div>
          <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #059669; margin-top: -2px; z-index: 9;"></div>
          <div style="width: 14px; height: 5px; background: rgba(0,0,0,0.25); border-radius: 50%; margin-top: 1px; filter: blur(1px);"></div>
        </div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 48],
      popupAnchor: [0, -48]
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer(isDarkMode ? TILE_DARK : TILE_VOYAGER, {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Add draggable kitchen marker
      const marker = L.marker([currentLat, currentLng], {
        icon: createChefIcon(),
        draggable: true,
        autoPan: true
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px 2px;">
          <strong style="color: #059669; font-size: 13px;">👨‍🍳 Kitchen Location</strong><br/>
          <span style="color: #475569;">Drag this pin or click anywhere on the map to set your kitchen GPS.</span>
        </div>
      `);

      // Drag event
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        const lat = Number(pos.lat.toFixed(6));
        const lng = Number(pos.lng.toFixed(6));
        const gh = computeGeohash(lat, lng, 7);
        setActiveGeohash(gh);
        if (onChange) onChange(lat, lng, gh);
      });

      // Map click event
      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        const gh = computeGeohash(lat, lng, 7);
        marker.setLatLng([lat, lng]);
        setActiveGeohash(gh);
        if (onChange) onChange(lat, lng, gh);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Ensure proper container sizing after mount
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker position when external lat/lng changes
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const markerPos = markerRef.current.getLatLng();
      const distLat = Math.abs(markerPos.lat - currentLat);
      const distLng = Math.abs(markerPos.lng - currentLng);

      // Only re-center/animate if position differed meaningfully
      if (distLat > 0.0001 || distLng > 0.0001) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapInstanceRef.current.flyTo([currentLat, currentLng], mapInstanceRef.current.getZoom(), {
          animate: true,
          duration: 0.8
        });
      }
    }
  }, [currentLat, currentLng]);

  // Handle Detect GPS Location
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        if (onChange) onChange(lat, lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationError('Could not retrieve your GPS location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleZoom = (delta) => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(currentZoom + delta);
    }
  };

  return (
    <div className="space-y-2">
      {/* Interactive Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-950">
        <div
          ref={mapContainerRef}
          className="w-full h-[280px] sm:h-[320px] z-0"
          style={{ minHeight: '280px' }}
        />

        {/* Top-Right Quick Map Controls */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleDetectCurrentLocation}
            disabled={isLocating}
            className="p-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Pin My Current GPS Location"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'My GPS'}</span>
          </button>

          <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => handleZoom(1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors border-b border-slate-100 dark:border-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Floating Info Pill */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[1000] pointer-events-none">
          <div className="bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="font-mono font-bold text-emerald-400">
                {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[10px] font-extrabold border border-sky-500/30" title="Client-Side Computed 7-Character Geohash for Fast Spatial Clustering">
                Geohash: {activeGeohash}
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-300 text-[11px] hidden sm:inline">
                Drag marker to reposition
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Kitchen Coordinates Set
            </span>
          </div>
        </div>
      </div>

      {locationError && (
        <p className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
          <span>⚠️ {locationError}</span>
        </p>
      )}
    </div>
  );
}
