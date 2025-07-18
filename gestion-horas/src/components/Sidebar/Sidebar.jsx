// Sidebar.jsx
import React, {useState} from 'react';
import './Sidebar.css';
import logo from '../../assets/logo.jpg';

import { supabase } from '../../supabase/client';

export default function Sidebar({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('logout');
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo-placeholder">
  <img src={logo} alt="TimeTrack Solutions" />
</div>

        <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '«' : '»'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button onClick={() => onNavigate('profile')}>👤 {isOpen && <span>Perfil</span>}</button>
        <button onClick={() => onNavigate('calendar')}>📅 {isOpen && <span>Calendario</span>}</button>
        <button onClick={() => onNavigate('summary')}>📊 {isOpen && <span>Estadísticas</span>}</button>
      </nav>

      <hr className="separator" />

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>🔓 {isOpen && <span>Cerrar sesión</span>}</button>
      </div>
    </div>
  );
}