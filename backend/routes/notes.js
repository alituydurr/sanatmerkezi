import express from 'express';
import { getNotes, getNoteById, createNote, updateNote, deleteNote, togglePinNote } from '../controllers/noteController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(verifyToken);

// GET /api/notes - Tüm notları getir
router.get('/', getNotes);

// GET /api/notes/:id - Tek bir notu getir
router.get('/:id', getNoteById);

// POST /api/notes - Yeni not oluştur
router.post('/', createNote);

// PUT /api/notes/:id - Notu güncelle
router.put('/:id', updateNote);

// DELETE /api/notes/:id - Notu sil
router.delete('/:id', deleteNote);

// PATCH /api/notes/:id/pin - Not sabitleme durumunu değiştir
router.patch('/:id/pin', togglePinNote);

export default router;
