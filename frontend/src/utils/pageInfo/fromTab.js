export async function getPageInfoFromTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const getMeta = (name) =>
        document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || '';
      return {
        title: document.title || '',
        description: getMeta('description') || getMeta('og:description') || ''
      };
    }
  });
  return { ...result, source: 'tab' };
}

export async function getPageInfoFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('활성 탭을 찾을 수 없습니다');
  // Avoid trying to script chrome internal pages
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    throw new Error('이 페이지는 추가할 수 없습니다 (크롬 내부 페이지 또는 URL 없음).');
  }
  const info = await getPageInfoFromTab(tab.id);
  return { ...info, url };
}
