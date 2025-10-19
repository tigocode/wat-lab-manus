const { instanceGenerator } = require("../services/instanceGenerator");
const {
  createInstances,
  timeForQrCode,
} = require("../services/createInstances");
const { selectInstance } = require("../services/selectInstance");

const { v4: uuidv4 } = require("uuid");

// 🧠 Armazenamento temporário dos QR Codes em memória
const qrStore = new Map();

// Função auxiliar para salvar com tempo de expiração (10 minutos)
function setQr(id, base64) {
  qrStore.set(id, base64);
  setTimeout(() => qrStore.delete(id), 10 * 60 * 1000); // 10 minutos
}

module.exports = {
  async startSession(req, res) {
    try {
      const { company, name } = req.body;
      if (!company || !name) {
        return res
          .status(400)
          .json({ error: "Empresa e nome são obrigatórios" });
      }
      const instance = await instanceGenerator(company, name);
      const result = await createInstances(instance);
      const Qrcode = await timeForQrCode(instance);

      if (!Qrcode) {
        return res.status(408).json({ error: "QR Code não gerado a tempo" });
      }
      res.status(200).json({
        message: result.message,
        instance: result.instance,
        Qrcode: Qrcode.qrcode,
      });
    } catch (err) {
      console.error("❌ Erro ao iniciar sessão:", err.message);
      res.status(500).json({ error: "Erro ao iniciar sessão" });
    }
  },
  async generateQRLink(req, res) {
    try {
      const { base64 } = req.body;

      if (!base64 || !base64.startsWith("data:image/png;base64,")) {
        return res.status(400).json({
          error: "Formato inválido. Envie data:image/png;base64,...",
        });
      }

      const id = uuidv4();
      setQr(id, base64); // 🔥 Armazena com expiração automática

      const link = `${req.protocol}://${req.get(
        "host"
      )}/qr/viewer.html?id=${id}`;
      return res.status(200).json({ link, id });
    } catch (err) {
      console.error("❌ Erro ao gerar link QR Code:", err);
      return res.status(500).json({ error: "Erro interno ao gerar link" });
    }
  },
  async searchID(req, res) {
    try {
      const { id } = req.params;
      const base64 = qrStore.get(id);

      if (!base64) {
        return res
          .status(404)
          .json({ error: "QR Code não encontrado ou expirado" });
      }

      return res.json({ base64 });
    } catch (err) {
      console.error("❌ Erro ao buscar QR Code:", err);
      return res.status(500).json({ error: "Erro interno ao buscar QR Code" });
    }
  },

  async Index(req, res) {
    try {
      const { instance } = req.body;

      if (!instance) {
        return res.status(404).json({ error: "Instancia não existe" });
      }

      const response = await selectInstance(instance);

      return res.json({ response });
    } catch (err) {
      console.error("❌ Erro ao buscar QR Code:", err);
      return res.status(500).json({ error: "Erro interno ao buscar QR Code" });
    }
  },
};
