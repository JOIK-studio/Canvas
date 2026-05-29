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
    localStorage.setItem(key, json);
    return json.length;
  },

  // Cargar estado y descomprimir
  load(key) {
    const json = localStorage.getItem(key);
    if (!json) return null;
    try {
      const compressed = JSON.parse(json);
      return this.decompress(compressed);
    } catch (e) {
      console.error('Error decompressing:', e);
      return null;
    }
  },

  // Obtener estadísticas de compresión
  getStats(key) {
    const uncompressed = localStorage.getItem(key);
    if (!uncompressed) return null;

    try {
      const original = JSON.parse(uncompressed);
      const compressed = this.compress(original);
      const compressedJson = JSON.stringify(compressed);

      const originalSize = new Blob([uncompressed]).size;
      const compressedSize = new Blob([compressedJson]).size;
      const savings = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      return {
        originalSize,
        compressedSize,
        savings: savings + '%'
      };
    } catch (e) {
      return null;
    }
  }
};

// Inicializar el optimizador
StorageOptimizer.init();

// Reemplazar las funciones de guardado globales si existen
if (window.CANVAS_STATE) {
  window.CANVAS_STATE.save = function() {
    const size = StorageOptimizer.save('canvas_app_state_v3', this);
    console.log(`✓ State saved (${size} bytes)`);
  };

  const originalLoad = window.CANVAS_STATE.load;
  window.CANVAS_STATE.load = function() {
    const loaded = StorageOptimizer.load('canvas_app_state_v3');
    if (loaded) {
      Object.assign(this, loaded);
      return this;
    }
    return originalLoad.call(this);
  };
}

console.log('✓ Storage Optimizer loaded');
