const express = require('express');
const router = express.Router();

const instance = require('../controllers/createInstances.controller');

router.post('/start-session', instance.startSession);

module.exports = router;
