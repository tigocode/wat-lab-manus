const express = require('express');
const router = express.Router();

const instance = require('../controllers/createInstances.controller');

router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date(), message: '✅ API WatAPI rodando com sucesso!' });
});

router.post('/start-session', instance.startSession);
router.post('/generate-qr-link', instance.generateQRLink);
router.get("/qr/base64/:id", instance.searchID);
router.post('/getinstance', instance.Index);

module.exports = router;
