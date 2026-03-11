const {
  Encuesta,
  PreguntaEncuesta,
  OpcionPregunta,
  RespuestaEncuesta,
  DetalleRespuestaEncuesta,
  sequelize,
} = require("../db_connection");

const createEncuesta = async ({
  titulo,
  descripcion,
  slug,
  activa = true,
  preguntas,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const nuevaEncuesta = await Encuesta.create(
      {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        slug: slug.trim().toLowerCase(),
        activa,
      },
      { transaction }
    );

    for (const pregunta of preguntas) {
      const nuevaPregunta = await PreguntaEncuesta.create(
        {
          encuestaId: nuevaEncuesta.id,
          textoPregunta: pregunta.textoPregunta.trim(),
          tipoPregunta: pregunta.tipoPregunta,
          orden: pregunta.orden,
          requerida: pregunta.requerida,
          activa: pregunta.activa,
        },
        { transaction }
      );

      if (
        ["OPCION_UNICA", "OPCION_MULTIPLE"].includes(pregunta.tipoPregunta) &&
        Array.isArray(pregunta.opciones) &&
        pregunta.opciones.length > 0
      ) {
        for (const opcion of pregunta.opciones) {
          await OpcionPregunta.create(
            {
              preguntaId: nuevaPregunta.id,
              textoOpcion: opcion.textoOpcion.trim(),
              valor: opcion.valor ? opcion.valor.trim() : opcion.textoOpcion.trim(),
              orden: opcion.orden,
              activa: opcion.activa,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    return await Encuesta.findByPk(nuevaEncuesta.id, {
      include: [
        {
          model: PreguntaEncuesta,
          as: "preguntas",
          include: [
            {
              model: OpcionPregunta,
              as: "opciones",
            },
          ],
        },
      ],
      order: [
        [{ model: PreguntaEncuesta, as: "preguntas" }, "orden", "ASC"],
        [
          { model: PreguntaEncuesta, as: "preguntas" },
          { model: OpcionPregunta, as: "opciones" },
          "orden",
          "ASC",
        ],
      ],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getEncuestaBySlug = async (slug) => {
  return await Encuesta.findOne({
    where: {
      slug: slug.trim().toLowerCase(),
      activa: true,
    },
    include: [
      {
        model: PreguntaEncuesta,
        as: "preguntas",
        where: { activa: true },
        required: false,
        include: [
          {
            model: OpcionPregunta,
            as: "opciones",
            where: { activa: true },
            required: false,
          },
        ],
      },
    ],
    order: [
      [{ model: PreguntaEncuesta, as: "preguntas" }, "orden", "ASC"],
      [
        { model: PreguntaEncuesta, as: "preguntas" },
        { model: OpcionPregunta, as: "opciones" },
        "orden",
        "ASC",
      ],
    ],
  });
};

const getAllEncuestas = async () => {
  return await Encuesta.findAll({
    include: [
      {
        model: PreguntaEncuesta,
        as: "preguntas",
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const updateEncuesta = async ({
  encuestaId,
  titulo,
  descripcion,
  slug,
  activa,
  preguntas,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const encuesta = await Encuesta.findByPk(encuestaId, { transaction });

    if (!encuesta) {
      throw new Error("ENCUESTA_NOT_FOUND");
    }

    await encuesta.update(
      {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        slug: slug.trim().toLowerCase(),
        activa,
      },
      { transaction }
    );

    const preguntasActuales = await PreguntaEncuesta.findAll({
      where: { encuestaId: encuesta.id },
      include: [
        {
          model: OpcionPregunta,
          as: "opciones",
        },
      ],
      transaction,
    });

    for (const preguntaActual of preguntasActuales) {
      await OpcionPregunta.destroy({
        where: { preguntaId: preguntaActual.id },
        transaction,
      });
    }

    await PreguntaEncuesta.destroy({
      where: { encuestaId: encuesta.id },
      transaction,
    });

    for (const pregunta of preguntas) {
      const nuevaPregunta = await PreguntaEncuesta.create(
        {
          encuestaId: encuesta.id,
          textoPregunta: pregunta.textoPregunta.trim(),
          tipoPregunta: pregunta.tipoPregunta,
          orden: pregunta.orden,
          requerida: pregunta.requerida,
          activa: pregunta.activa,
        },
        { transaction }
      );

      if (
        ["OPCION_UNICA", "OPCION_MULTIPLE"].includes(pregunta.tipoPregunta) &&
        Array.isArray(pregunta.opciones) &&
        pregunta.opciones.length > 0
      ) {
        for (const opcion of pregunta.opciones) {
          await OpcionPregunta.create(
            {
              preguntaId: nuevaPregunta.id,
              textoOpcion: opcion.textoOpcion.trim(),
              valor: opcion.valor ? opcion.valor.trim() : opcion.textoOpcion.trim(),
              orden: opcion.orden,
              activa: opcion.activa,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    return await Encuesta.findByPk(encuesta.id, {
      include: [
        {
          model: PreguntaEncuesta,
          as: "preguntas",
          include: [
            {
              model: OpcionPregunta,
              as: "opciones",
            },
          ],
        },
      ],
      order: [
        [{ model: PreguntaEncuesta, as: "preguntas" }, "orden", "ASC"],
        [
          { model: PreguntaEncuesta, as: "preguntas" },
          { model: OpcionPregunta, as: "opciones" },
          "orden",
          "ASC",
        ],
      ],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const responderEncuesta = async ({
  slug,
  avisoId = null,
  respondidoPor = null,
  correo = null,
  respuestas,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const encuesta = await Encuesta.findOne({
      where: {
        slug: slug.trim().toLowerCase(),
        activa: true,
      },
      include: [
        {
          model: PreguntaEncuesta,
          as: "preguntas",
          where: { activa: true },
          required: false,
          include: [
            {
              model: OpcionPregunta,
              as: "opciones",
              where: { activa: true },
              required: false,
            },
          ],
        },
      ],
      transaction,
    });

    if (!encuesta) {
      throw new Error("ENCUESTA_NOT_FOUND");
    }

    const nuevaRespuesta = await RespuestaEncuesta.create(
      {
        encuestaId: encuesta.id,
        avisoId,
        respondidoPor,
        correo,
        estado: "RESPONDIDA",
        fechaRespuesta: new Date(),
      },
      { transaction }
    );

    const mapaPreguntas = new Map();
    for (const pregunta of encuesta.preguntas) {
      mapaPreguntas.set(pregunta.id, pregunta);
    }

    for (const respuesta of respuestas) {
      const pregunta = mapaPreguntas.get(respuesta.preguntaId);

      if (!pregunta) {
        throw new Error(`La pregunta con id '${respuesta.preguntaId}' no pertenece a la encuesta.`);
      }

      if (["TEXTO", "TEXTAREA"].includes(pregunta.tipoPregunta)) {
        await DetalleRespuestaEncuesta.create(
          {
            respuestaEncuestaId: nuevaRespuesta.id,
            preguntaId: pregunta.id,
            respuestaTexto: respuesta.respuestaTexto.trim(),
          },
          { transaction }
        );
      }

      if (pregunta.tipoPregunta === "NUMERO") {
        await DetalleRespuestaEncuesta.create(
          {
            respuestaEncuestaId: nuevaRespuesta.id,
            preguntaId: pregunta.id,
            respuestaNumero: respuesta.respuestaNumero,
          },
          { transaction }
        );
      }

      if (pregunta.tipoPregunta === "FECHA") {
        await DetalleRespuestaEncuesta.create(
          {
            respuestaEncuestaId: nuevaRespuesta.id,
            preguntaId: pregunta.id,
            respuestaFecha: respuesta.respuestaFecha,
          },
          { transaction }
        );
      }

      if (pregunta.tipoPregunta === "OPCION_UNICA") {
        await DetalleRespuestaEncuesta.create(
          {
            respuestaEncuestaId: nuevaRespuesta.id,
            preguntaId: pregunta.id,
            opcionId: respuesta.opcionId,
          },
          { transaction }
        );
      }

      if (pregunta.tipoPregunta === "OPCION_MULTIPLE") {
        for (const opcionId of respuesta.opcionesIds) {
          await DetalleRespuestaEncuesta.create(
            {
              respuestaEncuestaId: nuevaRespuesta.id,
              preguntaId: pregunta.id,
              opcionId,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    return await RespuestaEncuesta.findByPk(nuevaRespuesta.id, {
      include: [
        {
          model: DetalleRespuestaEncuesta,
          as: "detalles",
          include: [
            { model: PreguntaEncuesta, as: "pregunta" },
            { model: OpcionPregunta, as: "opcion" },
          ],
        },
      ],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  createEncuesta,
  getEncuestaBySlug,
  getAllEncuestas,
  updateEncuesta,
  responderEncuesta,
};