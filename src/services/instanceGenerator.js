const crypto = require('crypto');

const instanceGenerator = async (company, name) => {
  const hashcompany = await extractedFirstAndLast(company);
  const hashname = await extractedFirstAndLast(name);

  const instance = `${hashcompany}${hashname}`;

  const hash = crypto.createHash('sha256').update(instance).digest('hex');
  const numericHash = parseInt(hash.slice(0, 8), 16);
  const code = (numericHash % 900000) + 100000;

  return code.toString();
};

const extractedFirstAndLast = async (text) => {
  const partsText = text.split('');
  const first = partsText[0].toUpperCase();
  const last = partsText[partsText.length - 1].toUpperCase();

  return `${first}${last}`;
}

module.exports = {
  instanceGenerator,
}
