## 📌 Proje: Forte Savings

Forte Tourism çalışanları için modern ve güvenli bir tasarruf takip sistemi.

---

### ✅ Teknolojiler

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **UI Kit**: Shadcn/UI
- **Backend**: PHP 8+, MySQL
- **Deployment**: GitHub Actions → FTP (Shared Hosting)

---

## 🚀 Özellik Yol Haritası (Features Roadmap)

### 🔁 Genel Kurallar (Her Zaman Uygulanır)

- Claude her tamamlanan işlem sonrası `docs/development_log.md` dosyasını güncellemek zorundadır.
- Tüm UI bileşenleri Shadcn/UI kullanılarak oluşturulmalıdır. Harici CSS veya UI kit kabul edilmez.
- Her geliştirmeden sonra temel güvenlik kontrolleri yapılmalıdır.
- Kullanılmayan dosyalar temizlenmeli, proje yapısı sade kalmalıdır.

---

### 🧱 Aşama 1: Kimlik Doğrulama & Erişim Kontrolü

- Sadece `@fortetourism.com` uzantılı e-postalara izin verilen kayıt sistemi
- Şifre sıfırlama (token + e-mail gönderimi)
- JWT token tabanlı authentication
- Rol bazlı kullanıcı yönetimi (`admin`, `user`, `cc`)
- API ve frontend route koruma için middleware uygulanması

---

### 📊 Aşama 2: Kullanıcı Ana Paneli (Dashboard)

- Kullanıcının kendi oluşturduğu ve CC olarak eklendiği projelerin listesi
- Tablo sütunları: FRN, Planner, Date, Total Savings
- Responsive arayüz + Light/Dark mode uyumu
- Dil seçeneği: Türkçe/İngilizce

---

### 🔎 Aşama 3: Proje Detay Sayfası

- Proje bilgileri:

  - Entity
  - Customer
  - Project Name
  - Event Type
  - Project Type
  - Group In
  - Group Out
  - Location
  - Hotels
  - PO Amount
  - FRN
  - Forte Responsible
  - Project Director
  - Forte CC Person
  - Client Representative
  - Customer PO Number
  - HCP Count
  - Colleague Count
  - External Non-HCP Count
  - Total Savings

- Alt tablo: Cost Avoidance & Savings tablosu

  - Alanlar: Date, Type (Cost Avoidance/Savings), Explanation (select + custom), Category, Price, Unit, Currency, Total Price
  - Total Price = Price × Unit olarak sistemce otomatik hesaplanmalı

---

### ➕ Aşama 4: Proje Yönetimi

- Yeni proje oluşturma formu: Yukarıda sayılan tüm proje detaylarını kapsayacak
- Sadece proje sahibi ve CC’ler proje bilgilerini düzenleyebilir/silebilir
- Altına Savings veya Cost Avoidance ekleyebilme
- Explanation alanında "selectbox + custom input" özelliği
- Category alanı "selectbox" üzerinden seçilmeli

---

### 🛠️ Aşama 5: Admin Paneli

- Girişte genel istatistiklerin bulunduğu bir dashboard
- Kullanıcı yönetimi: görüntüle, düzenle, sil
- Proje yönetimi: tüm projelere erişim, düzenleme yetkisi
- Proje altındaki tüm kayıtları düzenleyebilme yetkisi
- Yeni Program Type, Explanation, Category tanımlama ve silme yetkisi

#### 📈 Raporlama Sistemi

- Filtreleme seçenekleri:

  - Entity, Customer, Project Name, Event Type, Project Type
  - FRN, Forte Responsible, Project Director, Forte CC Person, Client Representative
  - Group In / Group Out aralığı, Oluşturulma tarihi
  - HCP Count, Colleague Count, External Non-HCP Count
  - Location, Hotels, PO Amount, Customer PO Number
  - Kategori, Explanation, Type (Cost Avoidance/Savings)

- Excel (XLSX) çıktısı olarak dışa aktarım

- Bar ve pie chart grafik desteği (isteğe bağlı)

#### 📝 Audit Log

- Kim, ne zaman, hangi işlemi yaptı bilgisini izleyen sistem

#### 📤 PDF Export

- Proje detaylarını ya da tabloyu PDF olarak dışa aktarabilme

---

### 🧪 Aşama 6: Test ve Güvenlik Sertleştirmesi

- Tüm akışlar için manuel test senaryoları yazılması
- Form doğrulama ve veri sanitizasyonu (hem frontend hem backend)
- SQL Injection, XSS, CSRF gibi güvenlik tehditlerine karşı önlemler
- GitHub Actions ortam değişkenlerinin kontrolü
- (Opsiyonel) Deploy sonrası webhook ile bildirim

---

## 📁 Geliştirme Günlüğü Dosyası (Claude Tarafından Tutulacak)

Konum: `docs/development_log.md`

Bu Markdown dosyası **her özellik, düzeltme veya temizlik sonrası** güncellenmelidir.

Örnek:

```md
### 24 Temmuz 2025
- Login ve Register ekranları geliştirildi
- @fortetourism.com mail kontrolü eklendi
- JWT ile kimlik doğrulama sağlandı
- Shadcn/ui form bileşenleri kullanıldı
```

---

## 🧠 Claude Kullanım Talimatı

Claude, bu projede aşağıdaki adımları dikkatlice takip etmelidir:

### 🔹 Yol Haritası Kullanımı

- Bu dosya (roadmap.md), geliştirme sürecinde hangi adımdayız görmek için kullanılır.
- Yeni bir özellik geliştirileceğinde önce ilgili bölümü kontrol et.

### 🔹 development\_log.md Yönetimi

- Her geliştirmeden sonra `docs/development_log.md` dosyasına işlenen işlemleri yaz:
  - Tarih
  - Neler yapıldı (özellikle UI ve backend ayrı yazılmalı)
  - Güvenlik kontrolü yapıldı mı?
  - Gereksiz dosyalar silindi mi?

### 🔹 UI Standartları

- Sadece Shadcn/UI bileşenleri kullan
- Özel CSS yazma ya da harici UI kütüphaneleri ekleme

### 🔹 Güvenlik Kontrolü

- Formlarda validasyon
- API endpointlerde yetkilendirme kontrolü (JWT + Role based)
- SQL injection, XSS, CSRF gibi tehditlere karşı koruma

### 🔹 Kod Temizliği

- Kullanılmayan bileşen, sayfa ve scriptleri sil
- Kod yapısını sade tut, klasör hiyerarşisine dikkat et

### 🔹 Deployment

- GitHub’a yapılan her push sonrasında sistem FTP’ye otomatik deploy olur
- Claude bu durumda deployment sonrası kontrol adımlarını gerçekleştirmeli (örn: dosya temizliği)

Lütfen bu şablona ve çalışma sistemine sadık kalarak projeyi ilerlet.

