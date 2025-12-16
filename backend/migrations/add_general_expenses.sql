-- Migration: Genel Gider Modülü
-- Tarih: 2025-12-16
-- Açıklama: teacher_payments tablosuna genel gider desteği ekleniyor

-- 1. payment_type sütunu ekle (öğretmen maaşı veya genel gider)
ALTER TABLE teacher_payments
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'teacher_salary'
  CHECK (payment_type IN ('teacher_salary', 'general_expense'));

-- 2. Genel giderler için ek sütunlar
ALTER TABLE teacher_payments
ADD COLUMN IF NOT EXISTS expense_category VARCHAR(100),  -- Kira, Elektrik, Su, vb.
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),     -- Fatura numarası
ADD COLUMN IF NOT EXISTS vendor VARCHAR(200),            -- Tedarikçi/Firma adı
ADD COLUMN IF NOT EXISTS created_by INTEGER;             -- Kim oluşturdu

-- 3. Sütun açıklamaları ekle
COMMENT ON COLUMN teacher_payments.payment_type IS 'teacher_salary: Öğretmen maaşı, general_expense: Genel gider';
COMMENT ON COLUMN teacher_payments.expense_category IS 'Sadece general_expense için: Kira, Elektrik, Su, Malzeme, vb.';
COMMENT ON COLUMN teacher_payments.invoice_number IS 'Fatura numarası';
COMMENT ON COLUMN teacher_payments.vendor IS 'Tedarikçi veya firma adı';
COMMENT ON COLUMN teacher_payments.created_by IS 'Kaydı oluşturan kullanıcının ID si';

-- 4. Mevcut kayıtları güncelle (hepsi öğretmen maaşı olarak işaretle)
UPDATE teacher_payments
SET payment_type = 'teacher_salary'
WHERE payment_type IS NULL;
