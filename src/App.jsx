import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import './styles.css';

// Vite taban yoluna göre doğru yerel dosyayı çekebilmek için BASE_URL kullanılır.
const GEOJSON_URL = `${import.meta.env.BASE_URL}text.geojson`;

function App() {
  const mapRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const [status, setStatus] = useState('GeoJSON yükleniyor...');

  const fetchGeoJson = async () => {
    if (!mapRef.current) return;
    setStatus('GeoJSON yükleniyor...');
    try {
      const response = await fetch(GEOJSON_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Sunucu cevabı: ${response.status}`);
      }

      const data = await response.json();

      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.remove();
      }

      geoJsonLayerRef.current = L.geoJSON(data, {
        style: {
          color: '#2563eb',
          weight: 2,
        },
      }).addTo(mapRef.current);

      const bounds = geoJsonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [16, 16] });
      }

      setStatus('GeoJSON yüklendi');
    } catch (error) {
      console.error('GeoJSON yüklenirken hata oluştu:', error);
      setStatus(`Hata: ${error.message}`);
    }
  };

  useEffect(() => {
    mapRef.current = L.map('map', {
      zoomControl: true,
    }).setView([39.0, 35.2], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap katkıcıları',
      maxZoom: 19,
    }).addTo(mapRef.current);

    fetchGeoJson();

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <div className="app">
      <div className="banner">
        `public/text.geojson` dosyasını buraya kopyalayın, sayfayı yenileyin ve haritada görün.
      </div>
      <div className="map-wrapper">
        <div id="map" aria-label="GeoJSON haritası" />
        <div className="status">{status}</div>
        <button className="reload-btn" type="button" onClick={fetchGeoJson}>
          GeoJSON'u Yenile
        </button>
      </div>
    </div>
  );
}

export default App;
