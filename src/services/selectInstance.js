const connec = require('../connection/connection');

const selectInstance = async (instance) => {
  const instanceSelected = await connec('instances')
    .where('instance', instance)
    .select([
      'instances.*'
    ]);

  return instanceSelected;
}

module.exports = {
  selectInstance,
};