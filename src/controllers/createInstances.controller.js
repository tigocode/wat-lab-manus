const crypto = require('crypto');
const { createInstances, timeForQrCode, closeInstance } = require('../services/createInstances');
const { instanceGenerator } = require('../services/instanceGenerator');
const { getInstance } = require('../services/firebaseStore');

module.exports = {
  async startSession(req, res) {
    try {
      const { company, name } = req.body || {};
      if (!company || !name) {
        return res.status(400).json({ error: 'Empresa e nome são obrigatórios' });
      }
      const instance = await instanceGenerator(company, name);
      const result = await createInstances(instance);
      const qr = await timeForQrCode(instance);
      if (!qr) return res.status(408).json({ error: 'QR Code não gerado a tempo' });
      return res.status(200).json({ message: result.message, instance: result.instance, Qrcode: qr.qrcode });
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      return res.status(500).json({ error: 'Erro ao iniciar sessão' });
    }
  },

  async generateQRLink(req, res) {
    try {
      const { base64 } = req.body || {};
      if (!base64 || !base64.startsWith('data:image/png;base64,')) {
        return res.status(400).json({ error: 'Formato inválido. Envie data:image/png;base64,...' });
      }
      const id = crypto.randomUUID();
      const { upsertInstance } = require('../services/firebaseStore');
      await upsertInstance(id, {
        status: 'qr_pending',
        qrcode: base64,
        qrExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      const link = `${req.protocol}://${req.get('host')}/qr/viewer.html?id=${id}`;
      return res.status(200).json({ link, id });
    } catch (error) {
      console.error('Erro ao gerar link QR Code:', error);
      return res.status(500).json({ error: 'Erro interno ao gerar link' });
    }
  },

  async searchID(req, res) {
    try {
      const record = await getInstance(req.params.id);
      if (!record?.qrcode) return res.status(404).json({ error: 'QR Code não encontrado ou expirado' });
      if (record.qr_expires_at && new Date(record.qr_expires_at).getTime() < Date.now()) {
        return res.status(404).json({ error: 'QR Code expirado' });
      }
      return res.json({ base64: record.qrcode });
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar QR Code' });
    }
  },

  async index(req, res) {
    try {
      const { instance } = req.body || {};
      if (!instance) return res.status(400).json({ error: 'Instância é obrigatória' });
      const response = await getInstance(instance);
      if (!response) return res.status(404).json({ error: 'Instância não encontrada' });
      return res.json({ response });
    } catch (error) {
      console.error('Erro ao buscar instância:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar instância' });
    }
  },

  async logout(req, res) {
    try {
      const { instance } = req.body || {};
      if (!instance) return res.status(400).json({ error: 'Instância é obrigatória' });
      const closed = await closeInstance(instance);
      if (!closed) return res.status(404).json({ error: 'Instância não está em execução' });
      return res.json({ message: 'Sessão encerrada com sucesso' });
    } catch (error) {
      console.error('Erro ao encerrar instância:', error);
      return res.status(500).json({ error: 'Erro interno ao encerrar instância' });
    }
  },
};
