import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MemoBoard from './pages/MemoBoard';
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

export default function App() {
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('url-board-groups');
    return saved ? JSON.parse(saved) : initialGroups;
  });

  useEffect(() => {
    localStorage.setItem('url-board-groups', JSON.stringify(groups));
  }, [groups]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home groups={groups} setGroups={setGroups} />} />
        <Route path="/memo/:groupId" element={<MemoBoard groups={groups} setGroups={setGroups} />} />
      </Routes>
    </Router>
  );
}
