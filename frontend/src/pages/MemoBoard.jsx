import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPageInfoSmart, getPageInfoFromActiveTab } from '../utils/pageInfo';
import { getEmbedding } from '../utils/embedding';
import { suggestTags } from '../utils/tagSuggester';

export default function MemoBoard({ groups, setGroups, customTags, setCustomTags }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const group = groups.find(g => g.id === Number(groupId));
  
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

  const deleteCurrentGroup = () => {
    if (window.confirm('이 그룹과 내부의 모든 메모를 삭제하시겠습니까?')) {
      setGroups(prevGroups => prevGroups.filter(g => g.id !== Number(groupId)));
      navigate('/');
    }
  };

  function normalizeNote(raw) {
    return {
      ...raw,
      title: raw.title || '',
      url: raw.url || '',
      tags: raw.tags || []
    };
  }

  const notes = (group.notes || []).map(normalizeNote);
  const setNotes = (newNotes) => {
    setGroups(prevGroups => prevGroups.map(g => 
      g.id === Number(groupId) 
        ? { ...g, notes: (typeof newNotes === 'function' ? newNotes(g.notes || []) : newNotes).map(normalizeNote) } 
        : g
    ));
  };

  const [activeNote, setActiveNote] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const clickTimer = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [selectedTag, setSelectedTag] = useState('전체보기');
  const [dragStartPos, setDragStartPos] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#dbeafe');
  const [openTagDropdown, setOpenTagDropdown] = useState(null);

  const PALETTE = ['#fef3c7','#dbeafe','#fce7f3','#d1fae5','#ffedd5','#ede9fe'];

  const createTag = () => {
    if (!newTagName.trim()) return;
    const newTag = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor,
    };
    setCustomTags(prev => [...prev, newTag]);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const deleteTag = (tagId) => {
    setCustomTags(prev => prev.filter(t => t.id !== tagId));
    setNotes(prev => prev.map(n => ({
      ...n,
      tags: (n.tags || []).filter(id => id !== tagId),
    })));
    if (selectedTag === tagId) setSelectedTag('전체보기');
  };

  const handleAutoSort = () => {
    const W = window.innerWidth || 1200; // fallback if needed
    const H = window.innerHeight || 800;

    const tagSet = [...new Set(notes.map(n => n.tags?.[0] || '분류 안 됨'))];
    const T = tagSet.length;
    const C = T <= 3 ? 1 : 2;
    const R = Math.ceil(T / C);

    const centers = {};
    tagSet.forEach((tag, i) => {
      const col = i % C;
      const row = Math.floor(i / C);
      centers[tag] = {
        x: (W / C) * (col + 0.5) - 100, // adjust for note width
        y: (H / R) * (row + 0.5) - 100,
      };
    });

    const counters = {};
    tagSet.forEach(tag => { counters[tag] = 0; });

    const a = 30, b = 0.8;
    const sorted = notes.map(note => {
      const tag = note.tags?.[0] || '분류 안 됨';
      const k = counters[tag]++;
      const theta = k * b;
      const r = a * Math.sqrt(k + 1);
      const { x: cx, y: cy } = centers[tag];
      return { ...note, x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
    });

    setNotes(sorted);
  };

  const regenAllEmbeddings = async () => {
    for (const note of notes) {
      await updateNoteEmbedding(note.id, note);
    }
    alert('임베딩 재생성 완료!');
  };

  const handlePointerDown = (e, id) => {
    if (editingId === id) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setActiveNote(id);
    setOffset({ x: e.clientX - note.x, y: e.clientY - note.y });
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e) => {
    if (activeNote === null) return;
    setNotes(notes.map(n => 
      n.id === activeNote ? { ...n, x: e.clientX - offset.x, y: e.clientY - offset.y } : n
    ));
  };

  const openLink = (note) => {
    let fullUrl = note.url;
    if (typeof fullUrl === 'string' && fullUrl.trim() !== '') {
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = 'https://' + fullUrl;
      }
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      if (note.isRead === false) {
        setNotes(notes.map(n => n.id === note.id ? { ...n, isRead: true } : n));
      }
    }
  };

  const handlePointerUp = (e) => {
    if (activeNote !== null && dragStartPos) {
      const dx = Math.abs(e.clientX - dragStartPos.x);
      const dy = Math.abs(e.clientY - dragStartPos.y);
      if (dx < 3 && dy < 3) {
        const noteId = activeNote;
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
          // Double click detected - do nothing, onDoubleClick handles it
        } else {
          clickTimer.current = setTimeout(() => {
            const note = notes.find(n => n.id === noteId);
            if (note) openLink(note);
            clickTimer.current = null;
          }, 250);
        }
      }
    }
    setActiveNote(null);
    setDragStartPos(null);
  };

  const handleDragStartTag = (e, tagId) => {
    e.dataTransfer.setData('tagId', tagId);
  };

  const updateNoteEmbedding = async (noteId, updatedNote) => {
    try {
      const { title, url, tags } = updatedNote;
      const tagNames = (tags || []).map(tagId => {
        const t = customTags.find(ct => ct.id === tagId);
        return t ? t.name : tagId;
      });
      const textToEmbed = `${title || ''} ${url || ''} ${tagNames.join(' ')}`.trim();
      if (!textToEmbed) return;
      const embedding = await getEmbedding(textToEmbed);
      setGroups(prevGroups => prevGroups.map(g => {
        if (g.id !== Number(groupId)) return g;
        return {
          ...g,
          notes: (g.notes || []).map(n => n.id === noteId ? { ...n, embedding } : n)
        };
      }));
    } catch (e) {
      console.error('Failed to update embedding', e);
    }
  };

  const handleDropOnNote = (e, noteId) => {
    e.preventDefault();
    const tagId = e.dataTransfer.getData('tagId');
    if (tagId && tagId !== '전체보기') {
      let updatedNote = null;
      setNotes(notes.map(n => {
        if (n.id === noteId) {
          const currentTags = n.tags || [];
          if (!currentTags.includes(tagId)) {
            updatedNote = { ...n, tags: [...currentTags, tagId] };
            return updatedNote;
          }
        }
        return n;
      }));
      if (updatedNote) updateNoteEmbedding(noteId, updatedNote);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const createNoteFromInfo = async (info) => {
    const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#ffedd5', '#ede9fe'];
    const newId = Date.now();
    const textToEmbed = `${info.title} ${info.description || ''}`.trim();
    const embedding = textToEmbed ? await getEmbedding(textToEmbed) : null;
    const tags = embedding ? await suggestTags(embedding, customTags) : [];

    const newNote = {
      id: newId,
      title: info.title || '새 웹사이트',
      url: (info.url || '').replace(/^https?:\/\//, ''),
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      tags,
      embedding,
      date: '6월 20일',
      savedAt: Date.now(),
      isRead: false
    };
    setNotes(prev => [...prev, newNote]);
  };

  const addNoteFromCurrentTab = async () => {
    setIsAdding(true);
    try {
      const info = await getPageInfoFromActiveTab();
      await createNoteFromInfo(info);
    } catch (e) {
      console.error(e);
      alert(e.message || '현재 페이지 정보를 가져오지 못했습니다.');
    } finally {
      setIsAdding(false);
    }
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
      date: '6월 20일',
      savedAt: Date.now(),
      isRead: false
    };
    setNotes(prev => [...prev, newNote]);
    setEditingId(newId);
    setEditTitle('');
    setEditUrl('');
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditUrl(note.url);
  };

  const saveEdit = async (id) => {
    const finalTitle = editTitle.trim();
    const finalUrl = editUrl.trim();
    
    let updatedNote = null;
    
    setNotes(prevNotes => prevNotes.map(n => {
      if (n.id === id) {
        updatedNote = { 
          ...n, 
          title: finalTitle || (finalUrl ? '정보 불러오는 중...' : '새 웹사이트'), 
          url: finalUrl || 'example.com' 
        };
        return updatedNote;
      }
      return n;
    }));
    
    setEditingId(null);

    if (finalUrl && !finalTitle) {
      try {
        const info = await getPageInfoSmart(finalUrl);
        const textToEmbed = `${info.title} ${info.description || ''}`.trim();
        const embedding = textToEmbed ? await getEmbedding(textToEmbed) : null;
        const tags = embedding ? await suggestTags(embedding, customTags) : [];

        setNotes(prevNotes => prevNotes.map(n => {
          if (n.id === id) {
            return { 
               ...n, 
               title: info.title || finalUrl, 
               description: info.description || '', 
               tags: tags.length > 0 ? tags : n.tags, 
               embedding 
            };
          }
          return n;
        }));
      } catch (e) {
        console.error(e);
        setNotes(prevNotes => prevNotes.map(n => n.id === id ? { ...n, title: '새 웹사이트' } : n));
        updateNoteEmbedding(id, { ...updatedNote, title: '새 웹사이트' });
      }
    } else {
      if (updatedNote) updateNoteEmbedding(id, updatedNote);
    }
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
    let updatedNote = null;
    setNotes(notes.map(n => {
      if (n.id === noteId) {
        updatedNote = { ...n, tags: (n.tags || []).filter(t => t !== tagToRemove) };
        return updatedNote;
      }
      return n;
    }));
    if (updatedNote) updateNoteEmbedding(noteId, updatedNote);
  };

  const filteredNotes = notes.filter(note => {
    const matchesTag = selectedTag === '전체보기' || (note.tags && note.tags.includes(selectedTag));
    return matchesTag;
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
            {'<'}
          </button>
          <div className="logo-text">
            <h1>{group.title}</h1>
          </div>
        </div>

        <div className="header-right">
          <button 
            className="add-btn current-tab-btn" 
            onClick={addNoteFromCurrentTab}
            disabled={isAdding}
            style={{ backgroundColor: '#10b981' }}
          >
            + 현재 페이지 추가
          </button>
          <button className="add-btn" onClick={addNote} disabled={isAdding}>+ 빈 메모</button>
          <button className="add-btn auto-sort-btn" onClick={handleAutoSort} disabled={isAdding}>
            정렬
          </button>
        </div>
      </header>

      <div className="tags-bar">
        <div className={`tag-item ${selectedTag === '전체보기' ? 'active' : ''}`}
             onClick={() => setSelectedTag('전체보기')}>전체보기</div>

        {customTags.map(tag => (
          <div key={tag.id}
               className={`tag-item ${selectedTag === tag.id ? 'active' : ''}`}
               style={{ backgroundColor: tag.color }}
               onClick={() => setSelectedTag(tag.id)}
               draggable
               onDragStart={(e) => handleDragStartTag(e, tag.id)}>
            {tag.name}
            <button className="remove-tag-btn" onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}>×</button>
          </div>
        ))}

        {isCreatingTag ? (
          <div className="tag-creator">
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
                   placeholder="태그 이름" autoFocus
                   className="tag-creator-input"
                   onKeyDown={e => { if (e.key === 'Enter') createTag(); if (e.key === 'Escape') setIsCreatingTag(false); }} />
            <div className="color-palette" style={{ display: 'flex', gap: '4px', margin: '0 8px' }}>
              {PALETTE.map(c => (
                <div key={c} className="color-swatch"
                     style={{ 
                       backgroundColor: c, 
                       width: '16px', height: '16px', borderRadius: '50%', cursor: 'pointer',
                       outline: newTagColor === c ? '2px solid #333' : 'none' 
                     }}
                     onClick={() => setNewTagColor(c)} />
              ))}
            </div>
            <button className="add-btn" style={{ padding: '2px 6px', fontSize: '12px' }} onClick={createTag}>확인</button>
          </div>
        ) : (
          <button className="tag-item" onClick={() => setIsCreatingTag(true)}>+ 태그</button>
        )}
      </div>

      <div className="notes-area">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className={`post-it ${editingId === note.id ? 'editing' : ''}`}
            style={{ 
              transform: `translate(${note.x}px, ${note.y}px)`, 
              backgroundColor: note.color,
              transition: activeNote === note.id ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
                onPointerDown={(e) => e.stopPropagation()}
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
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {note.title}
                  </h3>
                  <p className="url-text">{note.url}</p>
                </div>
                <div className="post-it-footer">
                  <div className="note-tags-list">
                    {(note.tags || []).map(tagId => {
                      const tagObj = customTags.find(t => t.id === tagId);
                      if (!tagObj) return null;
                      return (
                        <span key={tagId} className="note-tag" style={{ backgroundColor: tagObj.color }}>
                          {tagObj.name}
                          <button 
                            className="remove-tag-btn" 
                            onClick={(e) => { e.stopPropagation(); removeTag(note.id, tagId); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="태그 삭제"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
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
