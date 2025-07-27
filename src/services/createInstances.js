require('dotenv').config();

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs-extra');
const path = require('path');
const connec = require('../connection/connection');
const { waitFor } = require('../utils/waitFor');

let sock;
const S3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const createInstances = async (instance) => {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando versão do WhatsApp Web: ${version}, atual? ${isLatest}`);

  const authFolder = path.resolve(__dirname, '..', 'auth', instance);
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    shouldSyncHistoryMessage: (msg) => false,
  });

  sock.ev.on('creds.update', saveCreds);

  /*   // ✅ Espera o evento de sincronização 100%
    sock.ev.on('messaging-history.set', async ({ progress }) => {
      if (progress === 100) {
        syncCompleted = true;
        console.log('✅ Sincronização de mensagens concluída (progress = 100)');
        await finalizeInstance(instance, authFolder); // 🔄 chama função que envia p/ S3 e encerra sessão
      }
    }); */

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;

    if (qr) await handleQr(update, instance);

    if (connection === 'open') {
      await handleOpen(instance, authFolder);
      setTimeout(async () => {
        await pauseInstance(sock, instance);
        await finalizeInstance(instance, authFolder); // 🔄 chama função que envia p/ S3 e encerra sessão
        console.log('🧹 Pasta removida após atraso seguro.');
      }, 10 * 60 * 1000); // 12 minutos para upload e logout
    }

    if (connection === 'close') await handleClose(update, instance);
  });

  return {
    message: `Instância criada com sucesso!`,
    instance: instance,
  };
};

const handleQr = async (update, instance) => {
  const { qr } = update;
  const dataQrCode = await QRCode.toDataURL(qr);
  const expires = new Date(Date.now() + 5 * 60 * 1000);

  const payload = {
    status: 'QrCode',
    qrcode: dataQrCode,
    qr_expires_at: expires,
    updated_at: connec.fn.now(),
  };

  const exists = await connec('instances')
    .where({ instance })
    .first();
  if (exists) {
    await connec('instances')
      .where({ instance })
      .update(payload);
  } else {
    await connec('instances')
      .insert({ instance, ...payload });
  }
};

const getQrCode = async (instance) => {
  const Qrcode = await connec('instances')
    .where({ instance })
    .select('qrcode')
    .first();

  return Qrcode;
};

const timeForQrCode = async (instance, maxRetries = 10, delay = 500) => {
  for (let i = 0; i < maxRetries; i++) {
    const qrcode = await getQrCode(instance);
    if (qrcode) return qrcode;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
};

const handleOpen = async (instance) => {
  const wId = sock.user.id.split(':')[0];

  await connec('instances')
    .where({ instance })
    .update({
      status: 'connected',
      phone: wId,
      qrcode: null,
      qr_expires_at: null,
      updated_at: connec.fn.now(),
    });
  console.log('✅ Conectado com sucesso:', wId);
};

const finalizeInstance = async (instance, authPath) => {
  const requiredFiles = ['creds.json'];
  const hasRequiredFiles = requiredFiles.every(file =>
    fs.existsSync(path.join(authPath, file))
  );
  if (!hasRequiredFiles) {
    console.warn('⚠️ Credenciais incompletas, adiando upload e logout.');
    return;
  }

  try {
    await uploadToS3(instance);
    console.log('🔒 Sessão encerrada com sucesso após upload.');
    await removeAuthFolder(instance); // só apaga agora
  } catch (err) {
    console.error('❌ Erro no finalizeInstance:', err.message);
  }
};

const pauseInstance = async (sock,instance) => {
  try {
    sock.ev.removeAllListeners('messages.upsert');
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');

    // Fecha o WebSocket se estiver aberto
    sock.ws.close();
    await new Promise(r => setTimeout(r, 1000)); // Aguarda um segundo para garantir que o WebSocket foi fechado
    console.log(`🛑 WebSocket da instância '${instance}' foi fechado.`);
    console.log(`⚠️ Instância '${instance}' pausada`);
  } catch (error) {
    console.error('❌ Erro ao pausar instância:', error.message);
  }
};

const handleClose = async (update, instance, authFolder) => {
  const { lastDisconnect } = update;
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const loggedOut = statusCode === DisconnectReason.loggedOut;

  console.log('🔌 Conexão encerrada, por:', statusCode);

  if (loggedOut) {
    await removeAuthFolder(instance);
  }

  await connec('instances')
    .where({ instance })
    .update({
      status: loggedOut ? 'disconnected' : 'disconnected',
      updated_at: connec.fn.now(),
    });

  if (!loggedOut) {
    console.log(`🔄 Tentando reconectar instância: ${instance}`);
    await createInstances(instance);
  } else {
    // Se desconectou por logout, pode aguardar nova chamada para criação
    console.log('⚠️ Sessão finalizada via logout. Aguardando nova criação.');
  }
};

const uploadToS3 = async (instance) => {
  const authPath = path.join(__dirname, '..', 'auth', instance);

  if (!await fs.pathExists(authPath)) {
    console.warn(`⚠️ Caminho de autenticação não encontrado: ${authPath}`);
    return;
  }

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
};

const removeAuthFolder = async (instance) => {
  const authPath = path.resolve(__dirname, '..', 'auth', instance);

  const timeoutMs = 15 * 60 * 1000; // 15 minutos
  const timeoutId = setTimeout(() => {
    console.error(`⏰ Timeout ao tentar remover pasta ${authPath}`);
  }, timeoutMs);

  try {
    await waitFor('Remoção da pasta de autenticação', 2 * 60 * 1000); // 2 minutos

    if (await fs.pathExists(authPath)) {
      await fs.remove(authPath);
      console.log(`🧹 Pasta de autenticação ${authPath} removida com sucesso!`);
    } else {
      console.warn(`⚠️ Pasta de autenticação ${authPath} não encontrada para remover.`);
    }
  } catch (err) {
    throw new Error(`❌ Erro ao remover pasta ${authPath}: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
};


module.exports = {
  createInstances,
  timeForQrCode
};
