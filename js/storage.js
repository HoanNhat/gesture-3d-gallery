/**
 * Ethan Vale - I See Through the Wild
 * Local Archival Storage & Persistence Layer
 * Powered by IndexedDB (GalleryDB) with fallback to localStorage.
 * Enables persistent custom user specimen uploads, metadata management,
 * and seamless dynamic 3D gallery updates.
 */

import { DEMO_ITEMS } from './config.js';

const DB_NAME = 'GalleryDB';
const DB_VERSION = 1;
const STORE_NAME = 'artworks';
const LOCAL_STORAGE_KEY = 'gesture_gallery_artworks_fallback';

class StorageManager {
  constructor() {
    this.db = null;
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
    this._initPromise = null;
  }

  /**
   * Initializes IndexedDB database and object stores.
   * If fresh, seeds the database with the default curated DEMO_ITEMS.
   * Automatically synchronizes and prunes legacy demo items to match DEMO_ITEMS.
   * @returns {Promise<IDBDatabase|null>}
   */
  async init() {
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve) => {
      if (!this.isIndexedDBAvailable) {
        console.warn('⚠️ [Storage] IndexedDB not available, using localStorage fallback');
        this._syncLocalStorageDefaults();
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('isCustom', 'isCustom', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        try {
          // Check if database needs seeding or synchronizing with default items
          const items = await this._getAllFromIDB();
          if (!items || items.length === 0) {
            console.log('📦 [Storage] Seeding fresh database with default archive items...');
            await this._seedDefaults();
          } else {
            const validDefaultIds = new Set(DEMO_ITEMS.map((item) => String(item.id)));
            const legacyDefaults = items.filter(
              (item) => (item.isDefault || !item.isCustom) && !validDefaultIds.has(String(item.id))
            );
            const hasCustom = items.some((item) => item.isCustom);

            if (legacyDefaults.length > 0 || (!hasCustom && items.length > DEMO_ITEMS.length)) {
              console.log('📦 [Storage] Synchronizing archive with curated 3-specimen collection...');
              if (!hasCustom) {
                // If user has no custom uploads, cleanly re-seed the exact 3 defaults
                await new Promise((resolveTx, rejectTx) => {
                  const tx = this.db.transaction([STORE_NAME], 'readwrite');
                  const store = tx.objectStore(STORE_NAME);
                  const req = store.clear();
                  req.onsuccess = () => resolveTx();
                  req.onerror = () => rejectTx(tx.error);
                });
                await this._seedDefaults();
              } else {
                // User has custom items: preserve them and prune obsolete defaults
                await new Promise((resolveTx, rejectTx) => {
                  const tx = this.db.transaction([STORE_NAME], 'readwrite');
                  const store = tx.objectStore(STORE_NAME);
                  legacyDefaults.forEach((item) => store.delete(item.id));
                  tx.oncomplete = () => resolveTx();
                  tx.onerror = () => rejectTx(tx.error);
                });
              }
            }
          }
        } catch (err) {
          console.warn('[Storage] Error checking/seeding defaults:', err);
        }
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn('⚠️ [Storage] IndexedDB open error, falling back to localStorage:', event.target.error);
        this.db = null;
        resolve(null);
      };
    });

