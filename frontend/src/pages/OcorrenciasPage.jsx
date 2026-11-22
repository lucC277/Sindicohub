import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { extractApiError } from '../api/client';
import { ocorrenciasApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTimeBR, formatOcorrenciaStatus } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'resolvido', label: 'Resolvido' },
];

export function OcorrenciasPage() {
  const { usuario, unidade, updateUnidade, permissions } = useAuth();
  const toast = useToast();
  const outletCtx = useOutletContext() || {};

  const { data: ocorrencias, loading, error, refetch } = useAsyncData(
    () => ocorrenciasApi.list(),
    [],
    [],
  );

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [bloco, setBloco] = useState(unidade.bloco);
  const [apartamento, setApartamento] = useState(unidade.apartamento);

  const resumo = useMemo(() => {
    return {
      aberto: ocorrencias.filter((o) => o.status === 'aberto').length,
      em_analise: ocorrencias.filter((o) => o.status === 'em_analise').length,
      resolvido: ocorrencias.filter((o) => o.status === 'resolvido').length,
    };
  }, [ocorrencias]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ocorrencias.filter((item) => {
      if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false;
      if (!termo) return true;
      return [
        item.titulo,
        item.descricao,
        item.morador_nome,
        item.bloco,
        item.apartamento,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo);
    });
  }, [ocorrencias, busca, filtroStatus]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      updateUnidade({ bloco, apartamento });
      await ocorrenciasApi.create({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        morador_nome: usuario?.nome || 'Morador',
        bloco: bloco.trim(),
        apartamento: apartamento.trim(),
      });
      toast.success('Ocorrência registrada e encaminhada à administração.');
      setTitulo('');
      setDescricao('');
      setCreateOpen(false);
      await refetch();
      outletCtx.refreshNotifications?.();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível registrar a ocorrência.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!selected || selected.status === nextStatus) return;
    setUpdatingStatus(true);
    try {
      await ocorrenciasApi.updateStatus(selected.id, nextStatus);
      const label = formatOcorrenciaStatus(nextStatus).label;
      toast.success(`Status atualizado para "${label}".`);
      setSelected((prev) => (prev ? { ...prev, status: nextStatus } : null));
      await refetch();
      outletCtx.refreshNotifications?.();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível atualizar o status.'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Ocorrências e chamados</h1>
          <p>
            {permissions.canUpdateOcorrenciaStatus
              ? 'Acompanhe relatos dos condôminos e atualize o andamento de cada chamado.'
              : 'Registre relatos de manutenção ou convivência e acompanhe a resposta da administração.'}
          </p>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Registrar ocorrência
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      <section className="metrics-strip" aria-label="Resumo de ocorrências">
        <div className="metric-cell">
          <span className="metric-label">Abertas</span>
          <span className="metric-value">{resumo.aberto}</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Em análise</span>
          <span className="metric-value">{resumo.em_analise}</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Resolvidas</span>
          <span className="metric-value">{resumo.resolvido}</span>
        </div>
      </section>

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} className="search-field-icon" />
          <input
            type="search"
            placeholder="Buscar por título, descrição, morador ou unidade"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar ocorrências"
          />
        </div>

        <div className="segmented-control" role="tablist" aria-label="Filtrar por status">
          {[
            { key: 'todos', label: 'Todas' },
            { key: 'aberto', label: 'Abertas' },
            { key: 'em_analise', label: 'Em análise' },
            { key: 'resolvido', label: 'Resolvidas' },
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

      {loading ? (
        <SkeletonRows rows={5} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ocorrência encontrada"
          description="Não há chamados para o filtro selecionado."
          action={<Button onClick={() => setCreateOpen(true)}>Abrir ocorrência</Button>}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Relator / Unidade</th>
                <th>Abertura</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((oc) => {
                const badge = formatOcorrenciaStatus(oc.status);
                return (
                  <tr key={oc.id}>
                    <td>
                      <span className="cell-primary">{oc.titulo}</span>
                      <span className="cell-secondary">
                        {oc.descricao.length > 90
                          ? `${oc.descricao.slice(0, 90)}...`
                          : oc.descricao}
                      </span>
                    </td>
                    <td>
                      <span className="cell-primary">{oc.morador_nome}</span>
                      <span className="cell-secondary">
                        Bloco {oc.bloco}, apto {oc.apartamento}
                      </span>
                    </td>
                    <td className="tabular-nums">{formatDateTimeBR(oc.data_abertura)}</td>
                    <td>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="secondary" size="sm" onClick={() => setSelected(oc)}>
                        Abrir detalhes
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={createOpen}
        title="Registrar nova ocorrência"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="ocorrencia-form" disabled={saving}>
              {saving ? 'Enviando...' : 'Registrar ocorrência'}
            </Button>
          </>
        }
      >
        <form id="ocorrencia-form" onSubmit={handleCreate} className="form-stack">
          <div className="field">
            <label htmlFor="oc-titulo">Assunto</label>
            <input
              id="oc-titulo"
              required
              placeholder="Ex.: Lâmpada queimada no corredor do 3º andar"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="oc-desc">Descrição detalhada</label>
            <textarea
              id="oc-desc"
              required
              rows={5}
              placeholder="Descreva o local exato, horário e detalhes relevantes para agilizar a solução."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="oc-bloco">Bloco</label>
              <input
                id="oc-bloco"
                required
                value={bloco}
                onChange={(e) => setBloco(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="oc-apto">Apartamento</label>
              <input
                id="oc-apto"
                required
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
              />
            </div>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(selected)}
        title={selected ? `Ocorrência #${selected.id}` : ''}
        onClose={() => setSelected(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Fechar
          </Button>
        }
      >
        {selected && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <StatusBadge tone={formatOcorrenciaStatus(selected.status).tone}>
                {formatOcorrenciaStatus(selected.status).label}
              </StatusBadge>
              <h3 style={{ marginTop: '0.65rem', fontSize: '1.15rem' }}>{selected.titulo}</h3>
            </div>

            <dl className="detail-meta-grid">
              <div>
                <dt>Relator</dt>
                <dd>{selected.morador_nome}</dd>
              </div>
              <div>
                <dt>Unidade</dt>
                <dd>
                  Bloco {selected.bloco}, apto {selected.apartamento}
                </dd>
              </div>
              <div>
                <dt>Data de abertura</dt>
                <dd className="tabular-nums">{formatDateTimeBR(selected.data_abertura)}</dd>
              </div>
              <div>
                <dt>Situação atual</dt>
                <dd>{formatOcorrenciaStatus(selected.status).label}</dd>
              </div>
            </dl>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.86rem', color: 'var(--ink-secondary)', marginBottom: '0.4rem' }}>
                Relato completo
              </h4>
              <p style={{ whiteSpace: 'pre-line', lineHeight: 1.65 }}>{selected.descricao}</p>
            </div>

            {permissions.canUpdateOcorrenciaStatus && (
              <div
                style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ fontSize: '0.88rem' }}>Atualizar situação do chamado</h4>
                <div className="status-actions-group">
                  {STATUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={selected.status === opt.value ? 'primary' : 'secondary'}
                      disabled={updatingStatus || selected.status === opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
