import { cosineSimilarity } from './embedding';

const DB_NAME = 'rag_workspace';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pages')) {
        const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
        pageStore.createIndex('groupId', 'groupId', { unique: false });
      } else if (e.oldVersion < 2) {
        const pageStore = e.currentTarget.transaction.objectStore('pages');
        pageStore.createIndex('groupId', 'groupId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('chunks')) {
        const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
        chunkStore.createIndex('pageId', 'pageId', { unique: false });
        chunkStore.createIndex('groupId', 'groupId', { unique: false });
      } else if (e.oldVersion < 2) {
        const chunkStore = e.currentTarget.transaction.objectStore('chunks');
        chunkStore.createIndex('groupId', 'groupId', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePageChunks(pageId, pageMeta, chunks) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pages', 'chunks'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    
    tx.objectStore('pages').put(pageMeta);
    const chunkStore = tx.objectStore('chunks');
    for (const chunk of chunks) {
      chunkStore.put(chunk);
    }
  });
}

export async function getPagesByGroupId(groupId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    const index = store.index('groupId');
    const request = index.getAll(groupId);
    request.onsuccess = () => {
      // Sort by collectedAt descending
      const pages = request.result || [];
      pages.sort((a, b) => b.collectedAt - a.collectedAt);
      resolve(pages);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deletePage(pageId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pages', 'chunks'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    
    tx.objectStore('pages').delete(pageId);
    
    const chunkStore = tx.objectStore('chunks');
    const index = chunkStore.index('pageId');
    const request = index.getAllKeys(pageId);
    request.onsuccess = () => {
      for (const key of request.result) {
        chunkStore.delete(key);
      }
    };
  });
}

export async function searchSimilarChunks(queryEmbedding, groupId, topK = 5) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chunks', 'readonly');
    const store = tx.objectStore('chunks');
    const index = store.index('groupId');
    const request = index.getAll(groupId);
    
    request.onsuccess = () => {
      const allChunks = request.result || [];
      const chunksWithScore = allChunks.map(chunk => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        return { ...chunk, score };
      });
      
      chunksWithScore.sort((a, b) => b.score - a.score);
      resolve(chunksWithScore.slice(0, topK));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRagGroupData(groupId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pages', 'chunks'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    
    // Delete pages in group
    const pageStore = tx.objectStore('pages');
    const pageIndex = pageStore.index('groupId');
    const pageRequest = pageIndex.getAllKeys(groupId);
    pageRequest.onsuccess = () => {
      for (const key of pageRequest.result) {
        pageStore.delete(key);
      }
    };

    // Delete chunks in group
    const chunkStore = tx.objectStore('chunks');
    const chunkIndex = chunkStore.index('groupId');
    const chunkRequest = chunkIndex.getAllKeys(groupId);
    chunkRequest.onsuccess = () => {
      for (const key of chunkRequest.result) {
        chunkStore.delete(key);
      }
    };
  });
}

export async function getChunksByPageId(pageId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chunks', 'readonly');
    const store = tx.objectStore('chunks');
    const index = store.index('pageId');
    const request = index.getAll(pageId);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
