const express = require('express');
const router = express.Router();
const instance = require('../controllers/createInstances.controller');
const { firebaseAuth } = require('../middleware/firebaseAuth');

router.get('/wat-health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), message: 'API WatAPI rodando com sucesso!' });
});
router.use(firebaseAuth);
router.post('/start-session', instance.startSession);
router.post('/generate-qr-link', instance.generateQRLink);
router.get('/qr/base64/:id', instance.searchID);
router.post('/getinstance', instance.index);
router.post('/logout-session', instance.logout);

module.exports = router;
