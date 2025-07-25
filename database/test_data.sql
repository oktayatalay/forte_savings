-- Test Verisi - Forte Savings
-- Bu dosya test amaçlı örnek proje ve tasarruf verilerini içerir

-- Test kullanıcısının ID'sini al (admin@fortetourism.com)
SET @admin_user_id = (SELECT id FROM users WHERE email = 'admin@fortetourism.com' LIMIT 1);

-- Test projeleri ekle
INSERT INTO projects (
    frn, entity, customer, project_name, event_type, project_type,
    group_in, group_out, location, hotels, po_amount,
    forte_responsible, project_director, forte_cc_person,
    client_representative, customer_po_number,
    hcp_count, colleague_count, external_non_hcp_count,
    created_by
) VALUES 
(
    'FRN-2025-001',
    'Forte Tourism',
    'AstraZeneca',
    'Global Pain Expert Summit 2025',
    'Conference',
    'Medical Congress',
    '2025-03-15',
    '2025-03-18',
    'Istanbul, Turkey - Ritz Carlton',
    'Ritz Carlton Istanbul, Hilton Istanbul Bomonti',
    125000.00,
    'Oktay Atalay',
    'Mehmet Demir',
    'Sarah Johnson',
    'Dr. Emily Watson',
    'AZ-2025-GPES-001',
    85,
    12,
    8,
    @admin_user_id
),
(
    'FRN-2025-002', 
    'Forte Tourism',
    'Pfizer Inc.',
    'Oncology Training Workshop',
    'Training',
    'Medical Workshop',
    '2025-02-20',
    '2025-02-22',
    'Antalya, Turkey - Rixos Premium',
    'Rixos Premium Belek, Kempinski Hotel The Dome',
    87500.00,
    'Ayşe Yılmaz',
    'Ali Özkan',
    'James Mitchell',
    'Dr. Michael Brown',
    'PF-2025-OTW-002',
    45,
    8,
    5,
    @admin_user_id
),
(
    'FRN-2025-003',
    'Forte Tourism', 
    'Novartis AG',
    'Cardiology Research Meeting',
    'Meeting',
    'Research Meeting',
    '2025-04-10',
    '2025-04-12',
    'Bodrum, Turkey - Mandarin Oriental',
    'Mandarin Oriental Bodrum, Kempinski Hotel Barbaros Bay',
    96750.00,
    'Cenk Acar',
    'Fatma Şen',
    'Anna Schmidt',
    'Prof. Dr. Klaus Weber',
    'NVS-2025-CRM-003',
    32,
    6,
    3,
    @admin_user_id
),
(
    'FRN-2025-004',
    'Forte Tourism',
    'Johnson & Johnson',
    'Surgical Innovation Symposium', 
    'Symposium',
    'Medical Symposium',
    '2025-05-05',
    '2025-05-07',
    'Cappadocia, Turkey - Museum Hotel',
    'Museum Hotel, Argos In Cappadocia',
    112300.00,
    'Murat Kaya',
    'Zeynep Arslan',
    'David Miller',
    'Dr. Jennifer Taylor',
    'JNJ-2025-SIS-004',
    68,
    10,
    7,
    @admin_user_id
);

-- Test tasarruf kayıtları ekle
INSERT INTO savings_records (
    project_id, date, type, explanation_category, explanation_custom,
    category, price, unit, currency, created_by
) VALUES
-- FRN-2025-001 için tasarruf kayıtları
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-001'),
    '2025-01-15',
    'Savings',
    'Hotel Cost Reduction',
    'Grup rezervasyon indirimi ile oda fiyatlarında %15 tasarruf sağlandı',
    'Accommodation',
    350.00,
    85,
    'TRY',
    @admin_user_id
),
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-001'),
    '2025-01-20',
    'Cost Avoidance',
    'Flight Cost Reduction', 
    'Erken rezervasyon ile uçak biletlerinde maliyet engelleme',
    'Transportation',
    280.00,
    85,
    'TRY',
    @admin_user_id
),
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-001'),
    '2025-02-01',
    'Savings',
    'Venue Cost Reduction',
    'Salon kiralamada paket anlaşma ile %20 indirim',
    'Venue',
    450.00,
    1,
    'TRY',
    @admin_user_id
),

-- FRN-2025-002 için tasarruf kayıtları
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-002'),
    '2025-01-10',
    'Savings',
    'Hotel Cost Reduction',
    'Sezon dışı rezervasyon avantajı',
    'Accommodation', 
    420.00,
    45,
    'TRY',
    @admin_user_id
),
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-002'),
    '2025-01-25',
    'Cost Avoidance',
    'Catering Cost Reduction',
    'Kendi catering ekibimiz ile dış hizmet maliyeti engellendi',
    'Catering',
    150.00,
    45,
    'TRY',
    @admin_user_id
),

-- FRN-2025-003 için tasarruf kayıtları  
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-003'),
    '2025-02-05',
    'Savings',
    'Transportation Cost Reduction',
    'Transfer araçlarında toplu anlaşma indirimi',
    'Transportation',
    200.00,
    32,
    'TRY',
    @admin_user_id
),
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-003'),
    '2025-02-15',
    'Savings',
    'Material Cost Reduction',
    'Kırtasiye ve materyallerde toplu alım indirimi',
    'Materials',
    75.00,
    1,
    'TRY',
    @admin_user_id
),

-- FRN-2025-004 için tasarruf kayıtları
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-004'),
    '2025-02-20',
    'Cost Avoidance',
    'Hotel Cost Reduction',
    'Erken rezervasyon ile yüksek sezon fiyat artışı engellendi',
    'Accommodation',
    500.00,
    68,
    'TRY',
    @admin_user_id
),
(
    (SELECT id FROM projects WHERE frn = 'FRN-2025-004'),
    '2025-03-01',
    'Savings',
    'Technology Cost Reduction',
    'AV ekipman kiralama yerine kendi ekipmanımız kullanıldı',
    'Technology',
    1200.00,
    1,
    'TRY',
    @admin_user_id
);

-- Projelerin toplam tasarruf miktarlarını güncelle
UPDATE projects SET total_savings = (
    SELECT COALESCE(SUM(total_price), 0) 
    FROM savings_records 
    WHERE project_id = projects.id
) WHERE id IN (
    SELECT id FROM projects WHERE frn IN (
        'FRN-2025-001', 'FRN-2025-002', 'FRN-2025-003', 'FRN-2025-004'
    )
);

-- Test için bir CC kullanıcısı ekle (opsiyonel)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
('test.user@fortetourism.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'User', 'user', TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Test kullanıcısını bir projenin CC'si yap
SET @test_user_id = (SELECT id FROM users WHERE email = 'test.user@fortetourism.com' LIMIT 1);
INSERT INTO project_permissions (project_id, user_id, permission_type) VALUES
((SELECT id FROM projects WHERE frn = 'FRN-2025-002'), @test_user_id, 'cc')
ON DUPLICATE KEY UPDATE permission_type = VALUES(permission_type);

-- Başarı mesajı
SELECT 
    'Test verisi başarıyla eklendi!' as message,
    (SELECT COUNT(*) FROM projects WHERE frn LIKE 'FRN-2025-%') as project_count,
    (SELECT COUNT(*) FROM savings_records WHERE project_id IN (
        SELECT id FROM projects WHERE frn LIKE 'FRN-2025-%'
    )) as savings_count;