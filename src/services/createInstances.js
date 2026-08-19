const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');
const {
  saveQr,
  markConnected,
  markDisconnected,
  uploadAuthDirectory,
  restoreAuthDirectory,
} = require('./firebaseStore');

const sockets = new Map();
const syncTimers = new Map();

function authPathFor(instance) {
  return path.resolve(__dirname, '..', 'auth', String(instance));
}

async function createInstances(instance) {
  const key = String(instance);
  if (sockets.has(key)) {
    return { message: 'Instância já está em execução!', instance: key };
  }

  const authFolder = authPathFor(key);
  await fs.ensureDir(authFolder);
  await restoreAuthDirectory(key, authFolder);

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['WatLab', 'Chrome', '10.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sockets.set(key, sock);
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => handleConnectionUpdate(key, sock, authFolder, update));

  return { message: 'Instância criada com sucesso!', instance: key };
}

async function handleConnectionUpdate(instance, sock, authFolder, update) {
  const { connection, qr, lastDisconnect } = update;
  if (qr) {
    const qrcode = await QRCode.toDataURL(qr);
    await saveQr(instance, qrcode, new Date(Date.now() + 5 * 60 * 1000));
  }

  if (connection === 'open') {
    const phone = sock.user?.id?.split(':')[0] || null;
    await markConnected(instance, phone);
    startAuthSync(instance, authFolder);
    return;
  }

  if (connection === 'close') {
    stopAuthSync(instance);
    sockets.delete(instance);
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    await uploadAuthDirectory(instance, authFolder).catch((error) =>
      console.error(`Falha ao sincronizar auth de ${instance}:`, error.message),
    );
    await markDisconnected(instance, String(statusCode || 'unknown'));

    if (!loggedOut) {
      setTimeout(() => createInstances(instance).catch((error) =>
        console.error(`Falha ao reconectar ${instance}:`, error.message),
      ), 3000);
    }
  }
}

function startAuthSync(instance, authFolder) {
  stopAuthSync(instance);
  const timer = setInterval(() => {
    uploadAuthDirectory(instance, authFolder).catch((error) =>
      console.error(`Falha no backup da sessão ${instance}:`, error.message),
    );
  }, 30_000);
  syncTimers.set(instance, timer);
}

function stopAuthSync(instance) {
  const timer = syncTimers.get(instance);
  if (timer) clearInterval(timer);
  syncTimers.delete(instance);
}

async function closeInstance(instance) {
  const key = String(instance);
  const sock = sockets.get(key);
  if (!sock) return false;
  stopAuthSync(key);
  sockets.delete(key);
  await uploadAuthDirectory(key, authPathFor(key));
  sock.ws?.close();
  await markDisconnected(key, 'manual_logout');
  return true;
}

async function timeForQrCode(instance, maxRetries = 20, delay = 500) {
  const { getInstance } = require('./firebaseStore');
  for (let i = 0; i < maxRetries; i += 1) {
    const record = await getInstance(instance);
    if (record?.qrcode) return { qrcode: record.qrcode };
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

module.exports = {
  createInstances,
  timeForQrCode,
  closeInstance,
  sockets,
};
