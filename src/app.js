require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const router = require('./routes/routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/qr', express.static(path.join(__dirname, '../public/qr')));
app.use(router);

app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`WatAPI rodando na porta ${port}`);
  });
}

module.exports = app;
