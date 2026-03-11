const { Encuesta } = require("../db_connection");
const {
  createEncuesta,
  getEncuestaBySlug,
  getAllEncuestas,
  updateEncuesta,
  responderEncuesta,
} = require("../controllers/encuestaController");

const TIPOS_VALIDOS = [
  "TEXTO",
  "TEXTAREA",
  "OPCION_UNICA",
  "OPCION_MULTIPLE",
  "NUMERO",
  "FECHA",
];

const TIPOS_CON_OPCIONES = ["OPCION_UNICA", "OPCION_MULTIPLE"];

const validarPreguntas = (preguntas) => {
  if (!Array.isArray(preguntas)) {
    return "El campo 'preguntas' debe ser un arreglo.";
  }

  if (preguntas.length === 0) {
    return "Debe enviar al menos una pregunta.";
  }

  const textosPreguntas = new Set();
  const ordenesPreguntas = new Set();

  for (let i = 0; i < preguntas.length; i++) {
    const pregunta = preguntas[i];
    const posicion = i + 1;

    if (!pregunta || typeof pregunta !== "object" || Array.isArray(pregunta)) {
      return `La pregunta en la posición ${posicion} no tiene un formato válido.`;
    }

    const {
      textoPregunta,
      tipoPregunta,
      orden,
      requerida,
      activa,
      opciones,
    } = pregunta;

    if (!textoPregunta || typeof textoPregunta !== "string" || !textoPregunta.trim()) {
      return `La pregunta en la posición ${posicion} debe tener un 'textoPregunta' válido.`;
    }

    if (textosPreguntas.has(textoPregunta.trim().toLowerCase())) {
      return `La pregunta '${textoPregunta.trim()}' está repetida.`;
    }
    textosPreguntas.add(textoPregunta.trim().toLowerCase());

    if (!tipoPregunta || !TIPOS_VALIDOS.includes(tipoPregunta)) {
      return `El tipo de pregunta de '${textoPregunta.trim()}' no es válido.`;
    }

    if (
      orden === undefined ||
      orden === null ||
      typeof orden !== "number" ||
      !Number.isInteger(orden) ||
      orden <= 0
    ) {
      return `La pregunta '${textoPregunta.trim()}' debe tener un 'orden' entero mayor a 0.`;
    }

    if (ordenesPreguntas.has(orden)) {
      return `El orden '${orden}' está repetido en las preguntas.`;
    }
    ordenesPreguntas.add(orden);

    if (requerida !== undefined && typeof requerida !== "boolean") {
      return `El campo 'requerida' de la pregunta '${textoPregunta.trim()}' debe ser booleano.`;
    }

    if (activa !== undefined && typeof activa !== "boolean") {
      return `El campo 'activa' de la pregunta '${textoPregunta.trim()}' debe ser booleano.`;
    }

    if (TIPOS_CON_OPCIONES.includes(tipoPregunta)) {
      if (!Array.isArray(opciones)) {
        return `La pregunta '${textoPregunta.trim()}' debe tener un arreglo de opciones.`;
      }

      if (opciones.length < 2) {
        return `La pregunta '${textoPregunta.trim()}' debe tener al menos 2 opciones.`;
      }

      const textosOpciones = new Set();
      const ordenesOpciones = new Set();

      for (let j = 0; j < opciones.length; j++) {
        const opcion = opciones[j];
        const posicionOpcion = j + 1;

        if (!opcion || typeof opcion !== "object" || Array.isArray(opcion)) {
          return `La opción ${posicionOpcion} de la pregunta '${textoPregunta.trim()}' no tiene un formato válido.`;
        }

        const { textoOpcion, valor, orden, activa } = opcion;

        if (!textoOpcion || typeof textoOpcion !== "string" || !textoOpcion.trim()) {
          return `La opción ${posicionOpcion} de la pregunta '${textoPregunta.trim()}' debe tener un 'textoOpcion' válido.`;
        }

        if (textosOpciones.has(textoOpcion.trim().toLowerCase())) {
          return `La opción '${textoOpcion.trim()}' está repetida en la pregunta '${textoPregunta.trim()}'.`;
        }
        textosOpciones.add(textoOpcion.trim().toLowerCase());

        if (
          valor !== undefined &&
          valor !== null &&
          (typeof valor !== "string" || !valor.trim())
        ) {
          return `El campo 'valor' de la opción '${textoOpcion.trim()}' en la pregunta '${textoPregunta.trim()}' debe ser texto válido.`;
        }

        if (
          orden === undefined ||
          orden === null ||
          typeof orden !== "number" ||
          !Number.isInteger(orden) ||
          orden <= 0
        ) {
          return `La opción '${textoOpcion.trim()}' en la pregunta '${textoPregunta.trim()}' debe tener un 'orden' entero mayor a 0.`;
        }

        if (ordenesOpciones.has(orden)) {
          return `El orden '${orden}' está repetido en las opciones de la pregunta '${textoPregunta.trim()}'.`;
        }
        ordenesOpciones.add(orden);

        if (activa !== undefined && typeof activa !== "boolean") {
          return `El campo 'activa' de la opción '${textoOpcion.trim()}' en la pregunta '${textoPregunta.trim()}' debe ser booleano.`;
        }
      }
    } else {
      if (opciones !== undefined && opciones !== null) {
        if (!Array.isArray(opciones)) {
          return `El campo 'opciones' de la pregunta '${textoPregunta.trim()}' debe ser un arreglo si se envía.`;
        }

        if (opciones.length > 0) {
          return `La pregunta '${textoPregunta.trim()}' no debe tener opciones porque su tipo es '${tipoPregunta}'.`;
        }
      }
    }
  }

  return null;
};

