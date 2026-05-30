// localStorage Compression & Optimization Module
const StorageOptimizer = {
  // Mapping de keys largas a cortas para ahorrar espacio
  KEY_MAP: {
    'user': 'u',
    'name': 'n',
    'email': 'e',
    'coins': 'c',
    'pixelsInventory': 'px',
    'charges': 'ch',
    'maxCharges': 'mc',
    'rechargeSeconds': 'rs',
    'lastChargeTime': 'lct',
    'creations': 'cr',
    'id': 'id',
    'title': 't',
    'pixelData': 'pd',
    'likes': 'l',
    'comments': 'co',
    'boosts': 'b',
    'published': 'pub',
    'events': 'ev',
    'type': 'ty',
    'timestamp': 'ts',
    'artwork': 'art',
    'description': 'd',
    'likesGiven': 'lg',
    'remixSourceId': 'r'
  },

  // Reverse mapping para decompresión
  REVERSE_KEY_MAP: {},

  // Inicializar reverse map
  init() {
    Object.entries(this.KEY_MAP).forEach(([long, short]) => {
      this.REVERSE_KEY_MAP[short] = long;
    });
  },

  // Comprimir un objeto
  compress(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.compress(item));
    }
    
    if (typeof obj !== 'object') return obj;
    
    const compressed = {};
    for (const [key, value] of Object.entries(obj)) {
      const shortKey = this.KEY_MAP[key] || key;
      compressed[shortKey] = typeof value === 'object' 
        ? this.compress(value) 
        : value;
    }
    return compressed;
  },

  // Descomprimir un objeto
  decompress(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.decompress(item));
    }
    
    if (typeof obj !== 'object') return obj;
    
    const decompressed = {};
    for (const [key, value] of Object.entries(obj)) {
      const longKey = this.REVERSE_KEY_MAP[key] || key;
      decompressed[longKey] = typeof value === 'object' 
        ? this.decompress(value) 
        : value;
    }
    return decompressed;
  },

  // Guardar estado comprimido
  save(key, state) {
    const compressed = this.compress(state);
    const json = JSON.stringify(compressed);
    return json.length;
  },

  // Cargar estado y descomprimir
  load(_key) {
    return null;
  },

  // Obtener estadísticas de compresión
  getStats(_key) {
    return null;
  }
};

// Inicializar el optimizador
StorageOptimizer.init();

console.log('✓ Storage Optimizer loaded');
