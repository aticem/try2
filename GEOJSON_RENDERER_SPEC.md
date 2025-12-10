# GeoJSON Harita Renderer Spesifikasyonu

Bu döküman, Leaflet.js kullanarak GeoJSON dosyalarını performanslı bir şekilde render etme yöntemini, özellikle **Canvas-tabanlı text rendering** tekniğini detaylı olarak açıklar.

---

## 🎯 Amaç

- Binlerce GeoJSON feature'ı (polygon, line, point, text) **kasmadan** render etmek
- Text'lerin **AutoCAD/QGIS** gibi zoom ile orantılı büyüyüp küçülmesi (Map Units)
- Text'lerin masaların **uzun kenarına paralel** döndürülmesi
- Yüksek performans için **HTML DOM yerine Canvas** kullanımı

---

## 🛠 Teknoloji Stack

```json
{
  "framework": "React 18+",
  "map_library": "Leaflet 1.9+",
  "build_tool": "Vite",
  "render_mode": "Canvas (NOT SVG)"
}
```

---

## 📁 Dosya Yapısı

```
project/
├── public/
│   ├── fulll.geojson        # Polygon/LineString verileri (masalar)
│   └── string_text.geojson  # Point verileri (text'ler)
├── src/
│   ├── App.jsx              # Ana uygulama
│   ├── styles.css           # Stiller
│   └── main.jsx             # Entry point
└── package.json
```

---

## 🔧 Temel Kavramlar

### 1. Canvas Renderer (Performansın Anahtarı)

```javascript
// Global Canvas Renderer - TÜM layer'lar bu renderer'ı kullanmalı
const canvasRenderer = L.canvas({ padding: 0.5 });
```

**Neden Canvas?**
- DOM elementi oluşturmaz (4000 text = 4000 div yerine 1 canvas)
- GPU hızlandırmalı çizim
- Zoom/pan sırasında sadece pixel yeniden çizilir, DOM manipülasyonu yok

### 2. Map Units Ölçekleme (AutoCAD/QGIS Efekti)

```javascript
// Formül: fontSize = baseSize * 2^(currentZoom - referenceZoom)
const scale = Math.pow(2, zoom - refZoom);
const fontSize = textBaseSize * scale;
```

**Parametreler:**
- `textBaseSize`: Referans zoom'daki piksel boyutu (örn: 10, 20)
- `refZoom`: Bu zoom'da text tam `textBaseSize` piksel görünür (örn: 20, 22)
- Zoom arttıkça text büyür, azaldıkça küçülür

### 3. Text Rotation (Masa Kenarına Paralel)

```javascript
// LineString için en uzun segment'in açısını bul
for (let i = 0; i < coords.length - 1; i++) {
  const dx = coords[i+1][0] - coords[i][0];
  const dy = coords[i+1][1] - coords[i][1];
  const dist = Math.sqrt(dx*dx + dy*dy);
  
  if (dist > maxDist) {
    maxDist = dist;
    angle = Math.atan2(dy, dx) * 180 / Math.PI;
  }
}

// Baş aşağı olmaması için düzelt (-90 ile +90 arası)
if (angle > 90) angle -= 180;
if (angle < -90) angle += 180;
```

---

## 📝 Tam Kod Implementasyonu

### App.jsx

