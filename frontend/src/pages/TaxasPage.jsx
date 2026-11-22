import { useMemo, useState } from 'react';
import { Copy, Download, Info } from 'lucide-react';
import { MOCK_TAXAS } from '../api/mockTaxas';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';

export function TaxasPage() {
  const { unidade } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState('todas');

  const pendenteAtual = useMemo(
    () => MOCK_TAXAS.find((t) => t.status === 'Pendente') || null,
    [],
  );

  const historico = useMemo(() => {
    if (filtro === 'todas') return MOCK_TAXAS;
    return MOCK_TAXAS.filter((t) => t.status.toLowerCase() === filtro);
  }, [filtro]);

  const handleCopy = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success('Linha digitável copiada para a área de transferência.');
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione o código manualmente.');
    }
  };

  const handleDownloadDemonstrativo = (taxa) => {
    const content = [
      'SÍNDICOHUB — DEMONSTRATIVO DE TAXA CONDOMINIAL (MODO DEMONSTRAÇÃO)',
      '--------------------------------------------------------------------',
      `Unidade: Bloco ${unidade.bloco}, Apartamento ${unidade.apartamento}`,
      `Competência: ${taxa.competencia}`,
      `Descrição: ${taxa.descricao}`,
      `Vencimento: ${taxa.vencimento}`,
      `Valor: ${taxa.valor}`,
      `Situação: ${taxa.status}`,
      `Linha digitável: ${taxa.codigoBarras}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `demonstrativo-${taxa.competencia.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Demonstrativo de ${taxa.competencia} baixado.`);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Taxas e boletos</h1>
          <p>
            Extrato da cota condominial para Bloco {unidade.bloco}, apartamento{' '}
            {unidade.apartamento}, com cópia rápida da linha digitável.
          </p>
        </div>
      </div>

      <div className="info-banner" role="note">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Info size={16} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
          <span>
            Exibição em modo demonstrativo: a API atual ainda não possui persistência de
            boletos no banco de dados.
          </span>
        </div>
        <StatusBadge tone="info">Dados demonstrativos</StatusBadge>
      </div>

      {pendenteAtual && (
        <section className="finance-highlight" aria-label="Competência em aberto">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.86rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                Competência em aberto — {pendenteAtual.competencia}
              </span>
              <StatusBadge tone="warning">Pendente</StatusBadge>
            </div>
            <div className="finance-amount">{pendenteAtual.valor}</div>
            <p style={{ fontSize: '0.86rem', color: 'var(--ink-secondary)' }}>
              Vencimento em <strong>{pendenteAtual.vencimento}</strong> · {pendenteAtual.descricao}
            </p>
            <div className="barcode-line">
              <span className="code-literal">{pendenteAtual.codigoBarras}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <Button onClick={() => handleCopy(pendenteAtual.codigoBarras)}>
              <Copy size={15} />
              Copiar linha digitável
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownloadDemonstrativo(pendenteAtual)}
            >
              <Download size={15} />
              Baixar demonstrativo
            </Button>
          </div>
        </section>
      )}

      <div className="toolbar">
        <h2 style={{ fontSize: '1rem' }}>Histórico de competências</h2>
        <div className="segmented-control" role="tablist" aria-label="Filtrar boletos">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'pendente', label: 'Pendentes' },
            { key: 'pago', label: 'Pagas' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filtro === tab.key}
              className={`segmented-btn ${filtro === tab.key ? 'active' : ''}`}
              onClick={() => setFiltro(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Competência</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Linha digitável</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((taxa) => (
              <tr key={taxa.id}>
                <td>
                  <span className="cell-primary">{taxa.competencia}</span>
                  <span className="cell-secondary">{taxa.descricao}</span>
                </td>
                <td className="tabular-nums">{taxa.vencimento}</td>
                <td className="tabular-nums" style={{ fontWeight: 600 }}>
                  {taxa.valor}
                </td>
                <td>
                  <StatusBadge tone={taxa.status === 'Pago' ? 'success' : 'warning'}>
                    {taxa.status}
                  </StatusBadge>
                </td>
                <td>
                  <span className="code-literal">
                    {taxa.codigoBarras.slice(0, 24)}...
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopy(taxa.codigoBarras)}
                    >
                      <Copy size={13} />
                      Copiar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadDemonstrativo(taxa)}
                    >
                      <Download size={13} />
                      2ª via
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
