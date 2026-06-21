import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GroupList({ groups, setGroups, searchQuery, editingGroupId, setEditingGroupId, editTitle, setEditTitle }) {
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
    if (window.confirm('이 그룹과 내부의 모든 메모를 삭제하시겠습니까?')) {
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
    <>
      <div className="section-header">
        <h3>그룹</h3>
      </div>

      <div className="groups-list">
        {filteredGroups.map(group => {
          const isEditing = editingGroupId === group.id;
          return (
            <div 
              key={group.id} 
              className={`group-list-item ${isEditing ? 'editing' : ''}`}
              onClick={() => handleGroupClick(group.id)}
            >
              {!isEditing && (
                <button 
                  className="delete-btn list-delete-btn" 
                  onClick={(e) => deleteGroup(e, group.id)}
                  title="그룹 삭제"
                >
                  ×
                </button>
              )}

              {isEditing ? (
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
                    <span className="folder-icon">📚</span> {group.title}
                  </h3>
                  <div className="group-list-meta">
                    URL {group.notes.length}개 보관 중
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button className="add-group-wide-btn" onClick={addGroup}>
        + 그룹 추가하기
      </button>
    </>
  );
}