```jsx
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

// ═══════════════════════════════════════════════════════════════
// ÖZEL CANVAS TEXT LABEL SINIFI
// ═══════════════════════════════════════════════════════════════
// Bu sınıf Leaflet'in CircleMarker'ını extend eder ama
// circle çizmek yerine Canvas üzerine TEXT çizer.
// Avantaj: DOM elementi oluşturmaz, performanslı ve ölçeklenebilir

L.TextLabel = L.CircleMarker.extend({
  options: {
    text: '',           // Görüntülenecek metin
    textStyle: '300',   // Font weight: '300'=light, '400'=normal, '700'=bold
    textColor: '#333',  // Text rengi (hex veya rgba)
    textBaseSize: 10,   // Referans zoom'daki font boyutu (piksel)
    refZoom: 20,        // Referans zoom seviyesi
    rotation: 0,        // Derece cinsinden döndürme açısı
    interactive: false, // Tıklanabilirlik (false = performans artışı)
    radius: 0           // Circle görünmez (sadece text için)
  },

  _updatePath: function () {
    // Renderer ve context kontrolü
    if (!this._renderer || !this._renderer._ctx) return;
    
    const ctx = this._renderer._ctx;
    const p = this._point;  // Ekran koordinatı (piksel)
    const map = this._map;
    
    if (!map || !p) return;

    // ═══ MAP UNITS ÖLÇEKLEME ═══
    const zoom = map.getZoom();
    const scale = Math.pow(2, zoom - this.options.refZoom);
    const fontSize = this.options.textBaseSize * scale;

    // Çok küçükse çizme (performans optimizasyonu)
    if (fontSize < 1) return; 

    // ═══ CANVAS STATE KAYDET ═══
    ctx.save();
    
    // ═══ ROTATION UYGULA ═══
    const rotationRad = (this.options.rotation || 0) * Math.PI / 180;
    ctx.translate(p.x, p.y);
    ctx.rotate(rotationRad);

    // ═══ FONT AYARLARI ═══
    ctx.font = this.options.textStyle + ' ' + fontSize + 'px sans-serif';
    ctx.fillStyle = this.options.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ═══ BEYAZ STROKE (Okunabilirlik için) ═══
    ctx.lineWidth = fontSize / 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.strokeText(this.options.text, 0, 0);
    
    // ═══ TEXT ÇİZ ═══
    ctx.fillText(this.options.text, 0, 0);
    
    // ═══ CANVAS STATE GERİ YÜKLE ═══
    ctx.restore();
  }
});

// Factory fonksiyonu
L.textLabel = function (latlng, options) {
  return new L.TextLabel(latlng, options);
};

// ═══════════════════════════════════════════════════════════════
// GLOBAL CANVAS RENDERER
// ═══════════════════════════════════════════════════════════════
const canvasRenderer = L.canvas({ padding: 0.5 });

// ═══════════════════════════════════════════════════════════════
// GEOJSON DOSYALARI KONFİGÜRASYONU
// ═══════════════════════════════════════════════════════════════
const GEOJSON_FILES = [
  { 
    url: '/fulll.geojson',        // Dosya yolu
    name: 'fulll',                 // Tanımlayıcı isim
    color: '#2563eb',              // Stroke rengi
    fillColor: '#3b82f6'           // Fill rengi
  },
  { 
    url: '/string_text.geojson', 
    name: 'string_text', 
    color: '#dc2626', 
    fillColor: '#ef4444' 
  },
];

// ═══════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════

/**
 * LineString için en uzun kenarın açısını hesaplar
 * @param {Array} coords - [[lng, lat], [lng, lat], ...]
 * @returns {number} Derece cinsinden açı (-90 ile +90 arası)
 */
function calculateLineAngle(coords) {
  if (!coords || coords.length < 2) return 0;
  
  let maxDist = 0;
  let bestAngle = 0;
  
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i+1][0] - coords[i][0];
    const dy = coords[i+1][1] - coords[i][1];
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > maxDist) {
      maxDist = dist;
      bestAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    }
  }
  
  // Baş aşağı olmaması için düzelt
  if (bestAngle > 90) bestAngle -= 180;
  if (bestAngle < -90) bestAngle += 180;
  
  return bestAngle;
}

// ═══════════════════════════════════════════════════════════════
// ANA UYGULAMA
// ═══════════════════════════════════════════════════════════════
function App() {
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [status, setStatus] = useState('Harita başlatılıyor...');

  const fetchAllGeoJson = async () => {
    if (!mapRef.current) return;
    setStatus('Veriler yükleniyor...');

    // Önceki layer'ları temizle
    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];
    
    const allBounds = L.latLngBounds();
    let totalFeatures = 0;
    let textCount = 0;

    for (const file of GEOJSON_FILES) {
      try {
        const response = await fetch(file.url);
        if (!response.ok) continue;
        const data = await response.json();
        totalFeatures += data.features?.length || 0;

        const layer = L.geoJSON(data, {
          // ═══ PERFORMANS: Canvas renderer kullan ═══
          renderer: canvasRenderer,
          interactive: false,  // Tıklama/hover kapalı = FPS artışı
          
          // ═══ POLYGON/LINESTRING STİLİ ═══
          style: {
            color: file.color,
            weight: 1,
            fillColor: file.fillColor,
            fillOpacity: 0.4,
          },
          
          // ═══ POINT VERİLERİ İÇİN (string_text.geojson) ═══
          pointToLayer: (feature, latlng) => {
            if (feature.properties?.text) {
              textCount++;
              return L.textLabel(latlng, {
                text: feature.properties.text,
                renderer: canvasRenderer,
                textBaseSize: 8,    // Küçük boyut
                refZoom: 20,
                textStyle: '300',   // Light font
                textColor: '#444',
                rotation: feature.properties.angle || 0  // GeoJSON'dan açı
              });
            }
            // Text yoksa küçük nokta çiz
            return L.circleMarker(latlng, { 
              renderer: canvasRenderer, 
              radius: 2 
            });
          },
          
          // ═══ LINESTRING/POLYGON VERİLERİ İÇİN (fulll.geojson) ═══
          onEachFeature: (feature, featureLayer) => {
            // Sadece text property'si olan non-Point geometriler
            if (feature.properties?.text && feature.geometry.type !== 'Point') {
              
              // Merkez noktayı bul
              let center;
              if (typeof featureLayer.getBounds === 'function') {
                center = featureLayer.getBounds().getCenter();
              } else if (typeof featureLayer.getLatLng === 'function') {
                center = featureLayer.getLatLng();
              }
              
              // Açıyı hesapla (LineString için)
              let rotation = 0;
              if (feature.geometry.type === 'LineString') {
                rotation = calculateLineAngle(feature.geometry.coordinates);
              }

              if (center) {
                textCount++;
                const textMarker = L.textLabel(center, {
                  text: feature.properties.text,
                  renderer: canvasRenderer,
                  textBaseSize: 20,   // Polygon text'leri daha büyük
                  refZoom: 22,
                  textStyle: '300',
                  textColor: '#333',
                  rotation: rotation
                });
                textMarker.addTo(mapRef.current);
                layersRef.current.push(textMarker);
              }
            }
          }
        }).addTo(mapRef.current);
        
        layersRef.current.push(layer);
        if (layer.getBounds().isValid()) {
          allBounds.extend(layer.getBounds());
        }

      } catch (err) { 
        console.error('GeoJSON yüklenirken hata:', err); 
      }
    }

    // Tüm verilere fit et
    if (allBounds.isValid()) {
      mapRef.current.fitBounds(allBounds);
    }
    
    setStatus('Hazır: ' + totalFeatures + ' obje, ' + textCount + ' text (Canvas Mode)');
  };

  useEffect(() => {
    // ═══ HARİTA OLUŞTUR ═══
    mapRef.current = L.map('map', {
      zoomControl: true,
      preferCanvas: true,     // Önemli: Canvas tercih et
      zoomAnimation: true,
      markerZoomAnimation: true,
      fadeAnimation: false,   // Performans için kapalı
    }).setView([39, 35], 6);  // Varsayılan merkez (Türkiye)

    // ═══ TILE LAYER ═══
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 23,
      maxNativeZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapRef.current);

    // ═══ VERİLERİ YÜKLE ═══
    fetchAllGeoJson();

    // ═══ CLEANUP ═══
    return () => mapRef.current?.remove();
  }, []);

  return (
    <div className="app">
      <div className="map-wrapper">
        <div id="map" />
        <div className="status" style={{
          position: 'absolute', 
          top: 10, 
          left: 50, 
          zIndex: 999, 
          background: 'white', 
          padding: '5px 10px', 
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)', 
          fontWeight: 'bold'
        }}>
          {status}
        </div>
      </div>
    </div>
  );
}

export default App;
```

