/**
 * ChefHub Ephemeral In-Memory Cache Layer
 * Provides high-speed spatial geohash generation, bounding-box polygon containment caching,
 * and active vendor menu state caching with TTL expiration.
 */

class CacheLayer {
  constructor() {
    this.store = new Map();
    this.geohashCache = new Map();
    this.serviceabilityCache = new Map();
    this.menuCache = new Map();
  }

  // Base key-value store with TTL
  set(key, val, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { val, expiresAt });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.val;
  }

  del(key) {
    this.store.delete(key);
  }

  /**
   * Fast 32-base Geohash computation (7 characters precision ~ 150m)
   */
  encodeGeohash(latitude, longitude, precision = 7) {
    const key = `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)},${precision}`;
    if (this.geohashCache.has(key)) {
      return this.geohashCache.get(key);
    }

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

    this.geohashCache.set(key, geohash);
    // Auto purge if cache gets too large
    if (this.geohashCache.size > 5000) {
      const firstKey = this.geohashCache.keys().next().value;
      this.geohashCache.delete(firstKey);
    }
    return geohash;
  }

  /**
   * Calculate 20km Geodesic Bounding Box Polygon for a kitchen coordinate
   */
  getKitchenBoundingBox(lat, lng, radiusKm = 20) {
    const cacheKey = `bbox_${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}_${radiusKm}`;
    const cached = this.get(cacheKey);
    if (cached) return cached;

    // Approximate delta lat/lng for bounding box
    const deltaLat = radiusKm / 111.0;
    const deltaLng = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    const bbox = {
      minLat: Number((lat - deltaLat).toFixed(6)),
      maxLat: Number((lat + deltaLat).toFixed(6)),
      minLng: Number((lng - deltaLng).toFixed(6)),
      maxLng: Number((lng + deltaLng).toFixed(6)),
      center: { lat: Number(lat), lng: Number(lng) },
      radiusKm
    };

    this.set(cacheKey, bbox, 3600); // 1 hour TTL
    return bbox;
  }

  /**
   * Evaluates serviceability with caching
   */
  checkServiceability(custLat, custLng, kitchenLat, kitchenLng, maxRadiusKm = 20) {
    const cLat = Number(custLat);
    const cLng = Number(custLng);
    const kLat = Number(kitchenLat);
    const kLng = Number(kitchenLng);

    const cacheKey = `srv_${cLat.toFixed(4)}_${cLng.toFixed(4)}_${kLat.toFixed(4)}_${kLng.toFixed(4)}`;
    const cached = this.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    // Geodesic Haversine
    const R = 6371;
    const dLat = ((kLat - cLat) * Math.PI) / 180;
    const dLon = ((kLng - cLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((cLat * Math.PI) / 180) *
        Math.cos((kLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Number((R * c).toFixed(2));

    const isServiceable = distanceKm <= maxRadiusKm;
    const custGeohash = this.encodeGeohash(cLat, cLng, 7);
    const kitchenGeohash = this.encodeGeohash(kLat, kLng, 7);

    const result = {
      is_serviceable: isServiceable,
      distance_km: distanceKm,
      max_radius_km: maxRadiusKm,
      customer_geohash: custGeohash,
      kitchen_geohash: kitchenGeohash,
      estimated_delivery_mins: Math.max(15, Math.round(distanceKm * 3.5 + 15)),
      cached: false
    };

    this.set(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  // Active Menu caching
  setMenuCache(vendorId, menuData, ttlSeconds = 120) {
    this.set(`menu_${vendorId}`, menuData, ttlSeconds);
  }

  getMenuCache(vendorId) {
    return this.get(`menu_${vendorId}`);
  }

  invalidateMenu(vendorId) {
    this.del(`menu_${vendorId}`);
  }
}

module.exports = new CacheLayer();
