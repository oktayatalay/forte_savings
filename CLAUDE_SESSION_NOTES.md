# 🤖 Claude Session Notes - Forte Savings Project

*Bu dosya Claude Code session'larının devamlılığı için oluşturulmuştur. Her session'da bu dosyayı okuyarak projenin mevcut durumunu anlayabilirsiniz.*

---

## 📊 **Mevcut Durum (25 Temmuz 2025)**

### ✅ **Tamamlanan Aşamalar**

#### **Aşama 1: Kimlik Doğrulama & Erişim Kontrolü** - ✅ TAMAMLANDI

#### **Aşama 2: Kullanıcı Ana Paneli - Proje Listesi** - ✅ TAMAMLANDI

#### **Aşama 3: Proje Detay Sayfası** - ✅ TAMAMLANDI

#### **Aşama 4: Tasarruf Kaydı Yönetimi** - 🔄 DEVAM EDİYOR
- **Veritabanı Şeması**: Roadmap'e uygun olarak güncellendi
- **Authentication API Endpoints**:
  - `/api/auth/register.php` - Kullanıcı kaydı (@fortetourism.com zorunlu)
  - `/api/auth/login.php` - JWT tabanlı giriş
  - `/api/auth/verify-email.php` - Email doğrulama
  - `/api/auth/reset-password.php` - Şifre sıfırlama (token based)
  - `/api/auth/middleware.php` - JWT doğrulama ve yetkilendirme
- **Frontend Authentication Sayfaları**:
  - `/auth/login` - Giriş sayfası
  - `/auth/register` - Kayıt sayfası  
  - `/auth/forgot-password` - Şifremi unuttum
  - `/auth/reset-password` - Şifre sıfırlama (URL token desteği)
- **Email Sistemi**: PHPMailer ile SMTP entegrasyonu, forte_crm'deki çalışan yapı kullanıldı
- **Dashboard**: Temel kullanıcı paneli oluşturuldu
- **Güvenlik**: Rol bazlı erişim (admin, user, cc), audit logging
- **Test Durumu**: ✅ Çalışıyor

- **Proje Listesi API**: `/api/projects/list-simple.php` - JWT korumalı, tam özellikli
- **Proje Tablosu Frontend**: Dashboard'a entegre edilen responsive tablo komponenti
- **Test Verisi**: 3 proje (AstraZeneca, Pfizer, Novartis) + tasarruf kayıtları
- **Özellikler**:
  - Kullanıcının sahip olduğu + CC olduğu projeleri listeler
  - FRN, müşteri, proje adı, sorumlu, direktör ile arama yapılabilir
  - Tüm sütunlar sıralanabilir (FRN, müşteri, sorumlu, tarih, tasarruf vb.)
  - Sayfalama desteği (10 kayıt/sayfa)
  - Kullanıcı yetkisi badge'i (Admin/Sahip/CC/Görüntüleyici)
  - Responsive tasarım
  - Gerçek zamanlı search (500ms debounce)
  - Tarih formatlaması (dd.mm.yyyy)
  - Para birimi formatlaması (₺ TRY)

- **Proje Detay API**: `/api/projects/detail.php` - JWT korumalı, tam detay
- **Proje Detay Frontend**: `/dashboard/projects/[id]` - Responsive detay sayfası
- **Özellikler**:
  - Proje erişim kontrolü (sahip/CC check ile güvenlik)
  - Komple proje bilgileri görüntüleme
  - Tasarruf kayıtları tablosu (tarih, tür, kategori, tutar)
  - Otomatik istatistik hesaplama (toplam tasarruf, maliyet engelleme)
  - Proje ekibi listesi (CC kişiler)
  - Kullanıcı yetki badge'i (Admin/Sahip/CC/Görüntüleyici)
  - Navigation breadcrumbs
  - Çalışan "Detay" butonları proje listesinde

- **Tasarruf Kaydı Ekleme API**: `/api/savings/create.php` - JWT korumalı, tam validation
- **Tasarruf Kaydı Ekleme Modal**: Responsive form komponenti
- **Özellikler**:
  - Otomatik total_price hesaplama (price × unit)
  - Multi-currency desteği (TRY, USD, EUR, GBP)
  - Kategori ve açıklama seçenekleri (dropdown)
  - Real-time validation (frontend + backend)
  - Permission-based erişim (admin/owner/cc)
  - Başarılı ekleme sonrası otomatik liste ve istatistik güncelleme
  - Modal form UI komponenti (Dialog, Select, Textarea)
  - Proje detay sayfasına entegre "Yeni Kayıt Ekle" butonu