const createEncuestaHandler = async (req, res) => {
  try {
    const { titulo, descripcion, slug, activa, preguntas } = req.body;

    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return res.status(400).json({
        error: "El campo 'titulo' es obligatorio y debe ser un texto válido.",
      });
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return res.status(400).json({
        error: "El campo 'slug' es obligatorio y debe ser un texto válido.",
      });
    }

    const regexSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const slugNormalizado = slug.trim().toLowerCase();

    if (!regexSlug.test(slugNormalizado)) {
      return res.status(400).json({
        error: "El campo 'slug' solo puede contener letras minúsculas, números y guiones medios.",
      });
    }

    const slugExistente = await Encuesta.findOne({
      where: { slug: slugNormalizado },
    });

    if (slugExistente) {
      return res.status(400).json({
        error: "Ya existe una encuesta con ese slug.",
      });
    }

    if (
      descripcion !== undefined &&
      descripcion !== null &&
      typeof descripcion !== "string"
    ) {
      return res.status(400).json({
        error: "El campo 'descripcion' debe ser texto.",
      });
    }

    if (activa !== undefined && typeof activa !== "boolean") {
      return res.status(400).json({
        error: "El campo 'activa' debe ser booleano.",
      });
    }

    const errorPreguntas = validarPreguntas(preguntas);
    if (errorPreguntas) {
      return res.status(400).json({ error: errorPreguntas });
    }

    const encuesta = await createEncuesta({
      titulo: titulo.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      slug: slugNormalizado,
      activa: typeof activa === "boolean" ? activa : true,
      preguntas: preguntas.map((pregunta) => ({
        textoPregunta: pregunta.textoPregunta.trim(),
        tipoPregunta: pregunta.tipoPregunta,
        orden: pregunta.orden,
        requerida: typeof pregunta.requerida === "boolean" ? pregunta.requerida : true,
        activa: typeof pregunta.activa === "boolean" ? pregunta.activa : true,
        opciones: Array.isArray(pregunta.opciones)
          ? pregunta.opciones.map((opcion) => ({
              textoOpcion: opcion.textoOpcion.trim(),
              valor:
                opcion.valor && typeof opcion.valor === "string"
                  ? opcion.valor.trim()
                  : opcion.textoOpcion.trim(),
              orden: opcion.orden,
              activa: typeof opcion.activa === "boolean" ? opcion.activa : true,
            }))
          : [],
      })),
    });

    return res.status(201).json({
      message: "Encuesta creada correctamente.",
      encuesta,
    });
  } catch (error) {
    console.error("Error en createEncuestaHandler:", error);
    return res.status(500).json({
      error: "Error interno del servidor al crear la encuesta.",
      details: error.message,
    });
  }
};

const getEncuestaBySlugHandler = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return res.status(400).json({
        error: "Debe enviar un slug válido.",
      });
    }

    const encuesta = await getEncuestaBySlug(slug);

    if (!encuesta) {
      return res.status(404).json({
        error: "No se encontró una encuesta activa con ese slug.",
      });
    }

    return res.status(200).json(encuesta);
  } catch (error) {
    console.error("Error en getEncuestaBySlugHandler:", error);
    return res.status(500).json({
      error: "Error interno del servidor al obtener la encuesta.",
      details: error.message,
    });
  }
};

