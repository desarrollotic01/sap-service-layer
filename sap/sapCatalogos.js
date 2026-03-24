const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

// 🧠 cache simple en memoria
let cache = {
  U_ALS_RUBRO: null,
  U_ALS_PAQTRAB: null,
};

/**
 * Obtener valores válidos de un UDF en SAP
 */
async function obtenerValoresUDF(nombreCampo) {
  try {
    // 🔥 usar cache si existe
    if (cache[nombreCampo]) {
      return cache[nombreCampo];
    }

    const cookies = await loginSAP();

    const response = await sapAxios.get(
  `/UserFieldsMD?$filter=Name eq '${nombreCampo}' and TableName eq 'PRQ1'`,
  {
    headers: { Cookie: cookies },
  }
);

    const data = response.data.value[0];

    if (!data) {
      throw new Error(`No se encontró el campo ${nombreCampo} en SAP`);
    }

    const valores = data.ValidValuesMD.map((item) => ({
      value: item.Value,
      label: item.Description,
    }));

    // 💾 guardar en cache
    cache[nombreCampo] = valores;

    return valores;

  } catch (error) {
    console.error(`❌ Error obteniendo ${nombreCampo} desde SAP:`);

    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

/**
 * 📦 Paquetes de trabajo
 */
async function obtenerPaquetesTrabajo() {
  return await obtenerValoresUDF("ALS_PAQTRAB");
}

/**
 * 🧱 Rubros
 */
async function obtenerRubros() {
  return await obtenerValoresUDF("ALS_RUBRO");
}

module.exports = {
  obtenerPaquetesTrabajo,
  obtenerRubros,
};