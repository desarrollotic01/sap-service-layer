const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function generarOrdenTrabajoPDF(orden) {
  try {
    const carpeta = path.join(__dirname, "../ordenes_trabajo");

    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta);
    }

    const filePath = path.join(carpeta, `${orden.numeroOT}.pdf`);

    // 🧹 eliminar anterior
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 🎨 HTML PROFESIONAL
    const html = `
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #333;
          padding: 30px;
        }

        h1, h2, h3 {
          margin-bottom: 5px;
        }

        .center {
          text-align: center;
        }

        .section {
          margin-top: 20px;
        }

        .box {
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 6px;
          text-align: left;
        }

        th {
          background-color: #f5f5f5;
        }

        .firma {
          margin-top: 40px;
        }
      </style>
    </head>

    <body>

      <h1 class="center">ORDEN DE TRABAJO</h1>
      <p class="center"><strong>N°:</strong> ${orden.numeroOT}</p>
      <p class="center"><strong>Estado:</strong> ${orden.estado}</p>

      <div class="section box">
        <h2>INFORMACIÓN GENERAL</h2>
        <p><strong>Tipo:</strong> ${orden.tipoMantenimiento}</p>
        <p><strong>Inicio:</strong> ${orden.fechaProgramadaInicio}</p>
        <p><strong>Fin:</strong> ${orden.fechaProgramadaFin}</p>
        <p><strong>Descripción:</strong> ${orden.descripcionGeneral || "-"}</p>
      </div>

      ${orden.equipos
        .map((eq, index) => {
          const esEquipo = !!eq.equipo;
const data = esEquipo ? eq.equipo : eq.ubicacionTecnica;

const tipoLabel = esEquipo ? "EQUIPO" : "UBICACIÓN TÉCNICA";

          return `
          <div class="section box">
            <h2>${tipoLabel} ${index + 1}</h2>

<p><strong>Código:</strong> ${data?.codigo || "-"}</p>
<p><strong>Nombre:</strong> ${data?.nombre || "-"}</p>
<p><strong>Serie:</strong> ${data?.serie || "-"}</p>
<p><strong>Marca:</strong> ${data?.marca || "-"}</p>
<p><strong>Estado:</strong> ${data?.estado || "-"}</p>
            <h3>PERSONAL</h3>
            <ul>
              ${eq.trabajadores
                .map(
                  (t) => `
                <li>
                  ${t.trabajador.nombre} ${t.trabajador.apellido}
                  ${t.esEncargado ? "(Encargado)" : ""}
                </li>`
                )
                .join("")}
            </ul>

            <h3>ACTIVIDADES</h3>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tarea</th>
                  <th>Sistema</th>
                  <th>Tipo</th>
                  <th>Rol</th>
                  <th>Cant</th>
                  <th>Duración</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${eq.actividades
                  .map(
                    (act, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${act.tarea || "-"}</td>
                    <td>${act.sistema}/${act.subsistema}/${act.componente}</td>
                    <td>${act.tipoTrabajo || "-"}</td>
                    <td>${act.rolTecnico || "-"}</td>
                    <td>${act.cantidadTecnicos || "-"}</td>
                    <td>${act.duracionEstimadaValor || "-"} ${
                      act.unidadDuracion || ""
                    }</td>
                    <td>${act.estado || "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `;
        })
        .join("")}

      <div class="firma">
        <h2>FIRMAS</h2>

        <p>________________________</p>
        <p>Técnico</p>

        <br/>

        <p>________________________</p>
        <p>Supervisor</p>
      </div>

    </body>
    </html>
    `;

    // 🚀 GENERAR PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    console.log("✅ PDF generado:", filePath);

    return filePath;
  } catch (error) {
    console.error("❌ Error generando PDF:", error);
    throw error;
  }
}

module.exports = {
  generarOrdenTrabajoPDF,
};