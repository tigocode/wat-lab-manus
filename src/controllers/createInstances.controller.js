const { instanceGenerator } = require('../services/instanceGenerator');
const { createInstances, timeForQrCode } = require('../services/createInstances');

module.exports = {
  async startSession(req, res) {
    try {
      const { company, name } = req.body;
      if (!company || !name) {
        return res.status(400).json({ error: 'Empresa e nome são obrigatórios' });
      }
      const instance = await instanceGenerator(company, name);
      const result = await createInstances(instance);
      const Qrcode = await timeForQrCode(instance);

      if (!Qrcode) {
        return res.status(408).json({ error: 'QR Code não gerado a tempo' });
      }
      res.status(200).json({
        message: result.message,
        instance: result.instance,
        Qrcode: Qrcode.qrcode,
      });
    } catch (err) {
      console.error('❌ Erro ao iniciar sessão:', err.message);
      res.status(500).json({ error: 'Erro ao iniciar sessão' });
    }
  }
};
