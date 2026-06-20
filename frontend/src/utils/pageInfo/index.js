import { getPageInfoFromTab, getPageInfoFromActiveTab } from './fromTab';
import { getPageInfoFromFetch } from './fromFetch';

export { getPageInfoFromActiveTab };

export async function getPageInfoSmart(url) {
  if (!url) throw new Error('URL이 비어있습니다.');
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    throw new Error('이 페이지는 추가할 수 없습니다.');
  }

  const patterns = buildMatchPatterns(url);
  const matchingTabs = await chrome.tabs.query({ url: patterns });

  if (matchingTabs.length > 0) {
    try {
      const info = await getPageInfoFromTab(matchingTabs[0].id);
      return { ...info, url };
    } catch (e) {
      console.warn('탭 읽기 실패, fetch로 전환합니다', e);
    }
  }

  const fetchInfo = await getPageInfoFromFetch(url);
  return { ...fetchInfo, url };
}

function buildMatchPatterns(url) {
  const clean = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return [`http://${clean}/*`, `https://${clean}/*`, `http://${clean}/`, `https://${clean}/`];
}
