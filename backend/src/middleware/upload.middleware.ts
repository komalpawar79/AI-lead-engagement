import multer from 'multer';
import path from 'path';

// Memory storage so files are processed directly in buffers without orphan temp files
const storage = multer.memoryStorage();

export const uploadExcel = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are supported'));
    }
  },
});

