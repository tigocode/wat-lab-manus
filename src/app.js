require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const router = require('./routes/routes');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/qr', express.static(path.join(__dirname, '../public/qr')));
app.use(router);

router.get('/qr/base64/:id', (req, res) => {
  const { id } = req.params;
  const base64 = qrStore[id];
  if (!base64) return res.status(404).json({ error: 'QR Code não encontrado' });
  res.json({ base64 });
});


app.listen(process.env.PORT || 443, () => {
  let date = new Date();
  console.log(`Servidor HTTPS rodando na PORT ${process.env.PORT || 443} desde: ${date.toLocaleString()}`);
});
