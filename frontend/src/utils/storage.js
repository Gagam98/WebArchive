export const storage = {
  async get(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
      });
    } else {
      // Fallback to localStorage for development environment
      const result = {};
      const keyArray = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys);
      
      keyArray.forEach(k => {
        const item = localStorage.getItem(`url-board-settings-${k}`);
        if (item) {
          try {
            result[k] = JSON.parse(item);
          } catch (e) {
            result[k] = item;
          }
        } else if (typeof keys === 'object' && !Array.isArray(keys)) {
          result[k] = keys[k]; // Default value
        }
      });
      return Promise.resolve(result);
    }
  },

  async set(items) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, resolve);
      });
    } else {
      // Fallback to localStorage
      Object.keys(items).forEach(k => {
        localStorage.setItem(`url-board-settings-${k}`, JSON.stringify(items[k]));
      });
      return Promise.resolve();
    }
  }
};
