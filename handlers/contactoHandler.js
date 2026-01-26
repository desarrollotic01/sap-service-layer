const contactosController = require("../controllers/contactoController");

/* =========================
   CREAR
========================= */
async function crearContactoHandler(req, res) {
  try {
    const { clienteId, nombre, correo } = req.body;

    if (!clienteId || !nombre || !correo) {
      return res.status(400).json({
        message: "clienteId, nombre y correo son obligatorios",
      });
    }

    const contacto = await contactosController.crearContacto(req.body);
    res.status(201).json(contacto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear contacto" });
  }
}

/* =========================
   LISTAR
========================= */
async function obtenerContactosHandler(req, res) {
  try {
    const contactos = await contactosController.obtenerContactos();
    res.json(contactos);
  } catch {
    res.status(500).json({ message: "Error al obtener contactos" });
  }
}

/* =========================
   POR CLIENTE
========================= */
async function obtenerContactosPorClienteHandler(req, res) {
  try {
    const contactos =
      await contactosController.obtenerContactosPorCliente(
        req.params.clienteId
      );

    res.json(contactos);
  } catch {
    res.status(500).json({
      message: "Error al obtener contactos del cliente",
    });
  }
}

/* =========================
   POR ID
========================= */
async function obtenerContactoPorIdHandler(req, res) {
   try {
    const { clienteId } = req.params;
    const contactos = await getContactosPorCliente(clienteId);
    res.json(contactos);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Error al obtener contactos del cliente",
    });
  }
};


/* =========================
   ACTUALIZAR
========================= */
async function actualizarContactoHandler(req, res) {
  try {
    const contacto =
      await contactosController.actualizarContacto(
        req.params.id,
        req.body
      );

    if (!contacto) {
      return res.status(404).json({ message: "Contacto no encontrado" });
    }

    res.json(contacto);
  } catch {
    res.status(500).json({ message: "Error al actualizar contacto" });
  }
}

/* =========================
   ELIMINAR (SOFT)
========================= */
async function eliminarContactoHandler(req, res) {
  try {
    const eliminado =
      await contactosController.eliminarContacto(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ message: "Contacto no encontrado" });
    }

    res.json({ message: "Contacto desactivado" });
  } catch {
    res.status(500).json({ message: "Error al eliminar contacto" });
  }
}

module.exports = {
  crearContactoHandler,
  obtenerContactosHandler,
  obtenerContactosPorClienteHandler,
  obtenerContactoPorIdHandler,
  actualizarContactoHandler,
  eliminarContactoHandler,
};
