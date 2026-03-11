const axios = require("axios");
const https = require("https");

const sapAxios = axios.create({
  baseURL: process.env.SAP_URL,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 30000,
});

module.exports = sapAxios;