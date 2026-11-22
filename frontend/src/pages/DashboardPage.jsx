import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, Megaphone, Package, RefreshCw } from 'lucide-react';
import { avisosApi, encomendasApi, ocorrenciasApi, reservasApi } from '../api/endpoints';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateBR, formatOcorrenciaStatus } from '../utils/formatters';
import { BarMetricChart } from '../components/charts/BarMetricChart';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

export function DashboardPage() {
  const { data, loading, error, refetch } = useAsyncData(async () => {
    const [encomendas, reservas, ocorrencias, comunicados] = await Promise.all([
      encomendasApi.list(),
      reservasApi.list(),
      ocorrenciasApi.list(),
      avisosApi.list('comunicado'),
    ]);
    return { encomendas, reservas, ocorrencias, comunicados };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { encomendas, reservas, ocorrencias, comunicados } = data;

    const pendentes = encomendas.filter((e) => !e.retirado).length;
    const retiradas = encomendas.filter((e) => e.retirado).length;

    const abertas = ocorrencias.filter((o) => o.status === 'aberto').length;
    const emAnalise = ocorrencias.filter((o) => o.status === 'em_analise').length;
    const resolvidas = ocorrencias.filter((o) => o.status === 'resolvido').length;
    const taxaResolucao =
      ocorrencias.length > 0 ? Math.round((resolvidas / ocorrencias.length) * 100) : 0;

    const porAreaMap = reservas.reduce((acc, res) => {
      acc[res.area] = (acc[res.area] || 0) + 1;
      return acc;
    }, {});

    const ocupacaoAreas = Object.entries(porAreaMap)
      .map(([label, value]) => ({
        label,
        value,
        suffix: value === 1 ? 'reserva' : 'reservas',
      }))
      .sort((a, b) => b.value - a.value);

    const ocorrenciasChart = [
      { label: 'Abertas', value: abertas, tone: 'danger' },
      { label: 'Em análise', value: emAnalise, tone: 'warning' },
      { label: 'Resolvidas', value: resolvidas, tone: 'success' },
    ];

    const encomendasChart = [
      { label: 'Aguardando retirada', value: pendentes, tone: 'warning' },
      { label: 'Retiradas', value: retiradas, tone: 'success' },
    ];

    return {
      pendentes,
      retiradas,
      totalEncomendas: encomendas.length,
      totalReservas: reservas.length,
      abertas,
      totalOcorrencias: ocorrencias.length,
      taxaResolucao,
      totalComunicados: comunicados.length,
      ocupacaoAreas,
      ocorrenciasChart,
      encomendasChart,
      ocorrenciasRecentes: ocorrencias.slice(0, 5),
      proximasReservas: reservas.slice(0, 5),
    };
  }, [data]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Painel executivo</h1>
          <p>
            Indicadores consolidados de portaria, ocupação de áreas comuns e
            atendimento de ocorrências em tempo real.
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" onClick={refetch} disabled={loading}>
            <RefreshCw size={15} />
            Atualizar dados
          </Button>
          <Link to="/mural" className="btn btn-primary">
            <Megaphone size={15} />
            Publicar comunicado
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      {loading || !stats ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <section className="metrics-strip" aria-label="Indicadores principais">
            <div className="metric-cell">
              <span className="metric-label">Encomendas pendentes</span>
              <span className="metric-value">{stats.pendentes}</span>
              <span className="metric-note">{stats.totalEncomendas} registradas no total</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">Reservas agendadas</span>
              <span className="metric-value">{stats.totalReservas}</span>
              <span className="metric-note">Áreas comuns confirmadas</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">Ocorrências abertas</span>
              <span className="metric-value">{stats.abertas}</span>
              <span className="metric-note">{stats.totalOcorrencias} chamados no histórico</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">Índice de resolução</span>
              <span className="metric-value">{stats.taxaResolucao}%</span>
              <span className="metric-note">Chamados marcados como resolvidos</span>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <h2>Status das ocorrências</h2>
                <Link to="/ocorrencias" className="btn btn-ghost btn-sm">
                  Gerenciar chamados
                </Link>
              </div>
              <div className="panel-body">
                <BarMetricChart
                  items={stats.ocorrenciasChart}
                  emptyMessage="Nenhuma ocorrência aberta até o momento."
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Ocupação por área comum</h2>
                <Link to="/reservas" className="btn btn-ghost btn-sm">
                  Ver agenda
                </Link>
              </div>
              <div className="panel-body">
                <BarMetricChart
                  items={stats.ocupacaoAreas}
                  emptyMessage="Nenhuma reserva registrada ainda."
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Fluxo de pacotes na portaria</h2>
                <Link to="/encomendas" className="btn btn-ghost btn-sm">
                  Abrir portaria
                </Link>
              </div>
              <div className="panel-body">
                <BarMetricChart
                  items={stats.encomendasChart}
                  emptyMessage="Nenhuma encomenda registrada."
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Ocorrências recentes</h2>
                <Link to="/ocorrencias" className="btn btn-ghost btn-sm">
                  Ver todas
                </Link>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {stats.ocorrenciasRecentes.length === 0 ? (
                  <p style={{ padding: '1.25rem', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                    Nenhuma ocorrência registrada.
                  </p>
                ) : (
                  <table className="data-table">
                    <tbody>
                      {stats.ocorrenciasRecentes.map((oc) => {
                        const badge = formatOcorrenciaStatus(oc.status);
                        return (
                          <tr key={oc.id}>
                            <td>
                              <span className="cell-primary">{oc.titulo}</span>
                              <span className="cell-secondary">
                                {oc.morador_nome} — Bloco {oc.bloco}, apto {oc.apartamento}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          <section className="panel" style={{ marginTop: '1.25rem' }}>
            <div className="panel-header">
              <h2>Próximas reservas confirmadas</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/encomendas" className="btn btn-secondary btn-sm">
                  <Package size={14} />
                  Encomendas
                </Link>
                <Link to="/ocorrencias" className="btn btn-secondary btn-sm">
                  <ClipboardList size={14} />
                  Ocorrências
                </Link>
                <Link to="/reservas" className="btn btn-secondary btn-sm">
                  <CalendarDays size={14} />
                  Reservas
                </Link>
              </div>
            </div>
            {stats.proximasReservas.length === 0 ? (
              <div className="panel-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                  Nenhuma reserva agendada para os próximos dias.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Área comum</th>
                    <th>Data</th>
                    <th>Turno</th>
                    <th>Morador / Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.proximasReservas.map((res) => (
                    <tr key={res.id}>
                      <td>
                        <span className="cell-primary">{res.area}</span>
                      </td>
                      <td className="tabular-nums">{formatDateBR(res.data_reserva)}</td>
                      <td>{res.periodo}</td>
                      <td>
                        {res.morador_nome} (Bloco {res.bloco}, apto {res.apartamento})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
