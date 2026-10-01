/*
 * Carica i moduli "puri" del gioco (senza DOM) nell'oggetto globale RR,
 * nello stesso ordine usato da index.html.
 */
const path = require('path');

for (const file of ['config', 'utils', 'track', 'game']) {
  require(path.join(__dirname, '..', 'src', file + '.js'));
}

/* Storage finto in memoria, con la stessa interfaccia usata dal gioco. */
function memoryStorage() {
  const data = {};
  return {
    get: (key) => (key in data ? data[key] : null),
    set: (key, value) => { data[key] = String(value); },
    data
  };
}

module.exports = { RR: globalThis.RR, memoryStorage };
