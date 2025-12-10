# GeoJSON Harita Renderer

Leaflet.js kullanarak GeoJSON dosyalarını performanslı bir şekilde render eden React uygulaması. **Canvas-tabanlı text rendering** ile binlerce objeyi kasmadan gösterir.

---

## 🎯 Özellikler

- **Yüksek Performans**: Canvas renderer ile 4000+ obje kasmadan render
- **Map Units Ölçekleme**: Text'ler AutoCAD/QGIS gibi zoom ile orantılı büyür/küçülür
- **Çoklu GeoJSON**: Birden fazla GeoJSON dosyasını aynı anda yükler
- **Text Rendering**: Point ve LineString/Polygon üzerinde text gösterimi

---

## 🛠 Teknoloji Stack

- **React 18+**
- **Leaflet 1.9+**
- **Vite**
- **Canvas Renderer** (SVG değil)

---

## 📁 Dosya Yapısı

```
project/
├── public/
│   ├── fulll.geojson        # Polygon/LineString verileri
│   └── string_text.geojson  # Point verileri (text'ler)
├── src/
│   ├── App.jsx              # Ana uygulama
│   ├── styles.css           # Stiller
│   └── main.jsx             # Entry point
├── GEOJSON_RENDERER_SPEC.md # Detaylı teknik dokümantasyon
└── package.json
```

---

## 🚀 Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

---

## 🔧 Temel Kavramlar

### 1. Canvas Renderer

```javascript
const canvasRenderer = L.canvas({ padding: 0.5 });
```

Tüm layer'lar bu renderer'ı kullanır. DOM elementi oluşturmaz, performanslıdır.

### 2. Map Units Ölçekleme

```javascript
const scale = Math.pow(2, zoom - refZoom);
const fontSize = textBaseSize * scale;
```

- `textBaseSize`: Referans zoom'daki piksel boyutu
- `refZoom`: Referans zoom seviyesi

### 3. Özel TextLabel Sınıfı

```javascript
L.TextLabel = L.CircleMarker.extend({
  options: {
    text: '',
    textStyle: '300',    // Font weight
    textColor: '#333',   // Text rengi
    textBaseSize: 10,    // Referans boyut
    refZoom: 20,         // Referans zoom
    interactive: false
  },
  _updatePath: function () {
    // Canvas üzerine text çizer
  }
});
```

---

## 📊 GeoJSON Formatı

### LineString/Polygon (fulll.geojson)

```json
{
  "type": "Feature",
  "properties": {
    "text": "TX2-INV17-STR13"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [[-7.524, 49.784], [-7.524, 49.784]]
  }
}
```

### Point (string_text.geojson)

```json
{
  "type": "Feature",
  "properties": {
    "text": "PANEL-001"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-7.52, 49.78]
  }
}
```

---

## ⚙️ Parametre Ayarları

| Parametre | Varsayılan | Açıklama |
|-----------|------------|----------|
| `textBaseSize` | 10-20 | Referans zoom'daki piksel boyutu |
| `refZoom` | 20-22 | Referans zoom seviyesi |
| `textStyle` | '300' | Font weight ('300'=light, '700'=bold) |
| `textColor` | '#333' | Text rengi |

---

## 🚀 Performans İpuçları

1. **`interactive: false`**: Tıklama gereksizse her layer'da kullan
2. **`preferCanvas: true`**: Map oluştururken aktif et
3. **Tek `canvasRenderer`**: Tüm layer'lar aynı renderer'ı paylaşmalı
4. **`fontSize < 1` kontrolü**: Çok küçük text'leri çizme

---

## 📋 Yeni GeoJSON Ekleme

`GEOJSON_FILES` array'ine yeni dosya ekle:

```javascript
const GEOJSON_FILES = [
  { url: '/fulll.geojson', name: 'fulll', color: '#2563eb', fillColor: '#3b82f6' },
  { url: '/string_text.geojson', name: 'string_text', color: '#dc2626', fillColor: '#ef4444' },
  // Yeni dosya ekle:
  { url: '/yeni.geojson', name: 'yeni', color: '#10b981', fillColor: '#34d399' },
];
```

---

## 📖 Detaylı Dokümantasyon

Tam teknik spesifikasyon için: [GEOJSON_RENDERER_SPEC.md](./GEOJSON_RENDERER_SPEC.md)

---

## 📝 Lisans

MIT