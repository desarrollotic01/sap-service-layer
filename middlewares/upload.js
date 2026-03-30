const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "documentos") {
      cb(null, "uploads/adjuntos/");
    } else if (file.fieldname === "documentoFinal") {
      cb(null, "uploads/final/");
    }
  },
  filename: (req, file, cb) => {
    const nombre = Date.now() + "-" + file.originalname;
    cb(null, nombre);
  },
});

const upload = multer({ storage });

module.exports = upload;