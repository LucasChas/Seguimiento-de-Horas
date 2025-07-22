import React, { useState } from 'react';
import './Sidebar.css';
import logo from '../../assets/logo.jpg';
import AddHolidayModal from '../HolidayModal/AddHolidayModal';
import { supabase } from '../../supabase/client';

export default function Sidebar({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddHoliday, setShowAddHoliday] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('logout');
  };

  const handleAddCustomHoliday = () => {
    setShowAddHoliday(true);
  };

  const handleCloseModal = () => {
    setShowAddHoliday(false);
  };

  const handleSubmitHoliday = async ({ date, motivo }) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No se pudo obtener el usuario.');

      const fecha = new Date(date);
      const dia = fecha.getUTCDate();
      const mes = fecha.getUTCMonth() + 1;

      const { error: insertError } = await supabase.from('holidays').insert({
        dia,
        mes,
        motivo,
        tipo: 'Personalizado',
        custom: true,
        user_id: user.id
      });

      if (insertError) throw insertError;

      setShowAddHoliday(false);
    } catch (error) {
      console.error('Error al agregar feriado:', error.message);
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo-placeholder">
          <img src={logo} alt="TimeTrack Solutions" />
        </div>
        <button className="toggle-btn" onClick={() => setIsOpen(prev => !prev)}>
          {isOpen ? '«' : '»'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button onClick={() => onNavigate('profile')}>
          👤 {isOpen && <span>Perfil</span>}
        </button>
        <button onClick={() => onNavigate('calendar')}>
          📅 {isOpen && <span>Calendario</span>}
        </button>
        <button onClick={() => onNavigate('summary')}>
          📊 {isOpen && <span>Estadísticas</span>}
        </button>

        {/* Botón Agregar Feriado */}
        <button onClick={handleAddCustomHoliday}>
          ➕ {isOpen && <span>Agregar Feriado</span>}
        </button>

        <hr className="separator" />
      </nav>

      {showAddHoliday && (
        <AddHolidayModal
          onClose={handleCloseModal}
          onSubmit={handleSubmitHoliday}
        />
      )}

      <div className="sidebar-footer">
        <button onClick={handleLogout}>
          🔓 {isOpen && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}
