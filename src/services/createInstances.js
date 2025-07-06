require('dotenv').config();

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs-extra');
const path = require('path');
const connec = require('../connection/connection');

let sock;
const S3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const createInstances = async (instance, phoneNumber = null) => {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando versão do WhatsApp Web: ${version}, atual? ${isLatest}`);

  const authFolder = path.resolve(__dirname, '..', 'auth', instance);
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  sock = makeWASocket({
    version,
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;

    if (qr && !phoneNumber) {
      await handleQr(update, instance);
    }

    if (connection === 'open') {
      await handleOpen(instance);
    }

    if (connection === 'close') {
      await handleClose(update, instance, phoneNumber);
    }

    if (connection === 'connecting' && phoneNumber && !sock.authState.creds?.registered) {
      console.log('Estado do sock.authState.creds:', sock.authState.creds);
      await handlePairing(instance, phoneNumber);
    }
  });

  return { message: `Instância ${instance} criada com sucesso!`, instance, sock };
};

const handleQr = async (update, instance) => {
  const { qr } = update;
  const dataQrCode = await QRCode.toDataURL(qr);
  const expires = new Date(Date.now() + 5 * 60 * 1000);
  const payload = {
    status: 'QrCode',
    qrcode_or_pairingcode: dataQrCode,
    qr_expires_at: expires,
    updated_at: connec.fn.now(),
  };

  const exists = await connec('instances').where({ instance }).first();
  if (exists) await connec('instances').where({ instance }).update(payload);
  else await connec('instances').insert({ instance, ...payload });
};

const handleOpen = async (instance) => {
  const wId = sock.user.id.split(':')[0];
  await connec('instances')
    .where({ instance })
    .update({
      status: 'connected',
      phone: wId,
      qrcode_or_pairingcode: null,
      qr_expires_at: null,
      updated_at: connec.fn.now(),
    });

  console.log('✅ Conectado com sucesso:', wId);
  try {
    await uploadToS3(instance);
  } catch (err) {
    console.error('❌ Erro ao mover arquivos para o S3:', err.message);
  }
};

const handleClose = async (update, instance, phoneNumber) => {
  const { lastDisconnect } = update;
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const loggedOut = statusCode === DisconnectReason.loggedOut;
  console.log('🔌 Conexão encerrada, por:', statusCode);

  if (loggedOut) {
    const authPath = path.resolve(__dirname, '..', 'auth', instance);
    try {
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`Pasta de autenticação ${authPath} removida com sucesso!`);
      }
    } catch (err) {
      console.error(`❌ Erro ao remover pasta de autenticação: ${authPath}`, err.message);
    }
  }

  await connec('instances')
    .where({ instance })
    .update({
      status: loggedOut ? 'disconnected' : 'disconnected',
      updated_at: connec.fn.now(),
    });

  if (!loggedOut) {
    console.log(`🔄 Tentando reconectar instância: ${instance}`);
    createInstances(instance, phoneNumber);
  }
};

const handlePairing = async (instance, phoneNumber) => {
  try {
    const code = await sock.requestPairingCode(`55${phoneNumber.replace(/\D/g, '')}`);
    console.log('✅ Código de emparelhamento gerado:', code);

    const payload = {
      status: 'PairingCode',
      qrcode_or_pairingcode: code,
      updated_at: connec.fn.now(),
    };
    const exists = await connec('instances').where({ instance }).first();
    if (exists) await connec('instances').where({ instance }).update(payload);
    else await connec('instances').insert({ instance, ...payload });
  } catch (err) {
    console.error('❌ Erro ao solicitar código de emparelhamento:', err.message);
  }
};

const uploadToS3 = async (instance) => {
  const authPath = path.join(__dirname, '..', 'auth', instance);

  if (!await fs.pathExists(authPath)) {
    console.warn(`Caminho de autenticação não encontrado: ${authPath}`);
    return;
  }

  try {
    const files = await fs.readdir(authPath);
    for (const file of files) {
      const filePath = path.join(authPath, file);
      const fileContent = await fs.readFile(filePath);

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `auth/${instance}/${file}`,
        Body: fileContent,
        ContentType: 'application/json',
      });

      await S3.send(command);
      console.log(`🟢 Arquivo ${file} enviado para o S3 com sucesso!`);
    }
  } finally {
    await fs.remove(authPath);
    console.log(`🧹 Pasta de autenticação ${authPath} removida com sucesso!`);
  }
}

module.exports = {
  createInstances,
}
