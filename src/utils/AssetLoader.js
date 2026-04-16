// AssetLoader.js - Simple texture/asset loader
import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const cache = {};

export const AssetLoader = {
  loadTexture(path) {
    if (cache[path]) return cache[path];
    const tex = textureLoader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache[path] = tex;
    return tex;
  },

  async loadAll() {
    // Preload placeholder textures (will use procedural textures if files missing)
    return Promise.resolve();
  },
};
