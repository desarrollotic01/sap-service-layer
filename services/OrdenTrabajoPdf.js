const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} = require("docx");

async function generarOrdenTrabajoPDF(orden) {
  try {
    const carpeta = path.join(__dirname, "../ordenes_trabajo");

    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta);
    }

    const filePath = path.join(carpeta, `${orden.numeroOT}.docx`);

    // 🧹 eliminar anterior
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const sections = [];

    // 🟩 HEADER
    sections.push(
      new Paragraph({
        text: "ORDEN DE TRABAJO",
        heading: "Heading1",
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `N°: ${orden.numeroOT}`,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Estado: ${orden.estado}`,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph("")
    );

    // 🟦 INFO GENERAL
    sections.push(
      new Paragraph({ text: "INFORMACIÓN GENERAL", heading: "Heading2" }),
      new Paragraph(`Tipo: ${orden.tipoMantenimiento}`),
      new Paragraph(`Inicio: ${orden.fechaProgramadaInicio}`),
      new Paragraph(`Fin: ${orden.fechaProgramadaFin}`),
      new Paragraph(`Descripción: ${orden.descripcionGeneral || "-"}`),
      new Paragraph("")
    );

    // 🔁 POR CADA EQUIPO
    orden.equipos.forEach((eq, index) => {
      const equipo = eq.equipo;

      // 🟨 EQUIPO
      sections.push(
        new Paragraph({
          text: `EQUIPO ${index + 1}`,
          heading: "Heading2",
        }),
        new Paragraph(`Código: ${equipo.codigo}`),
        new Paragraph(`Nombre: ${equipo.nombre}`),
        new Paragraph(`Serie: ${equipo.serie}`),
        new Paragraph(`Marca: ${equipo.marca}`),
        new Paragraph(`Estado: ${equipo.estado}`),
        new Paragraph("")
      );

      // 🟧 PERSONAL
      sections.push(
        new Paragraph({ text: "PERSONAL ASIGNADO", heading: "Heading3" })
      );

      eq.trabajadores.forEach((t) => {
        sections.push(
          new Paragraph(
            `${t.trabajador.nombre} ${t.trabajador.apellido} ${
              t.esEncargado ? "(Encargado)" : ""
            }`
          )
        );
      });

      sections.push(new Paragraph(""));

      // 🟥 ACTIVIDADES (TABLA)
      const rows = [];

      // HEADER
      rows.push(
        new TableRow({
          children: [
            "N°",
            "Tarea",
            "Sistema",
            "Tipo",
            "Rol",
            "Cant",
            "Duración",
            "Estado",
          ].map(
            (h) =>
              new TableCell({
                children: [new Paragraph({ text: h, bold: true })],
              })
          ),
        })
      );

      // DATA
      eq.actividades.forEach((act, i) => {
        rows.push(
          new TableRow({
            children: [
              i + 1,
              act.tarea,
              `${act.sistema}/${act.subsistema}/${act.componente}`,
              act.tipoTrabajo,
              act.rolTecnico,
              act.cantidadTecnicos,
              `${act.duracionEstimadaValor} ${act.unidadDuracion}`,
              act.estado,
            ].map(
              (val) =>
                new TableCell({
                  children: [new Paragraph(String(val || "-"))],
                })
            ),
          })
        );
      });

      sections.push(
        new Paragraph({
          text: "ACTIVIDADES",
          heading: "Heading3",
        }),
        new Table({
          rows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        }),
        new Paragraph("")
      );
    });

    // 🟫 FIRMAS
    sections.push(
      new Paragraph({ text: "FIRMAS", heading: "Heading2" }),
      new Paragraph("________________________"),
      new Paragraph("Técnico"),
      new Paragraph(""),
      new Paragraph("________________________"),
      new Paragraph("Supervisor")
    );

    const doc = new Document({
      sections: [{ children: sections }],
    });

    const buffer = await Packer.toBuffer(doc);

    fs.writeFileSync(filePath, buffer);

    console.log("✅ PDF generado:", filePath);

    return filePath;

  } catch (error) {
    console.error("❌ Error generando OT:", error);
    throw error;
  }
}

module.exports = {
  generarOrdenTrabajoPDF,
};