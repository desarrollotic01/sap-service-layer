const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  importarTrabajadores,
  importarEquipos,
  importarUbicaciones,
  generarPlantilla,
} = require("../controllers/importMasivoController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máx
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls");
    if (!ok) return cb(new Error("Solo se permiten archivos Excel (.xlsx)"));
    cb(null, true);
  },
});

/* ── Descargar plantilla ── */
router.get("/plantilla/:entidad", async (req, res) => {
  const { entidad } = req.params;
  if (!["trabajadores", "equipos", "ubicaciones"].includes(entidad)) {
    return res.status(400).json({ error: "Entidad no válida" });
  }
  try {
    const buffer = await generarPlantilla(entidad);
    const nombres = {
      trabajadores: "plantilla_trabajadores.xlsx",
      equipos: "plantilla_equipos.xlsx",
      ubicaciones: "plantilla_ubicaciones_tecnicas.xlsx",
    };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombres[entidad]}"`);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Importar trabajadores ── */
router.post("/trabajadores", upload.single("archivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Debes adjuntar un archivo Excel" });
  try {
    const result = await importarTrabajadores(req.file.buffer);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Importar equipos ── */
router.post("/equipos", upload.single("archivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Debes adjuntar un archivo Excel" });
  try {
    const result = await importarEquipos(req.file.buffer);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Importar ubicaciones técnicas ── */
router.post("/ubicaciones", upload.single("archivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Debes adjuntar un archivo Excel" });
  try {
    const result = await importarUbicaciones(req.file.buffer);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
