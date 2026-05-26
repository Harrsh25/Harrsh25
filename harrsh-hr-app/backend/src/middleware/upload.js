const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../../uploads', subdir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

const fileFilter = (allowed) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`File type .${ext} not allowed`), false);
};

const documentUpload = multer({
  storage: storage('documents'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
});

const selfieUpload = multer({
  storage: storage('selfies'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png']),
});

const receiptUpload = multer({
  storage: storage('receipts'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'pdf']),
});

module.exports = { documentUpload, selfieUpload, receiptUpload };
