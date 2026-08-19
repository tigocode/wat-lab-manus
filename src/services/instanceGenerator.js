const crypto = require('crypto');

function firstAndLast(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('Valor inválido para geração da instância');
  return `${text[0]}${text[text.length - 1]}`.toUpperCase();
}

async function instanceGenerator(company, name) {
  const seed = `${firstAndLast(company)}${firstAndLast(name)}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const numericHash = parseInt(hash.slice(0, 8), 16);
  return String((numericHash % 900000) + 100000);
}

module.exports = { instanceGenerator };
