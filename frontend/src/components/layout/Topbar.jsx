import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Copy, Menu, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';

export function Topbar({
  onOpenMenu,
  plantaoAtual,
  plantaoLoading,
  notifications,
}) {
  const { unidade } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return undefined;
    const handleOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [notifOpen]);

  const handleCopyPhone = async (phone) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Contato de emergência copiado: ${phone}`);
    } catch {
      toast.info(`Contato de emergência: ${phone}`);
    }
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onOpenMenu}
          aria-label="Abrir menu de navegação"
        >
          <Menu size={20} />
        </button>

        {plantaoLoading ? (
          <div className="plantao-strip" aria-live="polite">
            <span className="plantao-shift">Verificando escala da portaria...</span>
          </div>
        ) : plantaoAtual ? (
          <div className="plantao-strip" aria-label="Plantão ativo da portaria">
            <span className="plantao-live-dot" aria-hidden="true" />
            <div className="plantao-info">
              <span className="plantao-person">
                Portaria: {plantaoAtual.funcionario_nome}
              </span>
              <span className="plantao-shift">
                {plantaoAtual.cargo} ({plantaoAtual.turno})
              </span>
            </div>
            {plantaoAtual.telefone_contato && (
              <div className="plantao-emergency">
                <Phone size={14} aria-hidden="true" />
                <span>Emergência: {plantaoAtual.telefone_contato}</span>
                <button
                  type="button"
                  className="plantao-copy-btn"
                  onClick={() => handleCopyPhone(plantaoAtual.telefone_contato)}
                  title="Copiar telefone ou ramal de emergência"
                >
                  <Copy size={12} />
                  Copiar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="plantao-strip plantao-strip-offline">
            <span className="plantao-shift">
              Nenhum plantão ativo cadastrado na portaria no momento.
            </span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <span className="topbar-unit-pill" title="Unidade configurada para agendamentos e consultas">
          Bloco {unidade.bloco}, apto {unidade.apartamento}
        </span>

        <div className="notif-wrapper" ref={popoverRef}>
          <button
            type="button"
            className="notif-trigger"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label={`Notificações (${notifications.unreadCount} não lidas)`}
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {notifications.unreadCount > 0 && (
              <span className="notif-badge">{notifications.unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-popover" role="region" aria-label="Central de alertas">
              <div className="notif-header">
                <h3>Alertas recentes</h3>
                {notifications.unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={notifications.markAllRead}
                  >
                    Marcar tudo lido
                  </Button>
                )}
              </div>

              <div className="notif-list">
                {notifications.items.length === 0 ? (
                  <div style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                    Nenhum alerta recente registrado no condomínio.
                  </div>
                ) : (
                  notifications.items.map((item) => {
                    const isUnread = !notifications.seenIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`notif-item ${isUnread ? 'unread' : ''}`}
                        onClick={() => {
                          notifications.markAsRead(item.id);
                          setNotifOpen(false);
                          navigate(item.route);
                        }}
                      >
                        <span className="notif-item-title">{item.title}</span>
                        <span className="notif-item-desc">{item.desc}</span>
                        <span className="notif-item-time">{item.time}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
