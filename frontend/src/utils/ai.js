import { storage } from './storage';

export const generateText = async (prompt) => {
  const data = await storage.get({ aiProvider: 'openai', aiApiKey: '' });
  const { aiProvider, aiApiKey } = data;

  if (!aiApiKey) {
    throw new Error('API 키가 설정되지 않았습니다. RAG 워크스페이스 설정에서 API 키를 등록해주세요.');
  }

  try {
    if (aiProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });
      
      if (!response.ok) throw new Error('OpenAI API 오류');
      const json = await response.json();
      return json.choices[0].message.content;
    } 
    
    else if (aiProvider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });
      
      if (!response.ok) throw new Error('Gemini API 오류');
      const json = await response.json();
      return json.candidates[0].content.parts[0].text;
    }
    
    else if (aiProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': aiApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });
      
      if (!response.ok) throw new Error('Anthropic API 오류');
      const json = await response.json();
      return json.content[0].text;
    }
    
    throw new Error('지원하지 않는 AI 제공자입니다.');
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw error;
  }
};