    return this._initPromise;
  }

  /**
   * Populates the database with initial DEMO_ITEMS.
   */
  async _seedDefaults() {
    const prepared = DEMO_ITEMS.map((item, index) => ({
      ...item,
      id: String(item.id),
      order: index,
      isDefault: true,
      isCustom: false,
      createdAt: Date.now() + index
    }));

    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        prepared.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prepared));
    }
  }

  /**
   * Synchronizes localStorage fallback store with DEMO_ITEMS, pruning legacy defaults.
   */
  _syncLocalStorageDefaults() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        this._seedDefaults();
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this._seedDefaults();
        return;
      }
      const validDefaultIds = new Set(DEMO_ITEMS.map((item) => String(item.id)));
      const hasCustom = parsed.some((item) => item.isCustom);
      if (!hasCustom && parsed.length > DEMO_ITEMS.length) {
        this._seedDefaults();
      } else {
        const cleaned = parsed.filter(
          (item) => item.isCustom || validDefaultIds.has(String(item.id))
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
        }
      }
    } catch (err) {
      console.warn('[Storage] LocalStorage sync failed:', err);
    }
  }

  /**
   * Internal query to retrieve all records from IndexedDB.
   */
  _getAllFromIDB() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves all artworks (user uploaded + default collection).
   * @returns {Promise<Array<Object>>}
   */
  async getAllArtworks() {
    await this.init();

    if (this.db) {
      try {
        const items = await this._getAllFromIDB();
        if (items && items.length > 0) {
          // Sort items: preserve natural sequence
          return items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        // Fallback seed if empty
        await this._seedDefaults();
        return await this._getAllFromIDB();
      } catch (err) {
        console.error('[Storage] Error loading from IndexedDB:', err);
      }
    }

    // LocalStorage Fallback
    try {
      this._syncLocalStorageDefaults();
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
      }
    } catch (err) {
      console.warn('[Storage] LocalStorage read failed:', err);
    }

    return DEMO_ITEMS.map((item, index) => ({
      ...item,
      id: String(item.id),
      isDefault: true,
      isCustom: false,
      createdAt: Date.now() + index
    }));
  }

  /**
   * Stores a new custom artwork into the archive.
   * @param {Object} item Artwork details
   * @returns {Promise<Object>} The saved artwork
   */
  async addArtwork(item) {
    await this.init();

    const id = item.id ? String(item.id) : `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newArtwork = {
      id,
      title: item.title || 'Untitled Specimen',
      subtitle: item.subtitle || 'Field Plate',
      author: item.author || 'Le Nhat',
      date: item.date || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
      location: item.location || 'Undisclosed Coordinates',
      camera: item.camera || 'Curator Archive Capture',
      accentColor: item.accentColor || '#c9a875',
      image: item.image,
      description: item.description || 'No curatorial notes recorded for this specimen.',
      isCustom: true,
      isDefault: false,
      createdAt: Date.now()
    };

    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(newArtwork);
        req.onsuccess = () => resolve(newArtwork);
        req.onerror = () => reject(req.error);
      });
    } else {
      const all = await this.getAllArtworks();
      all.push(newArtwork);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
      } catch (e) {
        console.warn('[Storage] LocalStorage quota exceeded:', e);
      }
    }

    return newArtwork;
  }

  /**
   * Deletes a specific artwork by ID.
   * @param {string|number} id Target artwork ID
   * @returns {Promise<boolean>}
   */
  async deleteArtwork(id) {
    await this.init();
    const strId = String(id);

    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(strId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
      return true;
    } else {
      const all = await this.getAllArtworks();
      const filtered = all.filter((item) => String(item.id) !== strId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    }
  }

  /**
   * Clears custom uploads and restores the default curated archival collection.
   * @returns {Promise<Array<Object>>} Default items
   */
  async resetToDefaults() {
    await this.init();

    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await this._seedDefaults();
      return await this._getAllFromIDB();
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      await this._seedDefaults();
      return await this.getAllArtworks();
    }
  }

  /**
   * Client-side image processor: compresses and resizes user photo uploads
   * to ensure rapid WebGL texture generation without memory bloat.
   * @param {File} file Uploaded image file
   * @param {number} [maxWidth=1920]
   * @param {number} [maxHeight=1440]
   * @param {number} [quality=0.88]
   * @returns {Promise<{ dataUrl: string, width: number, height: number, sizeBytes: number }>}
   */
  static processImageFile(file, maxWidth = 1920, maxHeight = 1440, quality = 0.88) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Compute aspect ratio scaling
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Output high-quality compressed JPEG data URL
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            dataUrl,
            width,
            height,
            sizeBytes: Math.round((dataUrl.length * 3) / 4)
          });
        };
        img.onerror = () => reject(new Error('Unable to read selected image.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(file);
    });
  }
}

export const ArtworkStorage = new StorageManager();
ArtworkStorage.processImageFile = StorageManager.processImageFile;
