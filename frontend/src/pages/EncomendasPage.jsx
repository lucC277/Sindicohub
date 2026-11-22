import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Package, Plus, Search } from 'lucide-react';
import { extractApiError } from '../api/client';
import { encomendasApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTimeBR } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

const INITIAL_FORM = {
  destinatario: '',
  bloco: 'A',
  apartamento: '',
  codigo_rastreio: '',
};

export function EncomendasPage() {
  const { permissions, unidade } = useAuth();
  const toast = useToast();
  const outletCtx = useOutletContext() || {};

  const { data: encomendas, loading, error, refetch } = useAsyncData(
    () => encomendasApi.list(),
    [],
    [],
  );

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('pendentes');
  const [apenasMinhaUnidade, setApenasMinhaUnidade] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const resumo = useMemo(() => {
    const pendentes = encomendas.filter((e) => !e.retirado).length;
    const retiradas = encomendas.filter((e) => e.retirado).length;
    return { pendentes, retiradas, total: encomendas.length };
  }, [encomendas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return encomendas.filter((item) => {
      if (filtroStatus === 'pendentes' && item.retirado) return false;
      if (filtroStatus === 'retiradas' && !item.retirado) return false;

      if (apenasMinhaUnidade) {
        const sameBloco = item.bloco?.toLowerCase() === unidade.bloco?.toLowerCase();
        const sameApto = item.apartamento?.toLowerCase() === unidade.apartamento?.toLowerCase();
        if (!sameBloco || !sameApto) return false;
      }

      if (!termo) return true;
      return [
        item.destinatario,
        item.bloco,
        item.apartamento,
        item.codigo_rastreio || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo);
    });
  }, [encomendas, busca, filtroStatus, apenasMinhaUnidade, unidade]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await encomendasApi.create({
        destinatario: form.destinatario.trim(),
        bloco: form.bloco.trim(),
        apartamento: form.apartamento.trim(),
        codigo_rastreio: form.codigo_rastreio.trim() || null,
        retirado: false,
      });
      toast.success('Encomenda registrada na portaria.');
      setForm(INITIAL_FORM);
      setDrawerOpen(false);
      await refetch();
      outletCtx.refreshNotifications?.();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível registrar a encomenda.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRetirar = async (item) => {
    setConfirmingId(item.id);
    try {
      await encomendasApi.retirar(item.id);
      toast.success(`Retirada confirmada para ${item.destinatario}.`);
      await refetch();
      outletCtx.refreshNotifications?.();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível registrar a retirada.'));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Controle de encomendas</h1>
          <p>
            {permissions.canCreateEncomenda
              ? 'Receba pacotes na portaria, filtre por bloco ou rastreio e confirme retiradas em tempo real.'
              : 'Consulte encomendas recebidas na portaria e verifique pacotes aguardando retirada.'}
          </p>
        </div>
        {permissions.canCreateEncomenda && (
          <div className="page-header-actions">
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus size={16} />
              Registrar encomenda
            </Button>
          </div>
        )}
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      <section className="metrics-strip" aria-label="Resumo de encomendas">
        <div className="metric-cell">
          <span className="metric-label">Aguardando retirada</span>
          <span className="metric-value">{resumo.pendentes}</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Retiradas</span>
          <span className="metric-value">{resumo.retiradas}</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Total registrado</span>
          <span className="metric-value">{resumo.total}</span>
        </div>
      </section>

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} className="search-field-icon" />
          <input
            type="search"
            placeholder="Buscar por destinatário, bloco, apartamento ou rastreio"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar encomendas"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {permissions.isMorador && (
            <label className="checkbox-row" style={{ fontSize: '0.84rem' }}>
              <input
                type="checkbox"
                checked={apenasMinhaUnidade}
                onChange={(e) => setApenasMinhaUnidade(e.target.checked)}
              />
              Somente Bloco {unidade.bloco}, apto {unidade.apartamento}
            </label>
          )}

          <div className="segmented-control" role="tablist" aria-label="Filtrar por status">
            {[
              { key: 'pendentes', label: 'Aguardando' },
              { key: 'retiradas', label: 'Retiradas' },
              { key: 'todas', label: 'Todas' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={filtroStatus === tab.key}
                className={`segmented-btn ${filtroStatus === tab.key ? 'active' : ''}`}
                onClick={() => setFiltroStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={6} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhuma encomenda encontrada"
          description={
            busca || filtroStatus !== 'todas'
              ? 'Ajuste a busca ou mude o filtro de status para ver outros registros.'
              : 'Quando um pacote chegar à portaria, ele aparecerá listado aqui.'
          }
          action={
            permissions.canCreateEncomenda ? (
              <Button onClick={() => setDrawerOpen(true)}>Registrar primeira encomenda</Button>
            ) : null
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Destinatário</th>
                <th>Unidade</th>
                <th>Código de rastreio</th>
                <th>Recebido em</th>
                <th>Status</th>
                {permissions.canConfirmRetirada && <th style={{ textAlign: 'right' }}>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="cell-primary">{item.destinatario}</span>
                  </td>
                  <td className="tabular-nums">
                    Bloco {item.bloco}, apto {item.apartamento}
                  </td>
                  <td>
                    {item.codigo_rastreio ? (
                      <span className="code-literal">{item.codigo_rastreio}</span>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>Não informado</span>
                    )}
                  </td>
                  <td className="tabular-nums">{formatDateTimeBR(item.data_recebimento)}</td>
                  <td>
                    <StatusBadge tone={item.retirado ? 'success' : 'warning'}>
                      {item.retirado ? 'Retirada' : 'Aguardando'}
                    </StatusBadge>
                  </td>
                  {permissions.canConfirmRetirada && (
                    <td style={{ textAlign: 'right' }}>
                      {item.retirado ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                          Baixa concluída
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={confirmingId === item.id}
                          onClick={() => handleRetirar(item)}
                        >
                          <Check size={14} />
                          {confirmingId === item.id ? 'Confirmando...' : 'Registrar retirada'}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title="Registrar encomenda na portaria"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="encomenda-form" disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar encomenda'}
            </Button>
          </>
        }
      >
        <form id="encomenda-form" onSubmit={handleCreate} className="form-stack">
          <div className="field">
            <label htmlFor="enc-destinatario">Nome do destinatário</label>
            <input
              id="enc-destinatario"
              required
              placeholder="Ex.: Mariana Souza"
              value={form.destinatario}
              onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="enc-bloco">Bloco</label>
              <input
                id="enc-bloco"
                required
                placeholder="A"
                value={form.bloco}
                onChange={(e) => setForm({ ...form, bloco: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="enc-apto">Apartamento</label>
              <input
                id="enc-apto"
                required
                placeholder="101"
                value={form.apartamento}
                onChange={(e) => setForm({ ...form, apartamento: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="enc-rastreio">Código de rastreio (opcional)</label>
            <input
              id="enc-rastreio"
              placeholder="Ex.: BR987654321SP"
              value={form.codigo_rastreio}
              onChange={(e) => setForm({ ...form, codigo_rastreio: e.target.value })}
            />
            <span className="field-hint">
              Ajuda o morador a identificar pacotes de transportadoras.
            </span>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
