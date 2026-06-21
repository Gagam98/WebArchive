import React, { useState } from 'react';
import RagWorkspace from './RagWorkspace';
import GroupList from '../components/GroupList';

export default function Home({ groups, setGroups }) {
  const [activeTab, setActiveTab] = useState('groups');
  const [ragKey, setRagKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Group editing states passed down to GroupList
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleRagTabClick = () => {
    if (activeTab === 'rag') {
      setRagKey(prev => prev + 1); // Reset RagWorkspace state to show group list
    } else {
      setActiveTab('rag');
    }
  };

  return (
    <div className="app-container">

      <div className="home-tabs-bar">
        <button 
          className={`home-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          📁 URL 그룹
        </button>
        <button 
          className={`home-tab-btn ${activeTab === 'rag' ? 'active' : ''}`}
          onClick={handleRagTabClick}
        >
          🧠 RAG 워크스페이스
        </button>
      </div>

      <div className="home-content">
        {activeTab === 'groups' && (
          <>
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                className="main-search-input" 
                placeholder="전체 URL 및 그룹 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <GroupList 
              groups={groups} 
              setGroups={setGroups} 
              searchQuery={searchQuery}
              editingGroupId={editingGroupId}
              setEditingGroupId={setEditingGroupId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
            />
          </>
        )}

        {activeTab === 'rag' && <RagWorkspace key={ragKey} />}
      </div>
    </div>
  );
}
