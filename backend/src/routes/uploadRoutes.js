/**
 * MoneyLink — Routes Stockage d'Images & Médias (/api/upload & /api/uploads)
 */

import { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Route d'upload protégée par JWT
router.post('/upload', authenticateJWT, UploadController.uploadImage);

// Route publique de consultation des images
router.get('/uploads/:id', UploadController.getImageById);

// Route de suppression d'image protégée
router.delete('/uploads/:id', authenticateJWT, UploadController.deleteImage);

export default router;
