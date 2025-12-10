import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

// --- ÖZEL TEXT RENDERER SINIFI ---
// Leaflet'in Canvas renderer'ını kullanarak HTML yerine doğrudan çizim yapar.
// Bu sayede 4000+ obje kasma yapmaz ve AutoCAD gibi zoom ile büyür/küçülür.
L.TextLabel = L.CircleMarker.extend({
  options: {
    text: '',
    textStyle: '300',  // Light font weight (ince, kibar)
    textColor: '#333',  // Koyu gri, siyah değil
    textBaseSize: 10,   // Küçültüldü (24 -> 10)
    refZoom: 20,
    interactive: false
  },

  _updatePath: function () {
    const element = this._renderer._ctx;
    const p = this._point;
    const map = this._map;
    
    if (!map) return;

    const zoom = map.getZoom();
    const scale = Math.pow(2, zoom - this.options.refZoom);
    const fontSize = this.options.textBaseSize * scale;

    if (fontSize < 1) return; 

    element.font = this.options.textStyle + ' ' + fontSize + 'px sans-serif';
    element.fillStyle = this.options.textColor;
    element.textAlign = 'center';
    element.textBaseline = 'middle';

    element.lineWidth = fontSize / 8;  // Daha ince stroke
    element.strokeStyle = 'rgba(255,255,255,0.8)';
    element.strokeText(this.options.text, p.x, p.y);
    element.fillText(this.options.text, p.x, p.y);
  }
});

L.textLabel = function (latlng, options) {
  return new L.TextLabel(latlng, options);
};

const canvasRenderer = L.canvas({ padding: 0.5 });

const GEOJSON_FILES = [
  { url: '/fulll.geojson', name: 'fulll', color: '#2563eb', fillColor: '#3b82f6' },
  { url: '/string_text.geojson', name: 'string_text', color: '#dc2626', fillColor: '#ef4444' },
];

function App() {
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [status, setStatus] = useState('Harita başlatılıyor...');

  const fetchAllGeoJson = async () => {
    if (!mapRef.current) return;
    setStatus('Veriler yükleniyor...');

    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];
    
    const allBounds = L.latLngBounds();
    let totalFeatures = 0;

    for (const file of GEOJSON_FILES) {
      try {
        const response = await fetch(file.url);
        if (!response.ok) continue;
        const data = await response.json();
        totalFeatures += data.features?.length || 0;

        const layer = L.geoJSON(data, {
          renderer: canvasRenderer,
          interactive: false,
          style: {
            color: file.color,
            weight: 1,
            fillColor: file.fillColor,
            fillOpacity: 0.4,
          },
          pointToLayer: (feature, latlng) => {
            if (feature.properties?.text) {
                return L.textLabel(latlng, {
                    text: feature.properties.text,
                    renderer: canvasRenderer,
                    textBaseSize: 8,   // Küçük boyut
                    textStyle: '300',  // Thin/Light
                    textColor: '#444'
                });
            }
            return L.circleMarker(latlng, { renderer: canvasRenderer, radius: 2 });
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties?.text && feature.geometry.type !== 'Point') {
              let center;
              if (typeof layer.getBounds === 'function') {
                center = layer.getBounds().getCenter();
              } else if (typeof layer.getLatLng === 'function') {
                center = layer.getLatLng();
              }

              if (center) {
                const textMarker = L.textLabel(center, {
                  text: feature.properties.text,
                  renderer: canvasRenderer,
                  textBaseSize: 20,   // 80 -> 20 (küçültüldü)
                  refZoom: 22,
                  textStyle: '300',   // Thin/Light
                  textColor: '#333'   // Koyu gri
                });
                textMarker.addTo(mapRef.current);
                layersRef.current.push(textMarker);
              }
            }
          }
        }).addTo(mapRef.current);
        
        layersRef.current.push(layer);
        if (layer.getBounds().isValid()) allBounds.extend(layer.getBounds());

      } catch (err) { console.error(err); }
    }

    if (allBounds.isValid()) mapRef.current.fitBounds(allBounds);
    
    setStatus('Hazır: ' + totalFeatures + ' obje (Canvas Mode)');
  };

  useEffect(() => {
    mapRef.current = L.map('map', {
      zoomControl: true,
      preferCanvas: true,
      zoomAnimation: true,
    }).setView([39, 35], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 23,
      maxNativeZoom: 19,
      attribution: '&copy; OSMap'
    }).addTo(mapRef.current);

    fetchAllGeoJson();

    return () => mapRef.current?.remove();
  }, []);

  return (
    <div className="app">
      <div className="map-wrapper">
        <div id="map" />
        <div className="status" style={{
            position:'absolute', top:10, left:50, zIndex:999, 
            background:'white', padding:'5px 10px', borderRadius:'4px',
            boxShadow:'0 2px 6px rgba(0,0,0,0.2)', fontWeight:'bold'
        }}>
          {status}
        </div>
      </div>
    </div>
  );
}

export default App;
