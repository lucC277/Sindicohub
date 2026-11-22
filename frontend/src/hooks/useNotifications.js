import { useCallback, useEffect, useRef, useState } from 'react';
import { encomendasApi, ocorrenciasApi, reservasApi } from '../api/endpoints';
import { formatDateBR, formatDateTimeBR, formatOcorrenciaStatus } from '../utils/formatters';

const SEEN_STORAGE_KEY = 'sindicohub_seen_notifications';

function loadSeenIds() {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(set) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(set).slice(-100)));
  } catch {
    // ignora erro de quota
  }
}

export function useNotifications(enabled, onNewAlert) {
  const [items, setItems] = useState([]);
  const [seenIds, setSeenIds] = useState(() => loadSeenIds());
  const firstRunRef = useRef(true);
  const previousIdsRef = useRef(new Set());

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const [encomendas, reservas, ocorrencias] = await Promise.all([
        encomendasApi.list(),
        reservasApi.list(),
        ocorrenciasApi.list(),
      ]);

      const nextItems = [];

      encomendas
        .filter((e) => !e.retirado)
        .slice(0, 6)
        .forEach((enc) => {
          nextItems.push({
            id: `enc_${enc.id}`,
            title: `Encomenda aguardando retirada — ${enc.destinatario}`,
            desc: `Bloco ${enc.bloco}, apto ${enc.apartamento}${enc.codigo_rastreio ? ` (${enc.codigo_rastreio})` : ''}`,
            time: formatDateTimeBR(enc.data_recebimento),
            route: '/encomendas',
            sortKey: enc.data_recebimento || '',
          });
        });

      reservas.slice(0, 5).forEach((res) => {
        nextItems.push({
          id: `res_${res.id}`,
          title: `Reserva confirmada — ${res.area}`,
          desc: `${formatDateBR(res.data_reserva)} (${res.periodo}) por ${res.morador_nome}`,
          time: formatDateTimeBR(res.criado_em),
          route: '/reservas',
          sortKey: res.criado_em || '',
        });
      });

      ocorrencias.slice(0, 5).forEach((oc) => {
        const st = formatOcorrenciaStatus(oc.status);
        nextItems.push({
          id: `oc_${oc.id}_${oc.status}`,
          title: `Ocorrência ${st.label.toLowerCase()} — ${oc.titulo}`,
          desc: `Bloco ${oc.bloco}, apto ${oc.apartamento} (${oc.morador_nome})`,
          time: formatDateTimeBR(oc.data_abertura),
          route: '/ocorrencias',
          sortKey: oc.data_abertura || '',
        });
      });

      nextItems.sort((a, b) => (b.sortKey || '').localeCompare(a.sortKey || ''));

      if (!firstRunRef.current && onNewAlert) {
        const fresh = nextItems.filter((item) => !previousIdsRef.current.has(item.id));
        if (fresh.length > 0) {
          onNewAlert(fresh[0].title);
        }
      }

      previousIdsRef.current = new Set(nextItems.map((i) => i.id));
      firstRunRef.current = false;
      setItems(nextItems);
    } catch {
      // Polling silencioso não interrompe navegação
    }
  }, [enabled, onNewAlert]);

  useEffect(() => {
    if (!enabled) return undefined;
    const initialTimer = window.setTimeout(() => {
      poll();
    }, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    }, 30000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [enabled, poll]);

  const markAsRead = useCallback((id) => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSeenIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item.id));
      saveSeenIds(next);
      return next;
    });
  }, [items]);

  const unreadCount = items.filter((item) => !seenIds.has(item.id)).length;

  return {
    items,
    seenIds,
    unreadCount,
    markAsRead,
    markAllRead,
    refreshNotifications: poll,
  };
}