const getAllEncuestasHandler = async (req, res) => {
  try {
    const encuestas = await getAllEncuestas();

    return res.status(200).json(encuestas);
  } catch (error) {
    console.error("Error en getAllEncuestasHandler:", error);
    return res.status(500).json({
      error: "Error interno del servidor al listar las encuestas.",
      details: error.message,
    });
  }
};

const updateEncuestaHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, slug, activa, preguntas } = req.body;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        error: "Debe enviar un id válido.",
      });
    }

    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return res.status(400).json({
        error: "El campo 'titulo' es obligatorio y debe ser un texto válido.",
      });
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return res.status(400).json({
        error: "El campo 'slug' es obligatorio y debe ser un texto válido.",
      });
    }

    const regexSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const slugNormalizado = slug.trim().toLowerCase();

    if (!regexSlug.test(slugNormalizado)) {
      return res.status(400).json({
        error: "El campo 'slug' solo puede contener letras minúsculas, números y guiones medios.",
      });
    }

    const slugExistente = await Encuesta.findOne({
      where: { slug: slugNormalizado },
    });

    if (slugExistente && slugExistente.id !== id) {
      return res.status(400).json({
        error: "Ya existe otra encuesta con ese slug.",
      });
    }

    if (
      descripcion !== undefined &&
      descripcion !== null &&
      typeof descripcion !== "string"
    ) {
      return res.status(400).json({
        error: "El campo 'descripcion' debe ser texto.",
      });
    }

    if (activa !== undefined && typeof activa !== "boolean") {
      return res.status(400).json({
        error: "El campo 'activa' debe ser booleano.",
      });
    }

    const errorPreguntas = validarPreguntas(preguntas);
    if (errorPreguntas) {
      return res.status(400).json({ error: errorPreguntas });
    }

    const encuestaActualizada = await updateEncuesta({
      encuestaId: id.trim(),
      titulo: titulo.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      slug: slugNormalizado,
      activa: typeof activa === "boolean" ? activa : true,
      preguntas: preguntas.map((pregunta) => ({
        textoPregunta: pregunta.textoPregunta.trim(),
        tipoPregunta: pregunta.tipoPregunta,
        orden: pregunta.orden,
        requerida: typeof pregunta.requerida === "boolean" ? pregunta.requerida : true,
        activa: typeof pregunta.activa === "boolean" ? pregunta.activa : true,
        opciones: Array.isArray(pregunta.opciones)
          ? pregunta.opciones.map((opcion) => ({
              textoOpcion: opcion.textoOpcion.trim(),
              valor:
                opcion.valor && typeof opcion.valor === "string"
                  ? opcion.valor.trim()
                  : opcion.textoOpcion.trim(),
              orden: opcion.orden,
              activa: typeof opcion.activa === "boolean" ? opcion.activa : true,
            }))
          : [],
      })),
    });

    return res.status(200).json({
      message: "Encuesta actualizada correctamente.",
      encuesta: encuestaActualizada,
    });
  } catch (error) {
    console.error("Error en updateEncuestaHandler:", error);

    if (error.message === "ENCUESTA_NOT_FOUND") {
      return res.status(404).json({
        error: "No se encontró la encuesta a actualizar.",
      });
    }

    return res.status(500).json({
      error: "Error interno del servidor al actualizar la encuesta.",
      details: error.message,
    });
  }
};

