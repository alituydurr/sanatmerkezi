-- ============================================
-- NOTES TABLE (Notlar Sistemi)
-- ============================================
-- Şifreler ve önemli bilgileri saklamak için
-- ============================================

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#FFE066',
  category VARCHAR(100),
  is_pinned BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Comments
COMMENT ON TABLE notes IS 'Şifreler ve önemli bilgileri saklamak için notlar sistemi';
COMMENT ON COLUMN notes.color IS 'Not rengi (hex format)';
COMMENT ON COLUMN notes.is_pinned IS 'Sabitlenmiş notlar en üstte gösterilir';
COMMENT ON COLUMN notes.is_encrypted IS 'Gelecekte şifreleme özelliği için';
COMMENT ON COLUMN notes.category IS 'Not kategorisi (Şifreler, Önemli Bilgiler, vb.)';

-- ============================================
-- MİGRATİON TAMAMLANDI
-- ============================================
