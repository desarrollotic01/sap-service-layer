const { sequelize } = require("../db_connection");
const { saveUploadedFile } = require("../middlewares/fileStorage");
const {
  actualizarOTACierreTecnicoSiCompleta,
} = require("../controllers/ordenTrabajoController");
const {
  createNotificacionDB,
  setTecnicosDB,
  bulkCreatePlanesDB,
  bulkCreateAdjuntosDB,
  getNotificacionByIdDB,
  getAllNotificacionesDB,
  getActaAdjuntaDB,
  updateEstadoNotificacionDB,
  getEquipoOTDB,
  getNotificacionByEquipoOTDB,
  precargarPlanesPorEquipoOTDB,
  getOTConEquiposDB,
  getNotificacionForPdfDB,
  getNotificacionesByOTDB,
  getOTAvisoTipoDb,
  getNotificacionByOTSinEquipoDB,
} = require("../controllers/notificacionController");

const { renderNotificacionPdfBuffer, mergePdfBuffers, renderResumenOTPdfBuffer, buildFirmasHtml } = require("../services/notificacionPdfService");

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isValidDate = (value) => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const mapCategoriaByField = (fieldname = "") => {
  const name = String(fieldname).toLowerCase();

  if (name.includes("antes")) return "ANTES";
  if (name.includes("despues")) return "DESPUES";
  if (name.includes("correctivo")) return "CORRECTIVO";
  if (name.includes("acta")) return "ACTA_CONFORMIDAD";
  if (name.includes("informe")) return "INFORME";
  if (name.includes("checklist")) return "CHECKLIST";

  return "OTRO";
};

const createAdjuntoRecordFromStored = (stored, extra = {}) => ({
  nombre: stored.nombre,
  url: stored.url,
  extension: stored.extension,
  categoria: extra.categoria || "OTRO",
  notificacionId: extra.notificacionId || null,
  notificacionPlanId: extra.notificacionPlanId || null,
  ordenTrabajoId: extra.ordenTrabajoId || null,
  ordenTrabajoEquipoId: extra.ordenTrabajoEquipoId || null,
  planMantenimientoActividadId: extra.planMantenimientoActividadId || null,
  planMantenimientoId: extra.planMantenimientoId || null,
  equipoId: extra.equipoId || null,
});

const groupFilesByField = (files = []) => {
  return files.reduce((acc, file) => {
    if (!acc[file.fieldname]) acc[file.fieldname] = [];
    acc[file.fieldname].push(file);
    return acc;
  }, {});
};

