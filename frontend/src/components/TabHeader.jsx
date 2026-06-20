import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TabHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentTab = location.pathname === '/ai' ? 'ai' : 'home';

  return (
    <div className="tab-header-container">
      <header className="main-header">
        <div className="header-left">
          <div className="logo-icon">🪧</div>
          <div className="logo-text">
            <h1>URL 칠판</h1>
          </div>
        </div>
      </header>

    </div>
  );
}
