import { useMemo, useState } from 'react';
import { Megaphone, Pin, Plus, Search } from 'lucide-react';
import { extractApiError } from '../api/client';
import { avisosApi } from '../api/endpoints';
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

export function MuralPage() {
  const { permissions } = useAuth();
  const toast = useToast();

  const { data: avisos, loading, error, refetch } = useAsyncData(
    () => avisosApi.list('comunicado'),
    [],
    [],
  );

  const [busca, setBusca] = useState('');
  const [somenteFixados, setSomenteFixados] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [fixado, setFixado] = useState(false);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return avisos.filter((item) => {
      if (somenteFixados && !item.fixado) return false;
      if (!termo) return true;
      return `${item.titulo} ${item.conteudo}`.toLowerCase().includes(termo);
    });
  }, [avisos, busca, somenteFixados]);

  const handlePublish = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await avisosApi.create({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        tipo: 'comunicado',
        fixado,
      });
      toast.success('Comunicado publicado no mural.');
      setTitulo('');
      setConteudo('');
      setFixado(false);
      setDrawerOpen(false);
      await refetch();
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível publicar o comunicado.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Mural de avisos</h1>
          <p>
            Comunicados oficiais da administração, manutenções programadas e convocações
            de assembleia ordenados por prioridade e data de publicação.
          </p>
        </div>
        {permissions.canCreateAviso && (
          <div className="page-header-actions">
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus size={16} />
              Publicar comunicado
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
            placeholder="Filtrar comunicados por palavra-chave"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Filtrar comunicados"
          />
        </div>

        <div className="segmented-control" role="tablist" aria-label="Filtro de comunicados">
          <button
            type="button"
            role="tab"
            aria-selected={!somenteFixados}
            className={`segmented-btn ${!somenteFixados ? 'active' : ''}`}
            onClick={() => setSomenteFixados(false)}
          >
            Todos ({avisos.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={somenteFixados}
            className={`segmented-btn ${somenteFixados ? 'active' : ''}`}
            onClick={() => setSomenteFixados(true)}
          >
            Fixados ({avisos.filter((a) => a.fixado).length})
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum comunicado publicado"
          description="Os avisos da administração sobre manutenção, obras e assembleias aparecerão aqui."
          action={
            permissions.canCreateAviso ? (
              <Button onClick={() => setDrawerOpen(true)}>Publicar primeiro comunicado</Button>
            ) : null
          }
        />
      ) : (
        <div className="editorial-feed">
          {filtrados.map((aviso) => (
            <article
              key={aviso.id}
              className={`editorial-post ${aviso.fixado ? 'pinned' : ''}`}
            >
              <div className="editorial-post-top">
                <h3>{aviso.titulo}</h3>
                {aviso.fixado && (
                  <StatusBadge tone="warning">
                    <Pin size={12} />
                    Fixado
                  </StatusBadge>
                )}
              </div>
              <p className="editorial-post-body">{aviso.conteudo}</p>
              <div className="editorial-post-meta">
                <span>Administração do condomínio</span>
                <time dateTime={aviso.data_publicacao} className="tabular-nums">
                  Publicado em {formatDateTimeBR(aviso.data_publicacao)}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title="Publicar comunicado no mural"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="mural-form" disabled={saving}>
              {saving ? 'Publicando...' : 'Publicar comunicado'}
            </Button>
          </>
        }
      >
        <form id="mural-form" onSubmit={handlePublish} className="form-stack">
          <div className="field">
            <label htmlFor="aviso-titulo">Título do comunicado</label>
            <input
              id="aviso-titulo"
              required
              placeholder="Ex.: Limpeza semestral das caixas d'água"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="aviso-conteudo">Texto do comunicado</label>
            <textarea
              id="aviso-conteudo"
              required
              rows={6}
              placeholder="Informe datas, horários afetados e orientações aos moradores."
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
            Fixar no topo do mural como aviso prioritário
          </label>
        </form>
      </Drawer>
    </div>
  );
}
