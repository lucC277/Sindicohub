import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  LogOut,
  Megaphone,
  Package,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatRoleLabel, getInitials } from '../../utils/formatters';
import { canAccessRoute, getDefaultRouteForRole } from '../../utils/permissions';

const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { to: '/painel', label: 'Painel executivo', icon: BarChart3 },
      { to: '/encomendas', label: 'Encomendas', icon: Package },
      { to: '/reservas', label: 'Áreas comuns', icon: CalendarDays },
      { to: '/ocorrencias', label: 'Ocorrências', icon: ClipboardList },
      { to: '/plantao', label: 'Escala de plantão', icon: ShieldCheck },
    ],
  },
  {
    label: 'Condomínio',
    items: [
      { to: '/mural', label: 'Mural de avisos', icon: Megaphone },
      { to: '/regimento', label: 'Regimento interno', icon: BookOpen },
      { to: '/taxas', label: 'Taxas e boletos', icon: Receipt },
    ],
  },
];

export function Sidebar({ open, onClose }) {
  const { usuario, logout } = useAuth();
  const perfil = usuario?.perfil;

  return (
    <>
      <div
        className={`rail-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`app-rail ${open ? 'open' : ''}`} aria-label="Navegação principal">
        <div className="rail-top">
          <div className="rail-brand">
            <NavLink
              to={getDefaultRouteForRole(perfil)}
              className="rail-brand-link"
              onClick={onClose}
            >
              <span className="brand-monogram" aria-hidden="true">
                SH
              </span>
              <div>
                <span className="brand-title">SíndicoHub</span>
                <span className="brand-subtitle">Gestão condominial</span>
              </div>
            </NavLink>
            <button
              type="button"
              className="rail-close-btn"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="rail-nav">
            {NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter((item) => canAccessRoute(perfil, item.to));
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label}>
                  <div className="rail-group-title">{group.label}</div>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="rail-footer">
          <div className="rail-user">
            <div className="rail-avatar" aria-hidden="true">
              {getInitials(usuario?.nome)}
            </div>
            <div className="rail-user-meta">
              <span className="rail-user-name">{usuario?.nome}</span>
              <span className="rail-user-role">{formatRoleLabel(perfil)}</span>
            </div>
          </div>
          <button
            type="button"
            className="rail-logout-btn"
            onClick={logout}
            title="Encerrar sessão"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
