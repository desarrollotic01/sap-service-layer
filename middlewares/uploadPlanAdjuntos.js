const multer = require("multer");
const path = require("path");
const fs = require("fs");

const BASE_UPLOAD_DIR =
  process.env.PLANES_UPLOAD_DIR || "/var/www/miapp_storage/uploads/planes";

if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, BASE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const uploadPlanAdjuntos = multer({ storage });

module.exports = uploadPlanAdjuntos;