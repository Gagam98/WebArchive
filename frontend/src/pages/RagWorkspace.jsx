import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import { getPageContentFromTab } from '../utils/pageInfo/fromTab';
import { chunkText } from '../utils/chunker';
import { getEmbedding } from '../utils/embedding';
import { savePageChunks, getPagesByGroupId, deletePage, searchSimilarChunks, deleteRagGroupData } from '../utils/vectorDB';
import { generateText } from '../utils/ai';

export default function RagWorkspace() {
  const [ragGroups, setRagGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  
  // Group editing state
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // RAG Workspace states
  const [pages, setPages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  // API Key Settings
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadRagGroups();
  }, []);

  useEffect(() => {
    if (activeGroupId) {
      loadPages();
      setMessages([]); // Clear chat when switching groups
    }
  }, [activeGroupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSettings = async () => {
    const data = await storage.get({ aiProvider: 'openai', aiApiKey: '' });
    setProvider(data.aiProvider);
    setApiKey(data.aiApiKey);
  };

  const saveSettings = async () => {
    await storage.set({ aiProvider: provider, aiApiKey: apiKey });
    setShowSettings(false);
    alert('설정이 저장되었습니다.');
  };

  const loadRagGroups = async () => {
    const data = await storage.get({ ragGroups: [] });
    setRagGroups(data.ragGroups);
  };

  const saveRagGroups = async (newGroups) => {
    await storage.set({ ragGroups: newGroups });
    setRagGroups(newGroups);
  };

  // --- Group List Mode Functions ---

  const addRagGroup = async () => {
    const newId = `rag_group_${Date.now()}`;
    const newGroup = { id: newId, title: '' };
    const newGroups = [...ragGroups, newGroup];
    await saveRagGroups(newGroups);
    setEditingGroupId(newId);
    setEditTitle('');
  };

  const startEditGroup = (e, group) => {
    e.stopPropagation();
    setEditingGroupId(group.id);
    setEditTitle(group.title);
  };

  const saveEditGroup = async (id) => {
    const finalTitle = editTitle.trim() || '새 RAG 그룹';
    const newGroups = ragGroups.map(g => g.id === id ? { ...g, title: finalTitle } : g);
    await saveRagGroups(newGroups);
    setEditingGroupId(null);
  };

  const cancelEditGroup = async (id) => {
    const group = ragGroups.find(g => g.id === id);
    if (group && group.title === '') {
      const newGroups = ragGroups.filter(g => g.id !== id);
      await saveRagGroups(newGroups);
    }
    setEditingGroupId(null);
  };

  const deleteRagGroup = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('이 RAG 그룹과 내부에 수집된 모든 페이지 데이터를 삭제하시겠습니까?')) {
      const newGroups = ragGroups.filter(g => g.id !== id);
      await saveRagGroups(newGroups);
      // Clean up vectorDB
      await deleteRagGroupData(id);
    }
  };

  // --- RAG Workspace Mode Functions ---

  const loadPages = async () => {
    if (!activeGroupId) return;
    const groupPages = await getPagesByGroupId(activeGroupId);
    setPages(groupPages);
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm('이 페이지를 삭제하시겠습니까?')) return;
    await deletePage(pageId);
    await loadPages();
  };

  const collectCurrentTab = async () => {
    if (!activeGroupId) return;
    setIsCollecting(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('활성 탭을 찾을 수 없습니다.');
      
      const content = await getPageContentFromTab(tab.id);
      if (!content.content || content.content.length < 50) {
        throw new Error('페이지 본문을 충분히 추출하지 못했습니다.');
      }
      
      const pageId = `page_${Date.now()}`;
      const chunks = chunkText(content.content, 500, 50);
      
      const chunksWithEmbedding = await Promise.all(
        chunks.map(async (text, i) => {
          const textToEmbed = `${content.title} ${text}`.trim();
          const embedding = await getEmbedding(textToEmbed);
          return {
            id: `${pageId}_${i}`,
            pageId,
            groupId: activeGroupId,
            url: content.url,
            title: content.title,
            text,
            embedding,
            chunkIndex: i
          };
        })
      );
      
      await savePageChunks(pageId, {
        id: pageId,
        groupId: activeGroupId,
        url: content.url,
        title: content.title,
        collectedAt: Date.now(),
        chunkCount: chunks.length,
        status: 'ready'
      }, chunksWithEmbedding);
      
      await loadPages();
    } catch (e) {
      console.error(e);
      alert(e.message || '페이지 수집에 실패했습니다.');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || isThinking || !activeGroupId) return;
    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsThinking(true);
    
    try {
      const queryEmbedding = await getEmbedding(question);
      const topChunks = await searchSimilarChunks(queryEmbedding, activeGroupId, 5);
      
      if (topChunks.length === 0) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '이 그룹에 수집된 페이지가 없습니다. 먼저 페이지를 수집해주세요.',
          sources: []
        }]);
        setIsThinking(false);
        return;
      }
      
      const context = topChunks.map((c, i) => 
        `[문서 ${i + 1}: ${c.title}]\n${c.text}`
      ).join('\n\n');
      
      const prompt = `다음 문서들을 참고해서 질문에 답해줘. 문서에 없는 내용은 모른다고 해줘. 답변은 한국어로 해줘.\n\n${context}\n\n질문: ${question}`;
      
      const answer = await generateText(prompt);
      
      // Remove duplicate sources by pageId
      const sources = [...new Map(topChunks.map(c => [c.pageId, c])).values()];
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: answer,
        sources
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `오류가 발생했습니다: ${e.message}`,
        sources: []
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- Render ---

  // Modal Render
  const renderSettingsModal = () => (
    <div className="rag-settings-overlay">
      <div className="rag-settings-modal">
        <h3>⚙️ RAG API 설정</h3>
        <p>LLM 생성을 위해 API 키를 입력해주세요.</p>
        <div className="api-key-form">
          <select value={provider} onChange={e => setProvider(e.target.value)}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
          <input 
            type="password" 
            placeholder="API 키를 입력하세요" 
            value={apiKey} 
            onChange={e => setApiKey(e.target.value)} 
          />
        </div>
        <div className="settings-actions">
          <button onClick={() => setShowSettings(false)}>취소</button>
          <button className="primary" onClick={saveSettings}>저장</button>
        </div>
      </div>
    </div>
  );

  if (!activeGroupId) {
    // Mode A: Group List Mode
    return (
      <div className="rag-groups-mode">
        {showSettings && renderSettingsModal()}
        
        <div className="section-header rag-section-header">
          <h3>RAG 그룹 목록</h3>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="API 설정">
            ⚙️ 설정
          </button>
        </div>

        <div className="groups-list">
          {ragGroups.map(group => (
            <div 
              key={group.id} 
              className={`group-list-item ${editingGroupId === group.id ? 'editing' : ''}`}
              onClick={() => {
                if (editingGroupId !== group.id) setActiveGroupId(group.id);
              }}
            >
              {editingGroupId !== group.id && (
                <button 
                  className="delete-btn list-delete-btn" 
                  onClick={(e) => deleteRagGroup(e, group.id)}
                  title="그룹 삭제"
                >
                  ×
                </button>
              )}

              {editingGroupId === group.id ? (
                <div className="folder-edit-mode" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="text" 
                    className="folder-title-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="그룹 이름 입력..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditGroup(group.id);
                      if (e.key === 'Escape') cancelEditGroup(group.id);
                    }}
                  />
                  <div className="folder-edit-actions">
                    <button className="folder-btn save" onClick={() => saveEditGroup(group.id)}>저장</button>
                    <button className="folder-btn cancel" onClick={() => cancelEditGroup(group.id)}>취소</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 
                    className="group-list-title" 
                    onDoubleClick={(e) => startEditGroup(e, group)}
                  >
                    <span className="folder-icon">💡</span> {group.title}
                  </h3>
                  <div className="group-list-meta">
                    대화형 검색 워크스페이스
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button className="add-group-wide-btn" onClick={addRagGroup}>
          + RAG 그룹 추가하기
        </button>
      </div>
    );
  }

  // Mode B: Workspace Mode
  const activeGroup = ragGroups.find(g => g.id === activeGroupId);

  return (
    <div className="rag-workspace-container">
      {showSettings && renderSettingsModal()}

      <div className="rag-workspace">
        <div className="rag-sidebar">
          <div className="rag-sidebar-header">
            <h3>수집한 페이지 ({pages.length})</h3>
          </div>
          
          <button 
            className="collect-btn" 
            onClick={collectCurrentTab} 
            disabled={isCollecting}
          >
            {isCollecting ? '수집 중...' : '+ 현재 페이지 수집'}
          </button>

          <div className="rag-pages-list">
            {pages.map(page => (
              <div key={page.id} className="rag-page-item">
                <div className="rag-page-info">
                  <div className="rag-page-title" title={page.title}>{page.title || '제목 없음'}</div>
                  <div className="rag-page-meta">청크 {page.chunkCount}개</div>
                </div>
                <button className="rag-page-delete" onClick={() => handleDeletePage(page.id)}>×</button>
              </div>
            ))}
            {pages.length === 0 && (
              <div className="empty-pages">수집된 페이지가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="rag-chat-area">
          <div className="rag-messages">
            {messages.length === 0 && (
              <div className="rag-welcome">
                <h2>웹 아카이브와 대화하세요</h2>
                <p>페이지 본문을 수집한 뒤 질문하면 AI가 답해줍니다.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`rag-message ${msg.role}`}>
                <div className="message-bubble">
                  <div className="message-content">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="message-sources">
                      <strong>참고 출처:</strong>
                      {msg.sources.map((src, i) => (
                        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                          [{i + 1}] {src.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="rag-message assistant">
                <div className="message-bubble thinking">
                  <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="rag-input-container">
            <input 
              type="text" 
              className="rag-input" 
              placeholder="수집된 문서를 바탕으로 질문해보세요..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={isThinking}
            />
            <button className="rag-send-btn" onClick={handleAsk} disabled={isThinking || !input.trim()}>
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
