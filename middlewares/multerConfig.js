const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname,"../uploads/adjuntos");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadPath,

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

module.exports = upload;
