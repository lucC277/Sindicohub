import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Copy, Phone, Plus, ShieldCheck } from 'lucide-react';
import { extractApiError } from '../api/client';
import { plantaoApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

const INITIAL_FORM = {
  funcionario_nome: '',
  cargo: 'Porteiro',
  turno: 'Diurno (07:00 - 19:00)',
  telefone_contato: '',
  em_servico: true,
};

export function PlantaoPage() {
  const toast = useToast();
  const outletCtx = useOutletContext() || {};

  const { data: escalas, loading, error, refetch } = useAsyncData(
    () => plantaoApi.list(false),
    [],
    [],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const ativos = escalas.filter((item) => item.em_servico).length;

  const handleCopyPhone = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Contato copiado: ${phone}`);
    } catch {
      toast.info(`Contato: ${phone}`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await plantaoApi.create({
        funcionario_nome: form.funcionario_nome.trim(),
        cargo: form.cargo.trim(),
        turno: form.turno.trim(),
        telefone_contato: form.telefone_contato.trim() || null,
        em_servico: form.em_servico,
      });
      toast.success('Escala de plantão cadastrada.');
      setForm(INITIAL_FORM);
      setDrawerOpen(false);
      await refetch();
      outletCtx.refreshPlantaoAtivo?.();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível cadastrar a escala de plantão.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Escala de plantão da portaria</h1>
          <p>
            Controle de funcionários em turno e telefones ou ramais de emergência exibidos
            no indicador fixo do topo para todo o condomínio.
          </p>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} />
            Cadastrar plantão
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      <section className="metrics-strip" aria-label="Resumo da escala">
        <div className="metric-cell">
          <span className="metric-label">Em serviço agora</span>
          <span className="metric-value">{ativos}</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Turnos cadastrados</span>
          <span className="metric-value">{escalas.length}</span>
        </div>
      </section>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : escalas.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhuma escala de plantão cadastrada"
          description="Adicione o porteiro ou zelador em serviço para manter o contato de emergência visível no topo."
          action={<Button onClick={() => setDrawerOpen(true)}>Cadastrar primeiro plantão</Button>}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Cargo</th>
                <th>Turno</th>
                <th>Telefone / Ramal de emergência</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {escalas.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="cell-primary">{item.funcionario_nome}</span>
                  </td>
                  <td>{item.cargo}</td>
                  <td>{item.turno}</td>
                  <td>
                    {item.telefone_contato ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} style={{ color: 'var(--accent-primary)' }} />
                        <span>{item.telefone_contato}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPhone(item.telefone_contato)}
                        >
                          <Copy size={13} />
                          Copiar
                        </Button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>Não informado</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge tone={item.em_servico ? 'success' : 'neutral'}>
                      {item.em_servico ? 'Em serviço' : 'Fora de turno'}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title="Cadastrar escala de plantão"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="plantao-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar plantão'}
            </Button>
          </>
        }
      >
        <form id="plantao-form" onSubmit={handleCreate} className="form-stack">
          <div className="field">
            <label htmlFor="pl-nome">Nome do funcionário</label>
            <input
              id="pl-nome"
              required
              placeholder="Ex.: Carlos Portaria"
              value={form.funcionario_nome}
              onChange={(e) => setForm({ ...form, funcionario_nome: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="pl-cargo">Cargo</label>
              <input
                id="pl-cargo"
                required
                placeholder="Ex.: Porteiro Líder"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="pl-turno">Turno</label>
              <input
                id="pl-turno"
                required
                placeholder="Diurno (07:00 - 19:00)"
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="pl-tel">Telefone ou ramal de emergência</label>
            <input
              id="pl-tel"
              required
              placeholder="Ex.: Ramal 100 / (11) 98888-0001"
              value={form.telefone_contato}
              onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })}
            />
            <span className="field-hint">
              Quando marcado como em serviço, este contato aparece fixo no topo de todas as telas.
            </span>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.em_servico}
              onChange={(e) => setForm({ ...form, em_servico: e.target.checked })}
            />
            Funcionário atualmente em serviço
          </label>
        </form>
      </Drawer>
    </div>
  );
}
