const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeFileName = (name = "") => {
  return String(name)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
};

const getExtension = (file = {}) => {
  const original = file.originalname || "";
  const ext = path.extname(original);
  if (ext) return ext.toLowerCase();

  const mime = file.mimetype || "";
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };

  return map[mime] || ".bin";
};

const saveUploadedFile = ({ file, folder = "notificaciones" }) => {
  if (!file || !file.buffer) {
    throw new Error("Archivo inválido: falta buffer");
  }

  const uploadsRoot = path.join(process.cwd(), "uploads");
  const targetDir = path.join(uploadsRoot, folder);

  ensureDir(targetDir);

  const ext = getExtension(file);
  const originalSafe = sanitizeFileName(
    path.basename(file.originalname || "archivo", path.extname(file.originalname || ""))
  );

  const uniqueName = `${Date.now()}_${crypto.randomUUID()}_${originalSafe}${ext}`;
  const absolutePath = path.join(targetDir, uniqueName);

  fs.writeFileSync(absolutePath, file.buffer);

  return {
    nombre: file.originalname || uniqueName,
    nombreGuardado: uniqueName,
    url: `/uploads/${folder}/${uniqueName}`,
    rutaAbsoluta: absolutePath,
    extension: ext.replace(".", "").toLowerCase(),
    mimeType: file.mimetype || null,
    size: file.size || null,
  };
};

const fileToBase64DataUrl = (relativeUrl) => {
  if (!relativeUrl) return null;

  const clean = String(relativeUrl).replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), clean);

  if (!fs.existsSync(absolutePath)) return null;

  const ext = path.extname(absolutePath).toLowerCase();
  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };

  const mime = mimeMap[ext] || "application/octet-stream";
  const fileBuffer = fs.readFileSync(absolutePath);
  const base64 = fileBuffer.toString("base64");

  return `data:${mime};base64,${base64}`;
};

module.exports = {
  ensureDir,
  saveUploadedFile,
  fileToBase64DataUrl,
};