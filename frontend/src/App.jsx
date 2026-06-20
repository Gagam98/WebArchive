import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MemoBoard from './pages/MemoBoard';
import { initEmbeddingWorker } from './utils/embedding';
import './index.css';

const initialGroups = [
  {
    id: 1,
    title: '공부 자료',
    notes: [
      { id: 1, title: 'MDN Web Docs', url: 'developer.mozilla.org', x: 50, y: 150, color: '#fef3c7', tags: ['참고'], date: '6월 20일' },
      { id: 4, title: 'React 공식문서', url: 'react.dev', x: 800, y: 150, color: '#d1fae5', tags: ['읽을것'], date: '6월 20일' }
    ]
  },
  {
    id: 2,
    title: '협업 및 프로젝트',
    notes: [
      { id: 2, title: 'GitHub', url: 'github.com', x: 300, y: 150, color: '#dbeafe', tags: ['작업중'], date: '6월 20일' },
      { id: 3, title: '나중에 볼 영상', url: 'youtube.com', x: 550, y: 150, color: '#fce7f3', tags: ['나중에'], date: '6월 20일' }
    ]
  }
];

const initialCustomTags = [
  { id: 'tag_default_1', name: '업무', color: '#dbeafe' },
  { id: 'tag_default_2', name: '참고', color: '#fce7f3' },
  { id: 'tag_default_3', name: '학습', color: '#d1fae5' },
  { id: 'tag_default_4', name: '개발', color: '#fef3c7' },
  { id: 'tag_default_5', name: '디자인', color: '#ffedd5' },
  { id: 'tag_default_6', name: '나중에', color: '#ede9fe' },
  { id: 'tag_default_7', name: '★', color: '#fef3c7' }
];

function normalizeNote(raw, currentTags) {
  let tags = Array.isArray(raw.tags) ? raw.tags : [];
  
  // Migrate string tags to IDs
  tags = tags.map(t => {
    if (typeof t === 'string' && !t.startsWith('tag_')) {
      const match = currentTags.find(ct => ct.name === t);
      return match ? match.id : t; 
    }
    return t;
  });

  return {
    ...raw,
    title: raw.title || '',
    url: raw.url || '',
    tags: tags
  };
}

function normalizeGroup(group, currentTags) {
  return {
    ...group,
    notes: (group.notes || []).map(n => normalizeNote(n, currentTags))
  };
}

export default function App() {
  const [customTags, setCustomTags] = useState(() => {
    const saved = localStorage.getItem('url-board-custom-tags');
    return saved ? JSON.parse(saved) : initialCustomTags;
  });

  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('url-board-groups');
    const parsed = saved ? JSON.parse(saved) : initialGroups;
    // Migration runs at init time
    return parsed.map(g => normalizeGroup(g, initialCustomTags));
  });

  // Initialize embedding model in the background
  useEffect(() => {
    initEmbeddingWorker();
  }, []);

  useEffect(() => {
    localStorage.setItem('url-board-groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('url-board-custom-tags', JSON.stringify(customTags));
  }, [customTags]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home groups={groups} setGroups={setGroups} />} />
        <Route path="/memo/:groupId" element={<MemoBoard groups={groups} setGroups={setGroups} customTags={customTags} setCustomTags={setCustomTags} />} />
      </Routes>
    </Router>
  );
}
