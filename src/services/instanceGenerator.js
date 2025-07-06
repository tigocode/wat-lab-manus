const instanceGenerator = async (company, name) => {
  const hashNumber = Math.floor(Math.random() * 900000) + 100000;

  const hashcompany = await extractedFirstAndLast(company);
  const hashname = await extractedFirstAndLast(name);

  const instance = `${hashcompany}${hashname}-${hashNumber}`;

  return instance;
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