/* =====================================
   CREAR NOTIFICACION
===================================== */
const crearNotificacion = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      fechaInicio,
      fechaFin,
      estadoGeneralEquipo,
      ordenTrabajoId,
      ordenTrabajoEquipoId,
      fechaUltimoMantenimientoPreventivo,
      horometro,
      numeroMisiones,
      numeroEquipo,
      codigoRepuesto,
      descripcionMantenimiento,
      resumenCorrectivos,
      descripcionGeneral,
      observaciones,
      recomendaciones,
      estado,
      precargarPlanes = "true",
    } = req.body;

    const tecnicos = parseJsonField(req.body.tecnicos, []);
    const planes = parseJsonField(req.body.planes, []);
    const adjuntosBody = parseJsonField(req.body.adjuntos, []);
    const usePrecargarPlanes = String(precargarPlanes) === "true";

    if (!fechaInicio || !fechaFin) {
      await transaction.rollback();
      return res.status(400).json({ message: "Fechas obligatorias" });
    }

    if (!estadoGeneralEquipo) {
      await transaction.rollback();
      return res.status(400).json({ message: "Estado general requerido" });
    }

    if (!ordenTrabajoId) {
      await transaction.rollback();
      return res.status(400).json({ message: "Orden de trabajo requerida" });
    }

    // Determinar si la OT es de tipo "venta" (no requiere equipo)
    const otConAviso = await getOTAvisoTipoDb(ordenTrabajoId, transaction);
    if (!otConAviso) {
      await transaction.rollback();
      return res.status(404).json({ message: "Orden de trabajo no encontrada" });
    }
    const esVentaOT = otConAviso?.aviso?.tipoAviso === "venta";

    let equipoOT = null;

    if (!ordenTrabajoEquipoId) {
      if (!esVentaOT) {
        await transaction.rollback();
        return res.status(400).json({ message: "ordenTrabajoEquipoId es requerido" });
      }
      // Para venta: verificar que no exista ya una notificación para esta OT
      const existe = await getNotificacionByOTSinEquipoDB(ordenTrabajoId, transaction);
      if (existe) {
        await transaction.rollback();
        return res.status(409).json({
          message: "Ya existe una notificación para esta OT de venta",
          notificacionId: existe.id,
        });
      }
    } else {
      equipoOT = await getEquipoOTDB({ ordenTrabajoId, ordenTrabajoEquipoId, transaction });
      if (!equipoOT) {
        await transaction.rollback();
        return res.status(400).json({
          message: "El registro de la OT no pertenece a la orden de trabajo",
        });
      }

      const existe = await getNotificacionByEquipoOTDB(ordenTrabajoEquipoId, transaction);
      if (existe) {
        await transaction.rollback();
        return res.status(409).json({
          message: "Ya existe notificación para este registro de la OT",
          notificacionId: existe.id,
        });
      }
    }

    const notificacion = await createNotificacionDB(
      {
        fechaInicio,
        fechaFin,
        estadoGeneralEquipo,
        ordenTrabajoId,
        ordenTrabajoEquipoId,
        fechaUltimoMantenimientoPreventivo: isValidDate(fechaUltimoMantenimientoPreventivo)
          ? new Date(fechaUltimoMantenimientoPreventivo)
          : null,
        horometro: horometro ?? null,
        numeroMisiones: numeroMisiones ?? null,
        numeroEquipo: numeroEquipo ?? null,
        codigoRepuesto: codigoRepuesto ?? null,
        descripcionMantenimiento: descripcionMantenimiento ?? null,
        resumenCorrectivos: resumenCorrectivos ?? null,
        descripcionGeneral: descripcionGeneral ?? null,
        observaciones: observaciones ?? null,
        recomendaciones: recomendaciones ?? null,
        estado: estado || undefined,
      },
      transaction
    );

    if (Array.isArray(tecnicos) && tecnicos.length > 0) {
      await setTecnicosDB(notificacion, tecnicos, transaction);
    }

    const filesByField = groupFilesByField(req.files || []);

    let planesCreados = [];

    if (Array.isArray(planes) && planes.length > 0) {
      const planesValidos = planes.filter(
        (p) => p?.ordenTrabajoActividadId && p?.estado
      );

      if (planesValidos.length > 0) {
        const planesData = planesValidos.map((p) => ({
          notificacionId: notificacion.id,
          ordenTrabajoActividadId: p.ordenTrabajoActividadId,
          planMantenimientoId: p.planMantenimientoId ?? null,
          estado: p.estado,
          comentario: p.comentario ?? null,
          trabajadorId: p.trabajadorId ?? null,
          duracionPlan:
            p.duracionPlan !== undefined && p.duracionPlan !== null
              ? Number(p.duracionPlan)
              : null,
          unidadDuracionPlan: p.unidadDuracionPlan ?? null,
          fechaInicioPlan: isValidDate(p.fechaInicioPlan)
            ? new Date(p.fechaInicioPlan)
            : null,
          fechaFinPlan: isValidDate(p.fechaFinPlan)
            ? new Date(p.fechaFinPlan)
            : null,
          observaciones: p.observaciones ?? null,
        }));

        planesCreados = await bulkCreatePlanesDB(planesData, transaction);

        const adjuntosPlanes = [];

        for (let i = 0; i < planesValidos.length; i++) {
          const planInput = planesValidos[i];
          const planCreado = planesCreados[i];
          const fieldName = `planAdjuntos_${i}`;
          const filesPlan = filesByField[fieldName] || [];

          for (const file of filesPlan) {
            const stored = saveUploadedFile({
              file,
              folder: "notificaciones/planes",
            });

            adjuntosPlanes.push(
              createAdjuntoRecordFromStored(stored, {
                categoria: mapCategoriaByField(file.fieldname),
                notificacionId: notificacion.id,
                notificacionPlanId: planCreado.id,
                ordenTrabajoId,
                ordenTrabajoEquipoId,
                planMantenimientoActividadId: planInput.planMantenimientoActividadId || null,
                planMantenimientoId: planInput.planMantenimientoId || null,
                equipoId: equipoOT?.equipoId || null,
              })
            );
          }
        }

        if (adjuntosPlanes.length > 0) {
          await bulkCreateAdjuntosDB(adjuntosPlanes, transaction);
        }
      }
    } else if (usePrecargarPlanes && ordenTrabajoEquipoId) {
      planesCreados = await precargarPlanesPorEquipoOTDB({
        notificacionId: notificacion.id,
        ordenTrabajoEquipoId,
        transaction,
      });
    }

    // Recoger TODOS los archivos que no sean de planes específicos
    // Los campos de planes siguen el patrón planAdjuntos_0, planAdjuntos_1, etc.
    const planesValidosCount = Array.isArray(planes)
      ? planes.filter((p) => p?.ordenTrabajoActividadId && p?.estado).length
      : 0;
    const planAdjuntoFieldNames = new Set(
      Array.from({ length: planesValidosCount }, (_, i) => `planAdjuntos_${i}`)
    );

    const adjuntosGeneralesFiles = Object.entries(filesByField)
      .filter(([fieldname]) => !planAdjuntoFieldNames.has(fieldname))
      .flatMap(([, files]) => files);

    if (adjuntosGeneralesFiles.length > 0) {
      const adjuntosGenerales = adjuntosGeneralesFiles.map((file) => {
        const stored = saveUploadedFile({
          file,
          folder: "notificaciones/generales",
        });

        return createAdjuntoRecordFromStored(stored, {
          categoria: mapCategoriaByField(file.fieldname),
          notificacionId: notificacion.id,
          ordenTrabajoId,
          ordenTrabajoEquipoId,
          equipoId: equipoOT?.equipoId || null,
        });
      });

      await bulkCreateAdjuntosDB(adjuntosGenerales, transaction);
    }

    // Adjuntos pre-subidos que el frontend envía como JSON en el body
    console.log("[ADJUNTOS] adjuntosBody recibidos:", adjuntosBody.length,
      adjuntosBody.map(a => ({ cat: a.categoria, grupo: a.grupo, desc: a.descripcion, url: a.url?.slice(-20) }))
    );

    if (Array.isArray(adjuntosBody) && adjuntosBody.length > 0) {
      const adjuntosDeBody = adjuntosBody
        .filter((adj) => adj?.url)
        .map((adj) => ({
          nombre: adj.nombre || "archivo",
          url: adj.url,
          extension: adj.extension || "",
          categoria: adj.categoria || "OTRO",
          descripcion: adj.descripcion || null,
          grupo: adj.grupo != null ? Number(adj.grupo) : 0,
          notificacionId: notificacion.id,
          ordenTrabajoId: adj.ordenTrabajoId || ordenTrabajoId,
          ordenTrabajoEquipoId: adj.ordenTrabajoEquipoId || ordenTrabajoEquipoId,
          equipoId: equipoOT?.equipoId || null,
        }));

      console.log("[ADJUNTOS] guardando en DB:", adjuntosDeBody.map(a => ({ cat: a.categoria, grupo: a.grupo, desc: a.descripcion })));

      if (adjuntosDeBody.length > 0) {
        await bulkCreateAdjuntosDB(adjuntosDeBody, transaction);
      }
    }

    await actualizarOTACierreTecnicoSiCompleta(ordenTrabajoId, transaction);

    await transaction.commit();

    const notificacionCompleta = await getNotificacionByIdDB(notificacion.id);

    return res.status(201).json({
      message: "Notificación creada correctamente",
      data: notificacionCompleta || notificacion,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Error al crear",
      error: error.message,
    });
  }
};

