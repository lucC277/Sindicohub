import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { extractApiError } from '../api/client';
import { avisosApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateBR } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRows } from '../components/ui/Skeleton';

export function RegimentoPage() {
  const { permissions } = useAuth();
  const toast = useToast();

  const { data: normas, loading, error, refetch } = useAsyncData(
    () => avisosApi.list('norma'),
    [],
    [],
  );

  const [busca, setBusca] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [fixado, setFixado] = useState(false);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return normas;
    return normas.filter((n) => `${n.titulo} ${n.conteudo}`.toLowerCase().includes(termo));
  }, [normas, busca]);

  const scrollToNorma = (id) => {
    setActiveId(id);
    const el = document.getElementById(`norma-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await avisosApi.create({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        tipo: 'norma',
        fixado,
      });
      toast.success('Norma adicionada ao regimento interno.');
      setTitulo('');
      setConteudo('');
      setFixado(false);
      setDrawerOpen(false);
      await refetch();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível adicionar a norma.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Regimento interno</h1>
          <p>
            Normas vigentes de convivência, horários de silêncio, reformas, mudanças,
            circulação de animais e uso das áreas comuns.
          </p>
        </div>
        {permissions.canCreateNorma && (
          <div className="page-header-actions">
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus size={16} />
              Adicionar norma
            </Button>
          </div>
        )}
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} className="search-field-icon" />
          <input
            type="search"
            placeholder="Consultar regra por tema (ex.: silêncio, obras, animais)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Consultar normas"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma norma cadastrada"
          description="As diretrizes de convivência aprovadas em convenção ficam disponíveis para consulta rápida aqui."
          action={
            permissions.canCreateNorma ? (
              <Button onClick={() => setDrawerOpen(true)}>Adicionar primeira norma</Button>
            ) : null
          }
        />
      ) : (
        <div className="regimento-layout">
          <nav className="regimento-toc" aria-label="Sumário do regimento">
            <div className="regimento-toc-title">Capítulos ({filtradas.length})</div>
            {filtradas.map((norma, index) => (
              <button
                key={norma.id}
                type="button"
                className={`regimento-toc-btn ${(activeId || filtradas[0]?.id) === norma.id ? 'active' : ''}`}
                onClick={() => scrollToNorma(norma.id)}
              >
                {index + 1}. {norma.titulo}
              </button>
            ))}
          </nav>

          <section className="regimento-doc" aria-label="Texto das normas">
            {filtradas.map((norma, index) => (
              <article
                key={norma.id}
                id={`norma-${norma.id}`}
                className="regimento-doc-article"
                style={{ scrollMarginTop: '88px' }}
              >
                <h2>
                  {index + 1}. {norma.titulo}
                </h2>
                <div className="regimento-doc-date">
                  Atualizado em {formatDateBR(norma.data_publicacao)}
                </div>
                <p className="regimento-doc-text">{norma.conteudo}</p>
              </article>
            ))}
          </section>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title="Adicionar norma ao regimento"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="norma-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar norma'}
            </Button>
          </>
        }
      >
        <form id="norma-form" onSubmit={handleCreate} className="form-stack">
          <div className="field">
            <label htmlFor="norma-titulo">Título da norma</label>
            <input
              id="norma-titulo"
              required
              placeholder="Ex.: Horário para mudanças e entregas pesadas"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="norma-conteudo">Diretrizes e condições</label>
            <textarea
              id="norma-conteudo"
              required
              rows={6}
              placeholder="Redija a regra de forma clara e objetiva conforme convenção do condomínio."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={fixado}
              onChange={(e) => setFixado(e.target.checked)}
            />
            Destacar no início do regimento
          </label>
        </form>
      </Drawer>
    </div>
  );
}
