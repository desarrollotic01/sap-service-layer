const { Contacto, Cliente } = require("../db_connection");

/* =========================
   CREAR CONTACTO
========================= */
async function crearContacto(data) {
  return await Contacto.create(data);
}

/* =========================
   OBTENER CONTACTOS
========================= */
async function obtenerContactos() {
  return await Contacto.findAll({
    include: {
      model: Cliente,
      as: "cliente",
      attributes: ["id", "razonSocial"],
    },
    order: [["createdAt", "DESC"]],
  });
}

/* =========================
   CONTACTOS POR CLIENTE
========================= */
async function obtenerContactosPorCliente(clienteId) {
  return await Contacto.findAll({
    where: { clienteId, activo: true },
    order: [["nombre", "ASC"]],
  });
}

/* =========================
   OBTENER POR ID
========================= */
async function obtenerContactoPorId(id) {
  return await Contacto.findByPk(id, {
    include: {
      model: Cliente,
      as: "cliente",
      attributes: ["id", "razonSocial"],
    },
  });
}

/* =========================
   ACTUALIZAR
========================= */
async function actualizarContacto(id, data) {
  const contacto = await Contacto.findByPk(id);
  if (!contacto) return null;

  await contacto.update(data);
  return contacto;
}

/* =========================
   ELIMINAR (SOFT)
========================= */
async function eliminarContacto(id) {
  const contacto = await Contacto.findByPk(id);
  if (!contacto) return null;

  contacto.activo = false;
  await contacto.save();

  return true;
}

module.exports = {
  crearContacto,
  obtenerContactos,
  obtenerContactosPorCliente,
  obtenerContactoPorId,
  actualizarContacto,
  eliminarContacto,
};
