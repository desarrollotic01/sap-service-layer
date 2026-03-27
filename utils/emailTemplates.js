const buildHtmlBloque = (solicitudes) => {
  return `
    <h2>Solicitudes de Almacén</h2>

    ${solicitudes
      .map(
        (sol) => `
        <div style="margin-bottom:20px;">
          <h3>Solicitud ${sol.numeroSolicitud}</h3>

          <p><b>Solicitante:</b> ${sol.requester}</p>
          <p><b>Fecha requerida:</b> ${sol.requiredDate}</p>

          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th>Item</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Almacén</th>
              </tr>
            </thead>
            <tbody>
              ${sol.lineas
                .map(
                  (l) => `
                  <tr>
                    <td>${l.itemCode}</td>
                    <td>${l.description}</td>
                    <td>${l.quantity}</td>
                    <td>${l.warehouseCode}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
      )
      .join("")}
  `;
};

module.exports = {
  buildHtmlBloque,
};