#### **Aşama 0.5: Temel Kurulum** - ✅ TAMAMLANDI  
- Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI kurulumu
- GitHub Actions deployment sistemi (FTP ile savings.forte.works)
- Temel proje yapısı ve theme sistemi (dark/light mode)

### 🔧 **Teknik Detaylar**

#### **Veritabanı**
- **Sunucu**: `fortetou_savings` (MySQL 8.1.32)
- **Ana Tablolar**: users, projects, project_permissions, savings_records, audit_logs
- **Admin Hesabı**: `admin@fortetourism.com` / `admin123`
- **JWT_SECRET**: Veritabanında sistem ayarlarında mevcut

#### **Deployment**
- **Domain**: https://savings.forte.works
- **GitHub Repository**: https://github.com/oktayatalay/forte_savings
- **Auto Deploy**: GitHub Actions ile master branch push'larında
- **Environment**: Production secrets GitHub'da ayarlı

#### **Dosya Yapısı**
```
forte_savings/
├── api/                          # PHP Backend
│   ├── auth/                     # Authentication endpoints
│   ├── config/                   # Database config
│   └── test/                     # Test endpoints
├── database/                     # SQL şemaları
├── src/                          # Next.js Frontend
│   ├── app/                      # App Router sayfaları
│   ├── components/               # UI components
│   └── lib/                      # Utilities
├── docs/                         # Development log
└── forte_savings_roadmap.md      # Proje roadmap'i
```

---

## 🚀 **Sonraki Aşamalar (Öncelik Sırasına Göre)**

### **ŞU ANDA YAPILACAK: Aşama 4 - Tasarruf Kaydı Yönetimi**

#### **Öncelik 1: CRITICAL BUG FIX - Generated Column Hatası**
- 🚨 API'deki total_price field'ını kaldır (generated column çakışması)
- Database schema kontrolü yap
- Test et ve düzelt

#### **Öncelik 2: Tasarruf Kaydı CRUD Tamamlama**
- Kayıt düzenleme/silme işlemleri
- Dashboard Quick Stats entegrasyonu

#### **Öncelik 3: Dashboard Quick Stats Entegrasyonu**
- API'den gerçek proje sayıları çek
- Toplam tasarruf miktarı hesapla
- Son aktiviteler listesi

### **Sonraki Aşamalar**

#### **Aşama 5: Proje Yönetimi**
- Yeni proje oluşturma (tüm detaylarla)
- Proje düzenleme/silme yetkileri
- CC kişi atama sistemi

#### **Aşama 6: Admin Paneli**
- Admin dashboard
- Kullanıcı yönetimi
- Kategori yönetimi
- Raporlama ve Excel export

#### **Aşama 7: Test ve Güvenlik**
- Güvenlik testleri
- Performance optimizasyonu

---

## 🔍 **Bilinen Sorunlar ve Çözümler**

### **Çözülen Sorunlar**
- ✅ JWT_SECRET konfigürasyonu sorunu → GitHub secrets senkronize edildi
- ✅ Email verification manuel süreci → SQL ile test edilebilir
- ✅ Admin şifre hash problemi → Düzeltildi
- ✅ Dashboard 404 hatası → Sayfa oluşturuldu
- ✅ Forgot password eksikliği → Tamamlandı
- ✅ Email sistemi entegrasyonu → SMTP ile mail gönderimi eklendi
- ✅ SMTP bağlantı hatası → PHPMailer ile çözüldü (forte_crm yapısı kullanıldı)
- ✅ Şifre sıfırlama token hatası → Çözüldü (kullanıcı bildirimi)
- ✅ Authorization header sorunu → Çoklu yöntemle header okuma, FastCGI desteği
- ✅ Frontend response parsing hatası → Pagination optional yapıldı
- ✅ Ana API list.php 500 hatası → SQL parameter binding sorunu, list-simple.php kullanılıyor
- ✅ Search SQLSTATE[HY093] hatası → SQL'de :search 5 kez kullanımı, :search1-5 olarak düzeltildi
- ✅ Invalid Date sorunu → Tarih formatı kontrolü eklendi
- ✅ Admin permission badge hatası → Admin için özel turuncu badge
- ✅ Non-admin user search SQLSTATE[HY093] hatası → Parameter binding düzeltildi (:user_id/:user_id2)
- ✅ CC user role mantık hatası → Database schema değiştirildi, middleware güncellendi

