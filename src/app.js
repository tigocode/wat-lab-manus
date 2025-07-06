require('dotenv').config();

const express = require('express');
const cors = require('cors');

const router = require('./routes/routes');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);

app.listen(process.env.PORT || 443, () => {
  let date = new Date();
  console.log(`Servidor HTTPS rodando na PORT ${process.env.PORT || 443} desde: ${date.toLocaleString()}`);
});
