const {
  GetSapRubro,
  GetSapPaqueteTrabajo,
} = require("../controllers/sapCatalogoController");

// 🔥 Handler Rubros
async function handleGetSapRubro(req, res) {
  // aquí puedes validar auth, permisos, etc
  return await GetSapRubro(req, res);
}

// 🔥 Handler Paquetes
async function handleGetSapPaqueteTrabajo(req, res) {
  return await GetSapPaqueteTrabajo(req, res);
}

module.exports = {
  handleGetSapRubro,
  handleGetSapPaqueteTrabajo,
};