const { instanceGenerator } = require('../services/instanceGenerator');
const { createInstances } = require('../services/createInstances');

module.exports = {
  async startSession(req, res) {
    try {
      const { company, name, phoneNumber } = req.body;
      if (!company || !name) {
        return res.status(400).json({ error: 'Empresa e nome são obrigatórios' });
      }
      const instance = await instanceGenerator(company, name);
      const result = await createInstances(instance, phoneNumber);
      res.status(200).json({
        return: result.message
      });
    } catch (err) {
      console.error('❌ Erro ao iniciar sessão:', err.message);
      res.status(500).json({ error: 'Erro ao iniciar sessão' });
    }
  }
};
