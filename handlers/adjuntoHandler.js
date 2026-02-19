const path = require("path");

async function procesarArchivos(files) {
  return files.map(file => ({
    nombre: file.originalname,
    url: `/uploads/adjuntos/${file.filename}`,
    tipo: path.extname(file.originalname).replace(".", "")
  }));
}

module.exports = {
  procesarArchivos,
};
