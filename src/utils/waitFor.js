const waitFor = async (label = 'espera', durationMs = 1000) => {
  return new Promise((resolve) => {
    console.log(`⏳ Aguardando ${durationMs / 1000} segundos para: ${label}`);
    setTimeout(() => {
      console.log(`⏰ Finalizado o tempo de espera para: ${label}`);
      resolve();
    }, durationMs);
  });
};

module.exports = {
  waitFor,
}
