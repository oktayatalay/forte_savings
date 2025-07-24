# Forte Savings - Tasarruf Yönetim Sistemi

Modern, kullanıcı dostu tasarruf yönetim sistemi.

## Özellikler

- 🌓 Dark/Light mode desteği
- 🌍 Çoklu dil desteği (Türkçe/İngilizce)
- 🎨 Shadcn/ui ile modern tasarım
- 📱 Responsive tasarım
- 🔒 Güvenli API endpoints
- 📊 Tasarruf takibi ve raporlama

## Teknolojiler

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **UI Library**: Shadcn/ui
- **Backend**: PHP 8+, MySQL
- **Deployment**: GitHub Actions, FTP

## Kurulum

1. **Repository'yi klonlayın:**
```bash
git clone https://github.com/oktayatalay/forte-savings.git
cd forte-savings
```

2. **Dependencies'leri yükleyin:**
```bash
npm install
```

3. **Environment dosyasını oluşturun:**
```bash
cp .env.example .env
```

4. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

## Deployment

GitHub Actions otomatik deployment kullanır:

1. GitHub repository secrets'larını ekleyin:
   - `FTP_SERVER`
   - `FTP_USERNAME` 
   - `FTP_PASSWORD`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASS`
   - Diğer gerekli secrets

2. `master` branch'e push yapın
3. GitHub Actions otomatik olarak deployment'ı başlatır

## API Endpoints

- `/api/test/database.php` - Database bağlantı testi
- `/api/test/system.php` - Sistem bilgileri

## Geliştirme

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Lint kontrolü
npm run lint
```

## Katkı

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

Bu proje özel lisans altındadır.