import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const initialTags = ['전체보기', '나중에', '중요', '참고', '읽을것', '작업중', '즐겨찾기'];

export default function MemoBoard({ groups, setGroups }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const group = groups.find(g => g.id === Number(groupId));
  
  // Safe fallback if group not found
  if (!group) {
    return (
      <div className="board-container error-page">
        <div className="error-content">
          <h2>존재하지 않는 그룹입니다.</h2>
          <button className="add-btn" onClick={() => navigate('/')}>홈으로 가기</button>
        </div>
      </div>
    );
  }

  const notes = group.notes || [];
  const setNotes = (newNotes) => {
    setGroups(prevGroups => prevGroups.map(g => 
      g.id === Number(groupId) 
        ? { ...g, notes: typeof newNotes === 'function' ? newNotes(g.notes || []) : newNotes } 
        : g
    ));
  };

  const [activeNote, setActiveNote] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('전체보기');

  const handlePointerDown = (e, id) => {
    // Do not drag if editing this note
    if (editingId === id) return;
    
    e.stopPropagation();
    // Only drag on left click
    if (e.button !== 0) return;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setActiveNote(id);
    setOffset({ x: e.clientX - note.x, y: e.clientY - note.y });
  };

  const handlePointerMove = (e) => {
    if (activeNote === null) return;
    setNotes(notes.map(n => 
      n.id === activeNote ? { ...n, x: e.clientX - offset.x, y: e.clientY - offset.y } : n
    ));
  };

  const handlePointerUp = () => {
    setActiveNote(null);
  };

  const handleDragStartTag = (e, tag) => {
    e.dataTransfer.setData('tag', tag);
  };

  const handleDropOnNote = (e, noteId) => {
    e.preventDefault();
    const tag = e.dataTransfer.getData('tag');
    if (tag && tag !== '전체보기') {
      setNotes(notes.map(n => {
        if (n.id === noteId) {
          const currentTags = n.tags || [];
          if (!currentTags.includes(tag)) {
            return { ...n, tags: [...currentTags, tag] };
          }
        }
        return n;
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const addNote = () => {
    const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#ffedd5', '#ede9fe'];
    const newId = Date.now();
    const newNote = {
      id: newId,
      title: '',
      url: '',
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      tags: [],
      date: '6월 20일'
    };
    setNotes([...notes, newNote]);
    setEditingId(newId);
    setEditTitle('');
    setEditUrl('');
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditUrl(note.url);
  };

  const saveEdit = (id) => {
    const finalTitle = editTitle.trim() || '새 웹사이트';
    const finalUrl = editUrl.trim() || 'example.com';
    setNotes(notes.map(n => 
      n.id === id ? { ...n, title: finalTitle, url: finalUrl } : n
    ));
    setEditingId(null);
  };

  const cancelEdit = (id) => {
    const note = notes.find(n => n.id === id);
    if (note && note.title === '' && note.url === '') {
      // Remove empty newly-created notes on cancel
      setNotes(notes.filter(n => n.id !== id));
    }
    setEditingId(null);
  };

  const deleteNote = (e, id) => {
    e.stopPropagation();
    if (window.confirm('정말 이 메모를 삭제하시겠습니까?')) {
      setNotes(notes.filter(n => n.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const removeTag = (noteId, tagToRemove) => {
    setNotes(notes.map(n => {
      if (n.id === noteId) {
        return { ...n, tags: (n.tags || []).filter(t => t !== tagToRemove) };
      }
      return n;
    }));
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === '전체보기' || (note.tags && note.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  return (
    <div 
      className="board-container memo-board-page"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
    >
      <header className="board-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')} title="홈으로 이동">
            ←
          </button>
          <div className="logo-icon">📋</div>
          <div className="logo-text">
            <h1>📁 {group.title}</h1>
            <p>인터넷 미아 방지 보드</p>
          </div>
        </div>

        <div className="tags-bar">
          {initialTags.map(tag => (
            <div 
              key={tag} 
              className={`tag-item ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
              draggable
              onDragStart={(e) => handleDragStartTag(e, tag)}
            >
              {tag}
            </div>
          ))}
        </div>

        <div className="header-right">
          <input 
            type="text" 
            placeholder="URL 또는 제목 검색..." 
            className="search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="add-btn" onClick={addNote}>+ 메모 붙이기</button>
        </div>
      </header>

      <div className="notes-area">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className={`post-it ${editingId === note.id ? 'editing' : ''}`}
            style={{ 
              transform: `translate(${note.x}px, ${note.y}px)`, 
              backgroundColor: note.color,
              zIndex: activeNote === note.id || editingId === note.id ? 100 : 1
            }}
            onPointerDown={(e) => handlePointerDown(e, note.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnNote(e, note.id)}
          >
            <div className="pin"></div>
            
            {editingId !== note.id && (
              <button 
                className="delete-btn" 
                onClick={(e) => deleteNote(e, note.id)} 
                title="삭제"
              >
                ×
              </button>
            )}

            {editingId === note.id ? (
              <div className="post-it-content edit-mode" onPointerDown={(e) => e.stopPropagation()}>
                <input 
                  type="text" 
                  className="post-it-input title-input" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(note.id);
                    if (e.key === 'Escape') cancelEdit(note.id);
                  }}
                />
                <input 
                  type="text" 
                  className="post-it-input url-input" 
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="웹사이트 URL"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(note.id);
                    if (e.key === 'Escape') cancelEdit(note.id);
                  }}
                />
                <div className="edit-actions">
                  <button className="edit-btn save" onClick={() => saveEdit(note.id)}>저장</button>
                  <button className="edit-btn cancel" onClick={() => cancelEdit(note.id)}>취소</button>
                </div>
              </div>
            ) : (
              <>
                <div className="post-it-content" onDoubleClick={() => startEdit(note)}>
                  <h3>{note.title}</h3>
                  <p className="url-text">{note.url}</p>
                </div>
                <div className="post-it-footer">
                  <div className="note-tags-list">
                    {note.tags && note.tags.map(t => (
                      <span key={t} className="note-tag">
                        {t}
                        <button 
                          className="remove-tag-btn" 
                          onClick={(e) => { e.stopPropagation(); removeTag(note.id, t); }}
                          title="태그 삭제"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <span className="note-date">{note.date}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="footer-status">
        검색 결과 {filteredNotes.length}개 / 전체 {notes.length}개
      </div>
    </div>
  );
}
