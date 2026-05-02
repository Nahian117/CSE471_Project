import { useEffect, useRef, useState } from 'react';
import { BRACU_PICKUP_POINTS } from '../constants/pickupPoints';

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

/**
 * PickupMap — read-only map for buyers to see a product's pickup location.
 *
 * Props:
 *   pickupLocation – { name, address, lat, lng } object from the product
 *   compact        – if true, renders a smaller version
 */
function PickupMap({ pickupLocation, compact = false }) {
  const mapRef      = useRef(null);
  const [mapError, setMapError]   = useState(false);
  const [mapLoaded, setMapLoaded] = useState(!!window.google?.maps);

  const hasCoords = pickupLocation?.lat && pickupLocation?.lng;
  const matchedPoint = BRACU_PICKUP_POINTS.find(p => p.name === pickupLocation?.name);

  // Load Google Maps if not already loaded
  useEffect(() => {
    if (!MAPS_API_KEY || !hasCoords) return;
    if (window.google?.maps) { setMapLoaded(true); return; }
    if (document.getElementById('gmap-script')) {
      // Script already added by PickupLocationPicker, wait for it
      const interval = setInterval(() => {
        if (window.google?.maps) { setMapLoaded(true); clearInterval(interval); }
      }, 200);
      return () => clearInterval(interval);
    }

    const script = document.createElement('script');
    script.id    = 'gmap-script';
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`;
    script.async = true;
    script.onload  = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, [hasCoords]);

  // Render map once loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !hasCoords) return;
    const G = window.google;

    const position = { lat: pickupLocation.lat, lng: pickupLocation.lng };
    const map = new G.maps.Map(mapRef.current, {
      center:             position,
      zoom:               19,
      mapTypeId:          'satellite',
      disableDefaultUI:   true,
      zoomControl:        true,
      fullscreenControl:  !compact,
      draggable:          !compact,
      scrollwheel:        !compact,
    });

    const marker = new G.maps.Marker({
      position,
      map,
      title: pickupLocation.name,
      animation: G.maps.Animation.DROP,
      icon: {
        path:        G.maps.SymbolPath.CIRCLE,
        scale:       14,
        fillColor:   '#16a34a',
        fillOpacity: 0.95,
        strokeColor: '#fff',
        strokeWeight: 3
      }
    });

    const info = new G.maps.InfoWindow({
      content: `
        <div style="font-family:sans-serif; padding:4px; min-width:160px;">
          <div style="font-size:15px; margin-bottom:4px;">
            ${matchedPoint?.icon || '📍'} <strong>${pickupLocation.name}</strong>
          </div>
          <div style="font-size:11px; color:#555;">${pickupLocation.address || ''}</div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${pickupLocation.lat},${pickupLocation.lng}"
             target="_blank" rel="noreferrer"
             style="display:inline-block; margin-top:6px; font-size:11px; color:#534AB7;">
            🗺️ Get Directions
          </a>
        </div>`
    });

    marker.addListener('click', () => info.open(map, marker));
    // Open info window by default on compact view
    if (compact) info.open(map, marker);
  }, [mapLoaded, hasCoords, compact]);

  if (!hasCoords) return null;

  if (mapError || !MAPS_API_KEY) {
    return (
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '24px' }}>{matchedPoint?.icon || '📍'}</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{pickupLocation.name}</div>
          <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{pickupLocation.address}</div>
          <a href={`https://www.google.com/maps?q=${pickupLocation.lat},${pickupLocation.lng}`}
             target="_blank" rel="noreferrer"
             style={{ color: '#AFA9EC', fontSize: '11px', marginTop: '6px', display: 'inline-block' }}>
            🗺️ Open in Google Maps ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Location label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{matchedPoint?.icon || '📍'}</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{pickupLocation.name}</div>
          {pickupLocation.address && (
            <div style={{ color: '#888', fontSize: '11px' }}>{pickupLocation.address}</div>
          )}
        </div>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${pickupLocation.lat},${pickupLocation.lng}`}
           target="_blank" rel="noreferrer"
           style={{ marginLeft: 'auto', color: '#AFA9EC', fontSize: '11px', textDecoration: 'none', border: '1px solid #2a2a2a', padding: '4px 10px', borderRadius: '20px' }}>
          🗺️ Directions
        </a>
      </div>

      {/* Map */}
      <div ref={mapRef}
           style={{ width: '100%', height: compact ? '180px' : '260px', borderRadius: '10px', border: '1px solid #2a2a2a', overflow: 'hidden' }} />
    </div>
  );
}

export default PickupMap;
