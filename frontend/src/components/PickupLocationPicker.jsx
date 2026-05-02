import { useEffect, useRef, useState } from 'react';
import { BRACU_PICKUP_POINTS, BRACU_CENTER, BRACU_ZOOM } from '../constants/pickupPoints';

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

/**
 * PickupLocationPicker
 * Seller-facing component: shows an embedded Google Map centred on BRACU campus
 * with predefined pickup point markers. Clicking a marker selects it.
 *
 * Props:
 *   value    – currently selected { id, name, address, lat, lng } or null
 *   onChange – called with the selected point object whenever selection changes
 */
function PickupLocationPicker({ value, onChange }) {
  const mapRef      = useRef(null);
  const googleRef   = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);
  const [selected, setSelected]   = useState(value || null);
  const [mapError, setMapError]   = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load Google Maps script once
  useEffect(() => {
    if (!MAPS_API_KEY) {
      setMapError(true);
      return;
    }
    if (window.google?.maps) {
      googleRef.current = window.google;
      setMapLoaded(true);
      return;
    }
    if (document.getElementById('gmap-script')) return;

    const script = document.createElement('script');
    script.id  = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => {
      googleRef.current = window.google;
      setMapLoaded(true);
    };
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  // Initialise map after script loads
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const G = googleRef.current;

    const map = new G.maps.Map(mapRef.current, {
      center:    BRACU_CENTER,
      zoom:      BRACU_ZOOM,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    });

    mapInstance.current = map;

    // Draw markers for each predefined pickup point
    BRACU_PICKUP_POINTS.forEach(point => {
      const marker = new G.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        title: point.name,
        icon: {
          path:        G.maps.SymbolPath.CIRCLE,
          scale:       10,
          fillColor:   '#534AB7',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      const infoWindow = new G.maps.InfoWindow({
        content: `
          <div style="font-family: sans-serif; padding: 4px; min-width: 160px;">
            <div style="font-size: 16px; margin-bottom: 2px;">${point.icon} <strong>${point.name}</strong></div>
            <div style="font-size: 12px; color: #555; margin-bottom: 6px;">${point.description}</div>
            <div style="font-size: 11px; color: #888;">${point.address}</div>
          </div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        selectPoint(point, marker);
      });

      marker.addListener('mouseover', () => infoWindow.open(map, marker));

      markersRef.current.push({ point, marker, infoWindow });
    });
  }, [mapLoaded]);

  // Highlight selected marker
  const selectPoint = (point, clickedMarker) => {
    const G = googleRef.current;
    // Reset all markers
    markersRef.current.forEach(({ marker }) => {
      marker.setIcon({
        path:        G.maps.SymbolPath.CIRCLE,
        scale:       10,
        fillColor:   '#534AB7',
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2
      });
    });
    // Highlight selected
    clickedMarker.setIcon({
      path:        G.maps.SymbolPath.CIRCLE,
      scale:       13,
      fillColor:   '#16a34a',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2
    });

    setSelected(point);
    onChange?.(point);
  };

  // Handle predefined-list button click (fallback when no API key)
  const handleListSelect = (point) => {
    setSelected(point);
    onChange?.(point);
  };

  if (mapError || !MAPS_API_KEY) {
    // Fallback: dropdown list of predefined points
    return (
      <div style={{ background: '#111', borderRadius: '10px', padding: '14px', border: '1px solid #2a2a2a' }}>
        <div style={{ color: '#FAC775', fontSize: '12px', marginBottom: '10px' }}>
          ⚠️ Map unavailable — select a pickup point from the list below.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {BRACU_PICKUP_POINTS.map(point => (
            <button key={point.id} type="button" onClick={() => handleListSelect(point)}
              style={{
                background:  selected?.id === point.id ? '#16143a' : '#1a1a1a',
                border:      `1px solid ${selected?.id === point.id ? '#534AB7' : '#2a2a2a'}`,
                borderRadius: '8px', padding: '10px 14px', cursor: 'pointer',
                color: '#fff', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px'
              }}>
              <span style={{ fontSize: '20px' }}>{point.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{point.name}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>{point.description}</div>
              </div>
              {selected?.id === point.id && <span style={{ marginLeft: 'auto', color: '#4ade80' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Quick-select chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {BRACU_PICKUP_POINTS.map(point => (
          <button key={point.id} type="button"
            onClick={() => {
              const entry = markersRef.current.find(m => m.point.id === point.id);
              if (entry) {
                mapInstance.current?.panTo({ lat: point.lat, lng: point.lng });
                mapInstance.current?.setZoom(20);
                selectPoint(point, entry.marker);
              }
            }}
            style={{
              background:   selected?.id === point.id ? '#16a34a' : '#1a1a1a',
              border:       `1px solid ${selected?.id === point.id ? '#16a34a' : '#2a2a2a'}`,
              borderRadius: '20px', padding: '5px 12px', cursor: 'pointer',
              color: '#fff', fontSize: '12px', fontWeight: 600
            }}>
            {point.icon} {point.name}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div ref={mapRef} style={{ width: '100%', height: '280px', borderRadius: '10px', border: '1px solid #2a2a2a', overflow: 'hidden' }} />

      {/* Selected point info */}
      {selected && (
        <div style={{ marginTop: '10px', background: '#0a1a0a', border: '1px solid #16a34a', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{BRACU_PICKUP_POINTS.find(p => p.id === selected.id)?.icon || '📍'}</span>
          <div>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '13px' }}>✅ Selected: {selected.name}</div>
            <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{selected.address}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PickupLocationPicker;
