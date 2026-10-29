# 🌌 Nocturne - 3D Mekânsal Sinema & Gerçek Zamanlı Topluluk Uygulaması

Nocturne, Discord benzeri sunucu, kanal, rol, gerçek zamanlı sohbet ve ses sisteminin yanı sıra Three.js destekli ultra-gerçekçi 3D mekanlar (Onyx Grand IMAX Sinema Salonu, Cyber Kulüp, Skyline Çatı Katı) ve Cinema Mode ekran paylaşımı sunan full-stack bir web uygulamasıdır.

---

## 🚀 Yerel Kurulum & Çalıştırma (Local Setup)

Bu projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları takip edin:

### 1. Gereksinimler
- **Node.js** (v18 veya üzeri önerilir)
- **npm** (veya pnpm / yarn / bun)

### 2. Bağımlılıkları Yükleyin
Proje klasörünün içine girin ve terminalde çalıştırın:
```bash
npm install
```

### 3. Çevre Değişkenleri (.env)
Gerekirse kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayabilirsiniz:
```bash
cp .env.example .env
```

### 4. Geliştirme Sunucusunu Başlatın
Full-stack Express + Vite sunucusunu başlatmak için:
```bash
npm run dev
```
Sunucu başladığında tarayıcınızdan şu adrese gidin:
👉 **http://localhost:3000**

### 5. Canlıya Alma (Production Build)
Projeyi derleyip yayına hazır hale getirmek için:
```bash
npm run build
npm start
```

---

## 🌟 Ana Özellikler
- **🏛️ 3D Onyx Grand IMAX Sineması:**
  - 5 kademeli kavisli amfitiyatro tribünleri
  - Dinamik perde ambilight ışık yansıması (film sahnelerine göre salona yumuşak yansıyan ışık)
  - Buzlu cam korkuluklar ve VIP recline koltuklar
  - Koltuklara [E] tuşu veya tıklama ile oturabilme
- **🖥️ Cinema Mode Ekran Paylaşımı (Discord-free, Özel Lüks Tasarım):**
  - Gerçek zamanlı pencere/ekran/sekme paylaşımı
  - 4K Ultra HD & 1080p 60FPS kalitesi
  - Dolby Atmos / Cinema Audio (mekânsal ses simülasyonu)
  - Patlamış mısır (🍿), alkış (👏), kalp (❤️) altın parçacık animasyonlu canlı tepkiler
  - Canlı izleyici paneli (Cinema Audience • Live)
- **💬 Gerçek Zamanlı Sohbet:**
  - Anlık WebSocket mesajlaşma
  - Rol ve izin yönetimi (RBAC)
  - Dosya yükleme ve emoji reaksiyonları
- **🎧 Sesli Odalar & 3D Mekanlar:**
  - Gerçek 3D humanoid avatarlar, profil resmi (PP) vizörleri ve isim kartları
  - WASD / Yön tuşları veya fare ile tıklayarak yürüme
