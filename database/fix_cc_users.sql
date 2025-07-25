-- CC User'ları User'a Çevir
-- Bu script CC olarak ayarlanmış kullanıcıları user role'üne çevirir

-- Mevcut CC user'ları listele
SELECT id, email, role FROM users WHERE role = 'cc';

-- CC user'ları user'a çevir
UPDATE users SET role = 'user' WHERE role = 'cc';

-- Sonucu kontrol et
SELECT id, email, role FROM users;

-- Test user'ı kontrol et
SELECT id, email, role FROM users WHERE email = 'test.user@fortetourism.com';