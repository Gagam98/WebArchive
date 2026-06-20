export async function getPageInfoFromFetch(url) {
  if (!url) throw new Error('URL이 비어있습니다.');
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Prevent fetching chrome internal pages
  if (fullUrl.startsWith('chrome://') || fullUrl.startsWith('chrome-extension://')) {
    throw new Error('크롬 내부 페이지는 추가할 수 없습니다.');
  }

  const response = await fetch(fullUrl);
  if (!response.ok) throw new Error(`fetch 실패: ${response.status}`);
  const html = await response.text();

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch = html.match(
    /<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']*)["']/i
  );

  return {
    title: titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '',
    description: descMatch ? decodeHtmlEntities(descMatch[1].trim()) : '',
    source: 'fetch'
  };
}

// title, description에 &amp; &quot; 같은 HTML 엔티티가 섞여 나오는 경우가 많아 간단히 풀어줍니다
function decodeHtmlEntities(str) {
  const entities = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
  return str.replace(/&(amp|quot|#39|lt|gt);/g, (m) => entities[m]);
}
