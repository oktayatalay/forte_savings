-- Basit Test Verisi - Manuel phpMyAdmin için
-- Bu dosyayı phpMyAdmin'de fortetou_savings database'inde çalıştır

-- Önce admin kullanıcısının ID'sini kontrol et
SELECT id, email FROM users WHERE email = 'admin@fortetourism.com';

-- Test projesi 1
INSERT INTO projects (
    frn, entity, customer, project_name, event_type, project_type,
    group_in, group_out, location, hotels, po_amount,
    forte_responsible, project_director, forte_cc_person,
    client_representative, customer_po_number,
    hcp_count, colleague_count, external_non_hcp_count,
    created_by
) VALUES (
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
    1
);

-- Test projesi 2
INSERT INTO projects (
    frn, entity, customer, project_name, event_type, project_type,
    group_in, group_out, location, hotels, po_amount,
    forte_responsible, project_director, forte_cc_person,
    client_representative, customer_po_number,
    hcp_count, colleague_count, external_non_hcp_count,
    created_by
) VALUES (
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
    1
);

-- Test projesi 3
INSERT INTO projects (
    frn, entity, customer, project_name, event_type, project_type,
    group_in, group_out, location, hotels, po_amount,
    forte_responsible, project_director, forte_cc_person,
    client_representative, customer_po_number,
    hcp_count, colleague_count, external_non_hcp_count,
    created_by
) VALUES (
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
    1
);

-- Tasarruf kayıtları - Proje 1 için
INSERT INTO savings_records (project_id, date, type, explanation_category, explanation_custom, category, price, unit, currency, created_by) VALUES
(1, '2025-01-15', 'Savings', 'Hotel Cost Reduction', 'Grup rezervasyon indirimi ile oda fiyatlarında %15 tasarruf', 'Accommodation', 350.00, 85, 'TRY', 1),
(1, '2025-01-20', 'Cost Avoidance', 'Flight Cost Reduction', 'Erken rezervasyon ile uçak biletlerinde maliyet engelleme', 'Transportation', 280.00, 85, 'TRY', 1),
(1, '2025-02-01', 'Savings', 'Venue Cost Reduction', 'Salon kiralamada paket anlaşma ile %20 indirim', 'Venue', 450.00, 1, 'TRY', 1);

-- Tasarruf kayıtları - Proje 2 için  
INSERT INTO savings_records (project_id, date, type, explanation_category, explanation_custom, category, price, unit, currency, created_by) VALUES
(2, '2025-01-10', 'Savings', 'Hotel Cost Reduction', 'Sezon dışı rezervasyon avantajı', 'Accommodation', 420.00, 45, 'TRY', 1),
(2, '2025-01-25', 'Cost Avoidance', 'Catering Cost Reduction', 'Kendi catering ekibimiz ile dış hizmet maliyeti engellendi', 'Catering', 150.00, 45, 'TRY', 1);

-- Tasarruf kayıtları - Proje 3 için
INSERT INTO savings_records (project_id, date, type, explanation_category, explanation_custom, category, price, unit, currency, created_by) VALUES
(3, '2025-02-05', 'Savings', 'Transportation Cost Reduction', 'Transfer araçlarında toplu anlaşma indirimi', 'Transportation', 200.00, 32, 'TRY', 1),
(3, '2025-02-15', 'Savings', 'Material Cost Reduction', 'Kırtasiye ve materyallerde toplu alım indirimi', 'Materials', 75.00, 1, 'TRY', 1);

-- Projelerin toplam tasarruf miktarlarını güncelle
UPDATE projects SET total_savings = (
    SELECT COALESCE(SUM(price * unit), 0) 
    FROM savings_records 
    WHERE project_id = projects.id
) WHERE id IN (1, 2, 3);

-- Kontrol sorguları
SELECT 'Projeler:' as info;
SELECT id, frn, customer, project_name, total_savings FROM projects WHERE frn LIKE 'FRN-2025-%';

SELECT 'Tasarruf Kayıtları:' as info;
SELECT sr.id, p.frn, sr.type, sr.category, sr.price, sr.unit, (sr.price * sr.unit) as total 
FROM savings_records sr 
JOIN projects p ON sr.project_id = p.id 
WHERE p.frn LIKE 'FRN-2025-%';