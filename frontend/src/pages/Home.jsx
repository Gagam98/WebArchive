import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ groups, setGroups }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();

  const addGroup = () => {
    const newId = Date.now();
    const newGroup = {
      id: newId,
      title: '',
      notes: []
    };
    setGroups([...groups, newGroup]);
    setEditingGroupId(newId);
    setEditTitle('');
  };

  const startEditGroup = (e, group) => {
    e.stopPropagation();
    setEditingGroupId(group.id);
    setEditTitle(group.title);
  };

  const saveEditGroup = (id) => {
    const finalTitle = editTitle.trim() || '새 그룹';
    setGroups(groups.map(g => g.id === id ? { ...g, title: finalTitle } : g));
    setEditingGroupId(null);
  };

  const cancelEditGroup = (id) => {
    const group = groups.find(g => g.id === id);
    if (group && group.title === '') {
      setGroups(groups.filter(g => g.id !== id));
    }
    setEditingGroupId(null);
  };

  const deleteGroup = (e, id) => {
    e.stopPropagation();
    if (window.confirm('이 그룹과 그룹 내부의 모든 메모를 삭제하시겠습니까?')) {
      setGroups(groups.filter(g => g.id !== id));
    }
  };

  const handleGroupClick = (id) => {
    if (editingGroupId === id) return;
    navigate(`/memo/${id}`);
  };

  const filteredGroups = groups.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.notes.some(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.url.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="board-container home-page">
      <header className="board-header">
        <div className="header-left">
          <div className="logo-icon">📋</div>
          <div className="logo-text">
            <h1>URL 칠판</h1>
            <p>인터넷 미아 방지 보드</p>
          </div>
        </div>
        <div className="header-right">
          <input 
            type="text" 
            placeholder="그룹 또는 메모 검색..." 
            className="search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="add-btn" onClick={addGroup}>+ 그룹 추가하기</button>
        </div>
      </header>

      <div className="home-content">
        <div className="groups-grid">
          {filteredGroups.map(group => (
            <div 
              key={group.id} 
              className={`group-folder-card ${editingGroupId === group.id ? 'editing' : ''}`}
              onClick={() => handleGroupClick(group.id)}
            >
              <div className="folder-tab"></div>
              
              {editingGroupId !== group.id && (
                <button 
                  className="delete-btn" 
                  onClick={(e) => deleteGroup(e, group.id)}
                  title="그룹 삭제"
                >
                  ×
                </button>
              )}

              <div className="folder-content">
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
                      className="folder-title" 
                      onDoubleClick={(e) => startEditGroup(e, group)}
                      title="더블클릭하여 이름 수정"
                    >
                      📁 {group.title}
                    </h3>
                    <div className="folder-notes-preview">
                      {group.notes && group.notes.length > 0 ? (
                        <ul>
                          {group.notes.slice(0, 6).map(note => (
                            <li key={note.id} className="note-preview-item">
                              📌 {note.title || note.url}
                            </li>
                          ))}
                          {group.notes.length > 6 && (
                            <li className="note-preview-more">
                              외 {group.notes.length - 6}개 메모가 더 있습니다
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="no-notes-placeholder">저장된 메모가 없습니다.</p>
                      )}
                    </div>
                    <div className="folder-footer">
                      <span>총 {group.notes ? group.notes.length : 0}개 링크</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-status">
        검색 결과 {filteredGroups.length}개 / 전체 {groups.length}개 그룹
      </div>
    </div>
  );
}
