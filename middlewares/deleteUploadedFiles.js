const fs = require("fs");

const deleteUploadedFiles = (files = []) => {
  if (!Array.isArray(files) || files.length === 0) return;

  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error("Error eliminando archivo subido:", error.message);
    }
  }
};

module.exports = deleteUploadedFiles;