// Singleton to manage the Web Worker
let worker = null;
let isReady = false;
let messageId = 0;
const callbacks = new Map();

export const initEmbeddingWorker = () => {
  if (worker) return;

  // Create the worker
  worker = new Worker(new URL('./embeddingWorker.js', import.meta.url), {
    type: 'module'
  });

  // Handle messages from the worker
  worker.addEventListener('message', (event) => {
    const { status, id, embedding, error, progress } = event.data;

    switch (status) {
      case 'progress':
        // Optional: you can expose progress to the UI
        console.log('Model loading progress:', progress);
        break;
      case 'ready':
        isReady = true;
        console.log('Embedding model is ready!');
        break;
      case 'complete':
        if (callbacks.has(id)) {
          callbacks.get(id).resolve(embedding);
          callbacks.delete(id);
        }
        break;
      case 'error':
        if (callbacks.has(id)) {
          callbacks.get(id).reject(new Error(error));
          callbacks.delete(id);
        }
        break;
    }
  });

  // Start initializing the model
  worker.postMessage({ action: 'init' });
};

/**
 * Get the embedding vector for a given text
 * @param {string} text - The input string (e.g., title + url + tags)
 * @returns {Promise<number[]>} Array of floats representing the embedding
 */
export const getEmbedding = (text) => {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized. Call initEmbeddingWorker() first.'));
      return;
    }

    const id = messageId++;
    callbacks.set(id, { resolve, reject });

    worker.postMessage({ action: 'embed', text, id });
  });
};

/**
 * Calculate the cosine similarity between two vectors
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} similarity score between -1 and 1
 */
export const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