### **Aktif Sorunlar**
- 🚨 **CRITICAL**: SQLSTATE[HY000]: General error: 3105 The value specified for generated column 'total_price' in table 'savings_records' is not allowed
  - Veritabanında total_price GENERATED COLUMN olarak tanımlanmış ama API'de manuel değer vermeye çalışıyoruz
  - Çözüm: API'den total_price field'ını kaldırıp sadece price ve unit göndermek gerekiyor

### **Mevcut Sınırlamalar**
- Ana API list.php'de 500 hatası (complex query problemi)
- Admin paneli henüz geliştirilmedi
- Filtreleme özellikleri eksik (müşteri, sorumlu, tarih aralığı dropdown'ları)
- Tasarruf kaydı ekleme/düzenleme formu yok
- Dashboard'daki istatistikler henüz gerçek verilerle entegre değil

---

## 🧭 **Claude İçin Yol Tarifi**

### **Session Başlangıcında Yapılacaklar**
1. `forte_savings_roadmap.md` dosyasını oku
2. `docs/development_log.md` dosyasını kontrol et
3. Mevcut branch durumunu kontrol et: `git status`
4. Son commit'leri incele: `git log --oneline -5`

### **⚠️ CRITICAL: UNUTMA KURALI - User Uyarısı**
- **User, her önemli değişiklikten sonra bu CLAUDE_SESSION_NOTES.md dosyasını güncellemeyi unutmamanı özellikle belirtti**
- **Bu dosyayı güncellemek ZORUNLU - unutma!**
- **Her commit sonrasında bu dosyada neler yaptığını logla**

### **Geliştirmeye Devam Ederken**
1. Her zaman roadmap'e uygun ilerle
2. **🚨 Her önemli değişiklikten sonra bu CLAUDE_SESSION_NOTES.md dosyasını güncelle**
3. Shadcn/UI dışında UI kütüphanesi kullanma
4. Güvenlik kontrollerini ihmal etme
5. Her aşama sonunda commit yap

### **Commit Öncesi Zorunlu Kontrol Listesi**
- [ ] **ÖNEMLİ:** `npm run build` komutu çalıştırılmış ve başarılı mı?
- [ ] `CLAUDE_SESSION_NOTES.md` dosyası güncellenmiş mi?
- [ ] Mevcut durum ve son işlemler eklenmiş mi?  
- [ ] Sonraki adımlar listesi güncel mi?
- [ ] Bilinen sorunlar bölümü güncellenmiş mi?
- [ ] Son güncelleme bölümündeki tarih ve commit ID'si doğru mu?

### **Build Test Kuralı**
**Her commit öncesi MUTLAKA şunu çalıştır:**
```bash
npm run build
```
Eğer build başarısız olursa, hataları düzelt ve tekrar test et. Sadece build başarılı olduktan sonra commit yap. Bu sayede GitHub Actions deployment'ında hata almayız.

### **Test Edilecek URL'ler**
- Ana sayfa: https://savings.forte.works
- Giriş: https://savings.forte.works/auth/login
- Dashboard: https://savings.forte.works/dashboard
- API test: https://savings.forte.works/api/test/system.php

### **Veritabanı Erişimi**
- phpMyAdmin: https://thor.dal.net.tr:2083/cpsess8729131982/3rdparty/phpMyAdmin/
- Database: `fortetou_savings`
- Test kullanıcısı: `admin@fortetourism.com` / `admin123`

---

## 📝 **Son Güncelleme**

**Tarih**: 25 Temmuz 2025  
**Son İşlem**: Tasarruf kaydı ekleme özelliği tamamlandı + CRITICAL BUG keşfedildi  
**Sonraki Adım**: Generated column hatası düzeltmesi (PRIORITY 1)  
**Commit ID**: 4a749c4 (Savings record creation)  
**Not**: ⚠️ SQLSTATE[HY000]: General error: 3105 - total_price generated column sorunu var!

---

*Bu dosyayı her önemli değişiklikten sonra güncellemeyi unutma!*