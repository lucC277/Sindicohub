import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { plantaoApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../hooks/useNotifications';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [plantaoAtual, setPlantaoAtual] = useState(null);
  const [plantaoLoading, setPlantaoLoading] = useState(true);

  const loadPlantaoAtivo = useCallback(async () => {
    try {
      const data = await plantaoApi.list(true);
      setPlantaoAtual(data.length > 0 ? data[0] : null);
    } catch {
      setPlantaoAtual(null);
    } finally {
      setPlantaoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    plantaoApi
      .list(true)
      .then((data) => {
        if (!cancelled) {
          setPlantaoAtual(data.length > 0 ? data[0] : null);
          setPlantaoLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlantaoAtual(null);
          setPlantaoLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleNewAlert = useCallback(
    (title) => {
      toast.info(`Nova atualização: ${title}`);
    },
    [toast],
  );

  const notifications = useNotifications(isAuthenticated, handleNewAlert);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main-column">
        <Topbar
          onOpenMenu={() => setMenuOpen(true)}
          plantaoAtual={plantaoAtual}
          plantaoLoading={plantaoLoading}
          notifications={notifications}
        />
        <main className="app-content">
          <Outlet
            context={{
              refreshPlantaoAtivo: loadPlantaoAtivo,
              refreshNotifications: notifications.refreshNotifications,
            }}
          />
        </main>
      </div>
    </div>
  );
}
