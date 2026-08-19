const fs = require('fs-extra');
const path = require('path');
const { FieldValue } = require('firebase-admin/firestore');
const { db, bucket } = require('../config/firebaseAdmin');

const instances = db.collection('instances');

function requireBucket() {
  if (!bucket) throw new Error('FIREBASE_STORAGE_BUCKET não configurado');
  return bucket;
}

function instanceRef(instance) {
  return instances.doc(String(instance));
}

function serialize(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    qr_expires_at: data.qrExpiresAt?.toDate?.() || data.qr_expires_at || null,
    created_at: data.createdAt?.toDate?.() || data.created_at || null,
    updated_at: data.updatedAt?.toDate?.() || data.updated_at || null,
  };
}

async function upsertInstance(instance, data = {}) {
  const ref = instanceRef(instance);
  await ref.set(
    {
      instance: String(instance),
      updatedAt: FieldValue.serverTimestamp(),
      ...data,
    },
    { merge: true },
  );
  return serialize(await ref.get());
}

async function getInstance(instance) {
  return serialize(await instanceRef(instance).get());
}

async function saveQr(instance, qrcode, expiresAt) {
  return upsertInstance(instance, {
    status: 'qr_pending',
    qrcode,
    qrExpiresAt: expiresAt,
  });
}

async function markConnected(instance, phone) {
  return upsertInstance(instance, {
    status: 'connected',
    phone: phone || null,
    qrcode: null,
    qrExpiresAt: null,
  });
}

async function markDisconnected(instance, reason) {
  return upsertInstance(instance, {
    status: 'disconnected',
    disconnectReason: reason || null,
  });
}

async function uploadAuthDirectory(instance, authPath) {
  if (!(await fs.pathExists(authPath))) return;
  const files = await fs.readdir(authPath);
  await Promise.all(
    files.map(async (file) => {
      const localPath = path.join(authPath, file);
      const stat = await fs.stat(localPath);
      if (!stat.isFile()) return;
      await requireBucket().upload(localPath, {
        destination: `auth/${instance}/${file}`,
        metadata: { contentType: 'application/json' },
      });
    }),
  );
}

async function restoreAuthDirectory(instance, authPath) {
  const [files] = await requireBucket().getFiles({ prefix: `auth/${instance}/` });
  if (!files.length) return false;
  await fs.ensureDir(authPath);
  await Promise.all(
    files.map(async (file) => {
      const fileName = path.basename(file.name);
      if (!fileName) return;
      await file.download({ destination: path.join(authPath, fileName) });
    }),
  );
  return true;
}

async function deleteAuthDirectory(instance) {
  await requireBucket().deleteFiles({ prefix: `auth/${instance}/` });
}

module.exports = {
  getInstance,
  upsertInstance,
  saveQr,
  markConnected,
  markDisconnected,
  uploadAuthDirectory,
  restoreAuthDirectory,
  deleteAuthDirectory,
};
