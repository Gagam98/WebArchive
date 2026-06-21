import React from 'react';

export default function NoteCard({
  note,
  camera,
  editingId,
  activeNote,
  editTitle,
  editUrl,
  setEditTitle,
  setEditUrl,
  customTags,
  onPointerDown,
  onDragOver,
  onDrop,
  deleteNote,
  startEdit,
  saveEdit,
  cancelEdit,
  removeTag
}) {
  const isEditing = editingId === note.id;
  const isActive = activeNote === note.id;

  // Extract domain for favicon
  const getFaviconUrl = (url) => {
    if (!url) return null;
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const favicon = getFaviconUrl(note.url);

  return (
    <div
      className={`post-it ${isEditing ? 'editing' : ''}`}
      style={{ 
        transform: `translate(${note.x + camera.x}px, ${note.y + camera.y}px)`, 
        backgroundColor: note.color,
        transition: isActive ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: isActive || isEditing ? 100 : 1
      }}
      onPointerDown={onPointerDown}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {!isEditing && (
        <button 
          className="delete-btn" 
          onClick={deleteNote} 
          onPointerDown={(e) => e.stopPropagation()}
          title="삭제"
        >
          ×
        </button>
      )}

      {isEditing ? (
        <div className="post-it-content edit-mode" onPointerDown={(e) => e.stopPropagation()}>
          <input 
            type="text" 
            className="post-it-input title-input" 
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <input 
            type="text" 
            className="post-it-input url-input" 
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="웹사이트 URL"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <div className="edit-actions">
            <button className="edit-btn save" onClick={saveEdit}>저장</button>
            <button className="edit-btn cancel" onClick={cancelEdit}>취소</button>
          </div>
        </div>
      ) : (
        <>
          <div className="post-it-content" onDoubleClick={startEdit}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {favicon && <img src={favicon} alt="icon" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />}
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
                      onClick={(e) => { e.stopPropagation(); removeTag(tagId); }}
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
  );
}
