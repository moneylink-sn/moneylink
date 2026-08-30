/**
 * MoneyLink — UploadController (Stockage Persistant d'Images dans PostgreSQL)
 * Sécurisé contre les fichiers malveillants, validé par Magic Bytes et persistant sur Render
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

// Types MIME autorisés
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

/**
 * Valide les Magic Bytes (signatures binaires de fichiers) pour détecter le vrai type de fichier
 */
function detectMimeTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export class UploadController {
  /**
   * Téléversement et stockage sécurisé d'une image (Logo marchand, Produit, Avatar)
   */
  static async uploadImage(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      let { data_base64, image, filename, mime_type } = req.body;

      const rawInput = data_base64 || image;
      if (!rawInput || typeof rawInput !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée d’image fournie. Veuillez sélectionner une image valide.'
        });
      }

      // Extraction du Base64 brut et détection du préfixe Data URI
      let cleanBase64 = rawInput;
      let declaredMime = mime_type || 'image/jpeg';

      if (rawInput.startsWith('data:')) {
        const matches = rawInput.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          declaredMime = matches[1].toLowerCase();
          cleanBase64 = matches[2];
        }
      }

      // Nettoyage des espaces
      cleanBase64 = cleanBase64.replace(/\s/g, '');

      // Conversion en buffer binaire
      const buffer = Buffer.from(cleanBase64, 'base64');
      const sizeBytes = buffer.length;

      // 1. Contrôle de la taille du fichier
      if (sizeBytes > MAX_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          error: `Image trop volumineuse (${(sizeBytes / (1024 * 1024)).toFixed(2)} Mo). La taille maximale autorisée est de 5 Mo.`
        });
      }

      if (sizeBytes < 100) {
        return res.status(400).json({
          success: false,
          error: 'Fichier image corrompu ou vide.'
        });
      }

      // 2. Contrôle strict de signature binaire (Magic Bytes)
      const detectedMime = detectMimeTypeFromBuffer(buffer);
      if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
        return res.status(400).json({
          success: false,
          error: 'Format d’image invalide ou non supporté. Formats acceptés : JPG, JPEG, PNG, WEBP.'
        });
      }

      // 3. Sécurité : Vérification anti-scripts / anti-exécutables dans le contenu
      const firstBytesString = buffer.slice(0, 1024).toString('ascii').toLowerCase();
      if (
        firstBytesString.includes('<script') ||
        firstBytesString.includes('<?php') ||
        firstBytesString.includes('eval(') ||
        firstBytesString.startsWith('mz') || // Windows Executable
        firstBytesString.startsWith('\x7felf') // Linux ELF
      ) {
        return res.status(400).json({
          success: false,
          error: 'Fichier non sécurisé rejeté.'
        });
      }

      const finalMime = detectedMime;
      const uploadId = uuidv4();
      const safeFilename = (filename || `image_${Date.now()}`)
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .substring(0, 100);
      const nowIso = new Date().toISOString();

      let uploadRecord = {
        id: uploadId,
        user_id: userId,
        filename: safeFilename,
        mime_type: finalMime,
        size_bytes: sizeBytes,
        data_base64: cleanBase64,
        created_at: nowIso
      };

      // 4. Enregistrement persistant dans PostgreSQL
      if (pool) {
        try {
          const insertRes = await query(`
            INSERT INTO media_uploads (
              id, user_id, filename, mime_type, size_bytes, data_base64, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, user_id, filename, mime_type, size_bytes, created_at;
          `, [uploadId, userId, safeFilename, finalMime, sizeBytes, cleanBase64]);

          if (insertRes?.rows?.length > 0) {
            uploadRecord = {
              ...uploadRecord,
              ...insertRes.rows[0]
            };
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 5. Miroir memoryStore
      if (!memoryStore.media_uploads) memoryStore.media_uploads = [];
      if (!memoryStore.media_uploads.some(m => m.id === uploadId)) {
        memoryStore.media_uploads.push(uploadRecord);
      }

      // URL d'accès publique absolue ou relative
      const publicUrl = `/api/uploads/${uploadId}`;

      return res.status(201).json({
        success: true,
        message: 'Image téléversée et enregistrée avec succès.',
        data: {
          id: uploadId,
          url: publicUrl,
          filename: safeFilename,
          mime_type: finalMime,
          size_bytes: sizeBytes,
          created_at: uploadRecord.created_at
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupération publique et service du flux binaire de l'image
   */
  static async getImageById(req, res, next) {
    try {
      const { id } = req.params;

      let upload = null;

      // 1. Recherche dans PostgreSQL
      if (pool) {
        try {
          const resDb = await query('SELECT * FROM media_uploads WHERE id = $1 LIMIT 1', [id]);
          if (resDb?.rows?.length > 0) {
            upload = resDb.rows[0];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 2. Fallback memoryStore
      if (!upload && memoryStore.media_uploads) {
        upload = memoryStore.media_uploads.find(m => m.id === id);
      }

      if (!upload || !upload.data_base64) {
        return res.status(404).json({
          success: false,
          error: 'Image introuvable ou supprimée.'
        });
      }

      const imgBuffer = Buffer.from(upload.data_base64, 'base64');

      // En-têtes HTTP de performance, interopérabilité et sécurité
      res.setHeader('Content-Type', upload.mime_type || 'image/jpeg');
      res.setHeader('Content-Length', imgBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Disposition', `inline; filename="${upload.filename || 'image'}"`);

      return res.end(imgBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Suppression d'une image téléversée
   */
  static async deleteImage(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      let existing = null;
      if (pool) {
        try {
          const resDb = await query('SELECT * FROM media_uploads WHERE id = $1 LIMIT 1', [id]);
          if (resDb?.rows?.length > 0) existing = resDb.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!existing && memoryStore.media_uploads) {
        existing = memoryStore.media_uploads.find(m => m.id === id);
      }

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Image introuvable.' });
      }

      if (existing.user_id && existing.user_id !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Accès non autorisé pour supprimer cette image.' });
      }

      if (pool) {
        try {
          await query('DELETE FROM media_uploads WHERE id = $1', [id]);
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (memoryStore.media_uploads) {
        const idx = memoryStore.media_uploads.findIndex(m => m.id === id);
        if (idx !== -1) memoryStore.media_uploads.splice(idx, 1);
      }

      return res.status(200).json({
        success: true,
        message: 'Image supprimée avec succès.'
      });
    } catch (err) {
      next(err);
    }
  }
}
