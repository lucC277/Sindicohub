import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { extractApiError } from '../api/client';
import { reservasApi } from '../api/endpoints';
import { ESPACOS_COMUNS } from '../api/mockTaxas';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateBR } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toIsoDate(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function ReservasPage() {
  const { usuario, unidade, updateUnidade, permissions } = useAuth();
  const toast = useToast();
  const outletCtx = useOutletContext() || {};

  const { data: reservas, loading, error, refetch } = useAsyncData(
    () => reservasApi.list(),
    [],
    [],
  );

  const [areaSelecionada, setAreaSelecionada] = useState(ESPACOS_COMUNS[0].nome);
  const [dataReserva, setDataReserva] = useState('');
  const [periodoReserva, setPeriodoReserva] = useState('Noturno');
  const [bloco, setBloco] = useState(unidade.bloco);
  const [apartamento, setApartamento] = useState(unidade.apartamento);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [calCursor, setCalCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const reservasDaArea = useMemo(
    () => reservas.filter((r) => r.area === areaSelecionada),
    [reservas, areaSelecionada],
  );

  const ocupacaoPorData = useMemo(() => {
    const map = {};
    reservasDaArea.forEach((res) => {
      if (!map[res.data_reserva]) map[res.data_reserva] = [];
      map[res.data_reserva].push(res.periodo);
    });
    return map;
  }, [reservasDaArea]);

  const conflitoDetectado = useMemo(() => {
    if (!dataReserva) return false;
    const turnos = ocupacaoPorData[dataReserva] || [];
    return turnos.includes(periodoReserva);
  }, [dataReserva, periodoReserva, ocupacaoPorData]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calCursor.year, calCursor.month, 1).getDay();
    const totalDays = new Date(calCursor.year, calCursor.month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ empty: true, key: `empty-${i}` });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const iso = toIsoDate(calCursor.year, calCursor.month, day);
      cells.push({
        empty: false,
        key: iso,
        day,
        iso,
        turnos: ocupacaoPorData[iso] || [],
      });
    }
    return cells;
  }, [calCursor, ocupacaoPorData]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(calCursor.year, calCursor.month, 1));
  }, [calCursor]);

  const shiftMonth = (delta) => {
    setCalCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!dataReserva) {
      setFormError('Selecione uma data no calendário ou no campo de data.');
      return;
    }

    setSubmitting(true);
    try {
      updateUnidade({ bloco, apartamento });
      await reservasApi.create({
        area: areaSelecionada,
        morador_nome: usuario?.nome || 'Morador',
        apartamento: apartamento.trim(),
        bloco: bloco.trim(),
        data_reserva: dataReserva,
        periodo: periodoReserva,
      });
      toast.success(`Reserva confirmada para ${areaSelecionada} em ${formatDateBR(dataReserva)}.`);
      setDataReserva('');
      await refetch();
      outletCtx.refreshNotifications?.();
    } catch (err) {
      const msg = extractApiError(err, 'Não foi possível confirmar a reserva.');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Reservas de áreas comuns</h1>
          <p>
            Escolha o espaço, consulte os turnos já ocupados no calendário e confirme
            o agendamento com validação automática anti-conflito.
          </p>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      <div className="split-layout">
        <div>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            Espaços disponíveis ({ESPACOS_COMUNS.length})
          </h2>

          <div className="space-list" role="listbox" aria-label="Espaços comuns">
            {ESPACOS_COMUNS.map((espaco) => {
              const selected = areaSelecionada === espaco.nome;
              const count = reservas.filter((r) => r.area === espaco.nome).length;
              return (
                <button
                  key={espaco.nome}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`space-row ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    setAreaSelecionada(espaco.nome);
                    setFormError('');
                  }}
                >
                  <div className="space-row-main">
                    <div className="space-row-title">{espaco.nome}</div>
                    <div className="space-row-desc">{espaco.descricao}</div>
                  </div>
                  <div className="space-row-meta">
                    <span className="space-row-fee">{espaco.taxa}</span>
                    <span className="space-row-cap">
                      {espaco.capacidade} · {count} {count === 1 ? 'agendada' : 'agendadas'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <section className="calendar-panel" aria-label={`Agenda de ${areaSelecionada}`}>
            <div className="calendar-header">
              <div>
                <h3>{monthLabel}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                  Pontos indicam turnos já reservados para {areaSelecionada}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft size={15} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => shiftMonth(1)}
                  aria-label="Próximo mês"
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map((day) => (
                <div key={day} className="calendar-weekday">
                  {day}
                </div>
              ))}
              {calendarCells.map((cell) =>
                cell.empty ? (
                  <div key={cell.key} className="calendar-day empty" />
                ) : (
                  <button
                    key={cell.key}
                    type="button"
                    className={`calendar-day ${dataReserva === cell.iso ? 'selected' : ''}`}
                    onClick={() => {
                      setDataReserva(cell.iso);
                      setFormError('');
                    }}
                    title={
                      cell.turnos.length > 0
                        ? `Turnos ocupados: ${cell.turnos.join(', ')}`
                        : 'Data livre'
                    }
                  >
                    <span>{cell.day}</span>
                    {cell.turnos.length > 0 && (
                      <span className="calendar-day-dots" aria-hidden="true">
                        {cell.turnos.map((t) => (
                          <span key={t} className="calendar-dot" />
                        ))}
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </section>

          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            Próximas reservas confirmadas no condomínio
          </h2>

          {loading ? (
            <SkeletonRows rows={4} />
          ) : reservas.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma reserva agendada"
              description="Selecione um espaço e uma data ao lado para registrar o primeiro agendamento."
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Espaço</th>
                    <th>Data</th>
                    <th>Turno</th>
                    <th>Solicitante</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((res) => (
                    <tr key={res.id}>
                      <td>
                        <span className="cell-primary">{res.area}</span>
                      </td>
                      <td className="tabular-nums">{formatDateBR(res.data_reserva)}</td>
                      <td>{res.periodo}</td>
                      <td>
                        <span className="cell-primary">{res.morador_nome}</span>
                        <span className="cell-secondary">
                          Bloco {res.bloco}, apto {res.apartamento}
                        </span>
                      </td>
                      <td>
                        <StatusBadge tone="success">Confirmada</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="panel" style={{ position: 'sticky', top: 'calc(var(--topbar-height) + 1rem)' }}>
          <div className="panel-header">
            <div>
              <h2>Agendar {areaSelecionada}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Verificação imediata de conflito por data e turno
              </p>
            </div>
          </div>

          <div className="panel-body">
            {!permissions.canCreateReserva ? (
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
                O perfil de portaria possui acesso de consulta à agenda para controle de
                chaves e acesso dos convidados. Novos agendamentos devem ser solicitados
                pelo morador ou síndico.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="form-stack">
                <ErrorBanner message={formError} />

                <div className="field">
                  <label htmlFor="res-data">Data do evento</label>
                  <input
                    id="res-data"
                    type="date"
                    required
                    value={dataReserva}
                    onChange={(e) => {
                      setDataReserva(e.target.value);
                      setFormError('');
                    }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="res-periodo">Período</label>
                  <select
                    id="res-periodo"
                    value={periodoReserva}
                    onChange={(e) => {
                      setPeriodoReserva(e.target.value);
                      setFormError('');
                    }}
                  >
                    <option value="Diurno">Diurno (09:00 às 15:00)</option>
                    <option value="Noturno">Noturno (17:00 às 23:00)</option>
                  </select>
                  {conflitoDetectado && (
                    <span className="field-hint" style={{ color: 'var(--status-danger-fg)' }}>
                      Este turno já consta como reservado para {areaSelecionada} em{' '}
                      {formatDateBR(dataReserva)}.
                    </span>
                  )}
                </div>

                <div className="form-row-2">
                  <div className="field">
                    <label htmlFor="res-bloco">Bloco</label>
                    <input
                      id="res-bloco"
                      required
                      value={bloco}
                      onChange={(e) => setBloco(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="res-apto">Apartamento</label>
                    <input
                      id="res-apto"
                      required
                      value={apartamento}
                      onChange={(e) => setApartamento(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="res-morador">Solicitante</label>
                  <input id="res-morador" value={usuario?.nome || ''} disabled />
                </div>

                <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
                  {submitting ? 'Confirmando reserva...' : 'Confirmar reserva'}
                </Button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
