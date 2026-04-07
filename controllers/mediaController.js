const path = require('path');
const fs = require('fs');
const db = require('../models/db');
const multer = require('multer');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|pdf|zip|mp4|mp3|txt|json/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error(`File type .${ext} not allowed`));
  }
});

function getMedia(req, res) {
  try {
    const media = db.prepare(`
      SELECT m.*, u.name as uploader_name
      FROM media m LEFT JOIN users u ON m.uploaded_by = u.id
      ORDER BY m.uploaded_at DESC
    `).all();
    res.json({ media });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load media' });
  }
}

function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = db.prepare(`
      INSERT INTO media (filename, original_name, mime_type, size, uploaded_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id);

    res.status(201).json({
      message: 'File uploaded',
      file: {
        id: result.lastInsertRowid,
        filename: req.file.filename,
        original_name: req.file.originalname,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save file record' });
  }
}

function deleteFile(req, res) {
  const { id } = req.params;
  try {
    const file = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(uploadDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM media WHERE id = ?').run(id);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
}

module.exports = { upload, getMedia, uploadFile, deleteFile };