/* =====================================
   OBTENER POR ID
===================================== */
const obtenerNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const notificacion = await getNotificacionByIdDB(id);

    if (!notificacion) {
      return res.status(404).json({ message: "No encontrada" });
    }

    return res.json(notificacion);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =====================================
   LISTAR
===================================== */
const listarNotificaciones = async (req, res) => {
  try {
    const data = await getAllNotificacionesDB();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =====================================
   FINALIZAR
===================================== */
const finalizarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;

    const acta = await getActaAdjuntaDB(id);
    if (!acta) {
      return res.status(400).json({
        message: "Debe adjuntar Acta de Conformidad",
      });
    }

    await updateEstadoNotificacionDB(id, "FINALIZADO");
    return res.json({ message: "Notificación finalizada" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =====================================
   GENERAR POR OT
===================================== */
const generarNotificacionesPorOT = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ordenTrabajoId } = req.params;
    const { fechaInicio, fechaFin, estadoGeneralEquipo, precargarPlanes = true, ...resto } = req.body || {};

    if (!fechaInicio || !fechaFin) {
      await transaction.rollback();
      return res.status(400).json({ message: "Fechas obligatorias" });
    }

    if (!estadoGeneralEquipo) {
      await transaction.rollback();
      return res.status(400).json({ message: "Estado general requerido" });
    }

    const ot = await getOTConEquiposDB(ordenTrabajoId, transaction);
    if (!ot) {
      await transaction.rollback();
      return res.status(404).json({ message: "OT no encontrada" });
    }

    const equiposOT = ot.equipos || [];
    if (equiposOT.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "La OT no tiene registros" });
    }

    const creadas = [];
    const existentes = [];

    for (const eq of equiposOT) {
      const ya = await getNotificacionByEquipoOTDB(eq.id, transaction);
      if (ya) {
        existentes.push({ ordenTrabajoEquipoId: eq.id, notificacionId: ya.id });
        continue;
      }

      const n = await createNotificacionDB(
        {
          ordenTrabajoId,
          ordenTrabajoEquipoId: eq.id,
          fechaInicio,
          fechaFin,
          estadoGeneralEquipo,
          ...resto,
        },
        transaction
      );

      if (precargarPlanes) {
        await precargarPlanesPorEquipoOTDB({
          notificacionId: n.id,
          ordenTrabajoEquipoId: eq.id,
          transaction,
        });
      }

      creadas.push(n);
    }

    await actualizarOTACierreTecnicoSiCompleta(ordenTrabajoId, transaction);


    await transaction.commit();

    return res.status(201).json({
      message: "Notificaciones generadas correctamente",
      resumen: {
        totalRegistrosOT: equiposOT.length,
        creadas: creadas.length,
        existentes: existentes.length,
      },
      creadas,
      existentes,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Error al generar notificaciones",
      error: error.message,
    });
  }
};

const generarPdfNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const firmas = req.body?.firmas || {};

    const notif = await getNotificacionForPdfDB(id);
    if (!notif) return res.status(404).json({ message: "Notificación no encontrada" });

    const pdfBuffer = await renderNotificacionPdfBuffer(notif, firmas);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=notificacion_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("ERROR PDF:", error);
    return res.status(500).json({ message: "Error al generar PDF", error: error.message });
  }
};

const listarNotificacionesPorOT = async (req, res) => {
  try {
    const { ordenTrabajoId } = req.params;
    const data = await getNotificacionesByOTDB(ordenTrabajoId);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Error al listar por OT", error: error.message });
  }
};

const combinarPdfsOT = async (req, res) => {
  try {
    const { ordenTrabajoId } = req.params;
    const firmas = req.body?.firmas || {};

    const notificaciones = await getNotificacionesByOTDB(ordenTrabajoId);
    if (!notificaciones || notificaciones.length === 0) {
      return res.status(404).json({ message: "No hay notificaciones para esta OT" });
    }

    const buffers = [];
    let otNumero = null;
    let tipoAvisoOT = "";

    for (const notifResumen of notificaciones) {
      const notif = await getNotificacionForPdfDB(notifResumen.id);
      if (!notif) continue;
      if (!otNumero) otNumero = notif?.ordenTrabajo?.numeroOT || null;
      if (!tipoAvisoOT) tipoAvisoOT = notif?.ordenTrabajo?.aviso?.tipoAviso || "";
      const buf = await renderNotificacionPdfBuffer(notif, firmas, false);
      buffers.push(buf);
    }

    if (buffers.length === 0) {
      return res.status(404).json({ message: "No se pudieron generar PDFs" });
    }

    // Última página: tabla resumen (mantenimiento) o página de firmas (instalacion/venta)
    if (!tipoAvisoOT || tipoAvisoOT === "mantenimiento") {
      // Mantenimiento: resumen de cambios + firmas al final
      const resumenBuf = await renderResumenOTPdfBuffer(notificaciones, otNumero, null, firmas);
      buffers.push(resumenBuf);
    } else {
      // Instalación / venta: página de firmas sola al final
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      try {
        const page = await browser.newPage();
        await page.setBypassCSP(true);
        const html = buildFirmasHtml(firmas, otNumero);
        await page.setContent(html, { waitUntil: ["load", "networkidle0"] });
        const firmasBuf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" } });
        buffers.push(firmasBuf);
      } finally {
        await browser.close();
      }
    }

    const merged = await mergePdfBuffers(buffers);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=informe_completo_OT_${ordenTrabajoId}.pdf`
    );
    return res.send(merged);
  } catch (error) {
    console.error("ERROR PDF combinado:", error);
    return res.status(500).json({ message: "Error al combinar PDFs", error: error.message });
  }
};

const generarPdfResumen = async (req, res) => {
  try {
    const { ordenTrabajoId } = req.params;
    const { grupos, firmas } = req.body || {};

    const notificaciones = await getNotificacionesByOTDB(ordenTrabajoId);
    if (!notificaciones || notificaciones.length === 0) {
      return res.status(404).json({ message: "No hay notificaciones para esta OT" });
    }

    const otNumero = notificaciones[0]?.ordenTrabajoId
      ? (await getNotificacionForPdfDB(notificaciones[0].id))?.ordenTrabajo?.numeroOT
      : null;

    const pdfBuffer = await renderResumenOTPdfBuffer(notificaciones, otNumero, grupos, firmas || {});

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=resumen_OT_${ordenTrabajoId}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("ERROR PDF resumen:", error);
    return res.status(500).json({ message: "Error al generar PDF resumen", error: error.message });
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificacion,
  listarNotificaciones,
  finalizarNotificacion,
  generarNotificacionesPorOT,
  generarPdfNotificacion,
  listarNotificacionesPorOT,
  combinarPdfsOT,
  generarPdfResumen,
};