### styles.css

```css
:root {
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.map-wrapper {
  position: relative;
  flex: 1;
}

#map {
  height: 100vh;
  width: 100%;
  background: #e2e8f0;
}
```

---

## 📊 GeoJSON Veri Formatı

### fulll.geojson (Masalar - LineString/Polygon)

```json
{
  "type": "FeatureCollection",
  "crs": { 
    "type": "name", 
    "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } 
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "text": "TX2-INV17-STR13",
        "layer": "string_id",
        "fid": 12265
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-7.524448, 49.784809, 0.0],
          [-7.524406, 49.784792, 0.0]
        ]
      }
    }
  ]
}
```

### string_text.geojson (Text'ler - Point)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "text": "PANEL-001",
        "angle": 45
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-7.52, 49.78]
      }
    }
  ]
}
```

---

## ⚙️ Parametre Ayarları

| Parametre | Varsayılan | Açıklama |
|-----------|------------|----------|
| `textBaseSize` | 10-20 | Referans zoom'daki piksel boyutu. Küçük = text küçük |
| `refZoom` | 20-22 | Bu zoom'da text tam `textBaseSize` piksel görünür |
| `textStyle` | '300' | Font weight. '300'=light, '400'=normal, '700'=bold |
| `textColor` | '#333' | Text rengi. Koyu gri önerilir |
| `rotation` | 0 | Derece cinsinden döndürme (-90 ile +90) |

---

## 🚀 Performans İpuçları

1. **`interactive: false`**: Her layer'da kullan, tıklama/hover gereksizse
2. **`preferCanvas: true`**: Map oluştururken aktif et
3. **`fontSize < 1` kontrolü**: Çok küçük text'leri çizme
4. **Tek `canvasRenderer`**: Tüm layer'lar aynı renderer'ı paylaşmalı
5. **`fadeAnimation: false`**: Zoom animasyonlarında performans artışı

---

## 📋 Checklist (Yeni Projeye Uygularken)

- [ ] `L.TextLabel` sınıfını kopyala
- [ ] `L.textLabel` factory fonksiyonunu kopyala
- [ ] `canvasRenderer` global değişkenini oluştur
- [ ] `calculateLineAngle` fonksiyonunu kopyala (rotation için)
- [ ] GeoJSON dosyalarını `public/` klasörüne koy
- [ ] `GEOJSON_FILES` array'ini kendi dosyalarınla güncelle
- [ ] `pointToLayer` ve `onEachFeature` callback'lerini ayarla
- [ ] CSS'te `#map { height: 100vh; }` olduğundan emin ol

---

## 🔍 Hata Ayıklama

**Text görünmüyorsa:**
1. Console'da hata var mı kontrol et
2. `textBaseSize` çok küçük olabilir, artır
3. `refZoom` çok yüksek olabilir, düşür
4. GeoJSON'da `text` property'si var mı kontrol et

**Performans sorunu varsa:**
1. `interactive: false` her yerde var mı?
2. Tüm layer'lar aynı `canvasRenderer`'ı kullanıyor mu?
3. `preferCanvas: true` aktif mi?

---

*Bu spesifikasyon ile herhangi bir AI, aynı render sistemini başka bir projeye uygulayabilir.*
