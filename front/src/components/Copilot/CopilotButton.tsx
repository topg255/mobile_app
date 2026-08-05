import React, { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CopilotPanel from './CopilotPanel';
import './Copilot.css';

const CopilotButton: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const isAllowed =
    user.role === 'superviseur_qualite' || user.role === 'super_admin';
  if (!isAllowed) return null;

  return (
    <>
      {open && (
        <CopilotPanel
          superviseurName={`${user.firstName} ${user.lastName}`}
          onClose={() => setOpen(false)}
        />
      )}
      <button
        className={`copilot-fab ${open ? 'copilot-fab-open' : ''}`}
        onClick={() => setOpen(!open)}
        title={open ? 'Fermer le copilote' : 'Ouvrir le copilote IA'}
      >
        {open ? <X size={26} /> : <Bot size={26} />}
        {!open && <span className="copilot-fab-dot" />}
      </button>
    </>
  );
};

export default CopilotButton;
