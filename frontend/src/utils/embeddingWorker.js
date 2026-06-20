import { pipeline, env } from '@xenova/transformers';

// Skip local model check and use the remote HuggingFace models
// since Chrome extension might not have a local filesystem structure that transformers.js expects by default
env.allowLocalModels = false;

class PipelineSingleton {
  static task = 'feature-extraction';
  // Use a multilingual model suitable for Korean
  static model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { action, text, id } = event.data;

  if (action === 'init') {
    // Start loading the model in the background
    await PipelineSingleton.getInstance(x => {
      // Send progress updates back to main thread
      self.postMessage({ status: 'progress', progress: x });
    });
    self.postMessage({ status: 'ready' });
  } else if (action === 'embed') {
    try {
      const extractor = await PipelineSingleton.getInstance();
      
      // Perform feature extraction
      // pooling: 'mean' gives us a single vector representing the entire sentence/text
      // normalize: true is required for cosine similarity
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      // Extract the underlying Float32Array
      const embedding = Array.from(output.data);
      
      // Send the result back
      self.postMessage({ status: 'complete', id, embedding });
    } catch (error) {
      self.postMessage({ status: 'error', id, error: error.message });
    }
  }
});
