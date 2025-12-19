import express from 'express';
import {
  getTasks,
  getTodayTasks,
  getTomorrowPreparations,
  createTask,
  updateTask,
  toggleTaskCompletion,
  deleteTask
} from '../controllers/taskController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(verifyToken);

// GET /api/tasks - Tüm görevleri getir (query params: date, type)
router.get('/', getTasks);

// GET /api/tasks/today - Bugünün görevlerini getir
router.get('/today', getTodayTasks);

// GET /api/tasks/tomorrow-preparations - Yarının hazırlıklarını getir
router.get('/tomorrow-preparations', getTomorrowPreparations);

// POST /api/tasks - Yeni görev oluştur
router.post('/', createTask);

// PUT /api/tasks/:id - Görevi güncelle
router.put('/:id', updateTask);

// PATCH /api/tasks/:id/toggle - Görev tamamlanma durumunu değiştir
router.patch('/:id/toggle', toggleTaskCompletion);

// DELETE /api/tasks/:id - Görevi sil
router.delete('/:id', deleteTask);

export default router;