const responderEncuestaHandler = async (req, res) => {
  try {
    const { slug } = req.params;
    const { avisoId, respondidoPor, correo, respuestas } = req.body;

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return res.status(400).json({
        error: "Debe enviar un slug válido.",
      });
    }

    if (
      avisoId !== undefined &&
      avisoId !== null &&
      (typeof avisoId !== "string" || !avisoId.trim())
    ) {
      return res.status(400).json({
        error: "El campo 'avisoId' debe ser un texto válido.",
      });
    }

    if (
      respondidoPor !== undefined &&
      respondidoPor !== null &&
      (typeof respondidoPor !== "string" || !respondidoPor.trim())
    ) {
      return res.status(400).json({
        error: "El campo 'respondidoPor' debe ser un texto válido.",
      });
    }

    if (
      correo !== undefined &&
      correo !== null &&
      (typeof correo !== "string" || !correo.trim())
    ) {
      return res.status(400).json({
        error: "El campo 'correo' debe ser un texto válido.",
      });
    }

    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({
        error: "Debe enviar un arreglo 'respuestas' con al menos una respuesta.",
      });
    }

    for (let i = 0; i < respuestas.length; i++) {
      const respuesta = respuestas[i];

      if (!respuesta.preguntaId || typeof respuesta.preguntaId !== "string") {
        return res.status(400).json({
          error: `La respuesta en la posición ${i + 1} debe incluir 'preguntaId' válido.`,
        });
      }

      const tieneTexto =
        respuesta.respuestaTexto !== undefined &&
        respuesta.respuestaTexto !== null;
      const tieneNumero =
        respuesta.respuestaNumero !== undefined &&
        respuesta.respuestaNumero !== null;
      const tieneFecha =
        respuesta.respuestaFecha !== undefined &&
        respuesta.respuestaFecha !== null;
      const tieneOpcion =
        respuesta.opcionId !== undefined &&
        respuesta.opcionId !== null;
      const tieneOpcionesMultiples =
        respuesta.opcionesIds !== undefined &&
        respuesta.opcionesIds !== null;

      if (
        !tieneTexto &&
        !tieneNumero &&
        !tieneFecha &&
        !tieneOpcion &&
        !tieneOpcionesMultiples
      ) {
        return res.status(400).json({
          error: `La respuesta en la posición ${i + 1} no contiene ningún valor válido.`,
        });
      }

      if (tieneTexto) {
        if (
          typeof respuesta.respuestaTexto !== "string" ||
          !respuesta.respuestaTexto.trim()
        ) {
          return res.status(400).json({
            error: `El campo 'respuestaTexto' en la posición ${i + 1} debe ser texto válido.`,
          });
        }
      }

      if (tieneNumero) {
        if (
          typeof respuesta.respuestaNumero !== "number" ||
          Number.isNaN(respuesta.respuestaNumero)
        ) {
          return res.status(400).json({
            error: `El campo 'respuestaNumero' en la posición ${i + 1} debe ser numérico.`,
          });
        }
      }

      if (tieneFecha) {
        const fecha = new Date(respuesta.respuestaFecha);
        if (Number.isNaN(fecha.getTime())) {
          return res.status(400).json({
            error: `El campo 'respuestaFecha' en la posición ${i + 1} no tiene una fecha válida.`,
          });
        }
      }

      if (tieneOpcion) {
        if (typeof respuesta.opcionId !== "string" || !respuesta.opcionId.trim()) {
          return res.status(400).json({
            error: `El campo 'opcionId' en la posición ${i + 1} debe ser texto válido.`,
          });
        }
      }

      if (tieneOpcionesMultiples) {
        if (!Array.isArray(respuesta.opcionesIds) || respuesta.opcionesIds.length === 0) {
          return res.status(400).json({
            error: `El campo 'opcionesIds' en la posición ${i + 1} debe ser un arreglo con al menos un id.`,
          });
        }

        for (const opcionId of respuesta.opcionesIds) {
          if (typeof opcionId !== "string" || !opcionId.trim()) {
            return res.status(400).json({
              error: `Todas las opciones en 'opcionesIds' de la posición ${i + 1} deben ser textos válidos.`,
            });
          }
        }
      }
    }

    const resultado = await responderEncuesta({
      slug: slug.trim(),
      avisoId: avisoId ? avisoId.trim() : null,
      respondidoPor: respondidoPor ? respondidoPor.trim() : null,
      correo: correo ? correo.trim() : null,
      respuestas: respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId.trim(),
        respuestaTexto:
          typeof respuesta.respuestaTexto === "string"
            ? respuesta.respuestaTexto.trim()
            : null,
        respuestaNumero:
          typeof respuesta.respuestaNumero === "number"
            ? respuesta.respuestaNumero
            : null,
        respuestaFecha: respuesta.respuestaFecha || null,
        opcionId:
          typeof respuesta.opcionId === "string"
            ? respuesta.opcionId.trim()
            : null,
        opcionesIds: Array.isArray(respuesta.opcionesIds)
          ? respuesta.opcionesIds.map((id) => id.trim())
          : [],
      })),
    });

    return res.status(201).json({
      message: "Encuesta respondida correctamente.",
      respuesta: resultado,
    });
  } catch (error) {
    console.error("Error en responderEncuestaHandler:", error);

    if (error.message === "ENCUESTA_NOT_FOUND") {
      return res.status(404).json({
        error: "No se encontró la encuesta activa para responder.",
      });
    }

    return res.status(500).json({
      error: "Error interno del servidor al responder la encuesta.",
      details: error.message,
    });
  }
};

module.exports = {
  createEncuestaHandler,
  getEncuestaBySlugHandler,
  getAllEncuestasHandler,
  updateEncuestaHandler,
  responderEncuestaHandler,
};