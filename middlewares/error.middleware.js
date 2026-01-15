module.exports = (err, req, res, next) => {
  console.error(err.response?.data || err.message);

  res.status(500).json({
    success: false,
    message: 'Error al procesar la solicitud',
    detail: err.response?.data || err.message
  });
};
