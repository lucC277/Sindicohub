import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { extractApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getDefaultRouteForRole } from '../utils/permissions';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const DEMO_ACCOUNTS = [
  { role: 'Síndico', email: 'sindico@sindicohub.com', hint: 'Gestão total' },
  { role: 'Portaria', email: 'porteiro@sindicohub.com', hint: 'Encomendas' },
  { role: 'Morador', email: 'mariana@sindicohub.com', hint: 'Bloco A · 101' },
];

export function LoginPage() {
  const { isAuthenticated, usuario, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(usuario?.perfil)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const loggedUser = await login({ email: email.trim(), senha });
      toast.success(`Sessão iniciada como ${loggedUser.nome}.`);
      const fallback = getDefaultRouteForRole(loggedUser.perfil);
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/login' ? from : fallback, { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'E-mail ou senha incorretos.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setSenha('senhaSegura123');
    setError('');
  };

  return (
    <div className="login-page">
      <section className="login-aside" aria-label="Apresentação do SíndicoHub">
        <div className="rail-brand-link">
          <span className="brand-monogram" aria-hidden="true">
            SH
          </span>
          <div>
            <span className="brand-title">SíndicoHub</span>
            <span className="brand-subtitle">Administração e portaria</span>
          </div>
        </div>

        <div className="login-aside-body">
          <h1>Operação de portaria e convivência em um só diretório.</h1>
          <p>
            Controle de encomendas com baixa imediata, agenda de áreas comuns sem
            conflito de horários, ocorrências rastreadas e comunicados oficiais do
            condomínio.
          </p>

          <div className="login-directory-list">
            <div className="login-directory-item">
              <strong>Síndico</strong>
              <span>Painel executivo, comunicados, normas e ocorrências</span>
            </div>
            <div className="login-directory-item">
              <strong>Portaria</strong>
              <span>Recebimento de pacotes, retiradas e escala de plantão</span>
            </div>
            <div className="login-directory-item">
              <strong>Moradores</strong>
              <span>Reservas, boletos, ocorrências e regimento interno</span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--ink-on-rail-muted)' }}>
          SíndicoHub v4.0 — Portal integrado do condomínio
        </p>
      </section>

      <main className="login-main">
        <div className="login-card">
          <h2>Entrar no portal</h2>
          <p className="login-card-sub">
            Informe o e-mail cadastrado pela administração para acessar sua visão.
          </p>

          <ErrorBanner message={error} />

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="field">
              <label htmlFor="login-email">E-mail de acesso</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="nome@sindicohub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Senha</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={submitting} style={{ width: '100%', padding: '0.7rem' }}>
              <LogIn size={16} />
              {submitting ? 'Autenticando...' : 'Entrar no sistema'}
            </Button>
          </form>

          <div className="login-demo-accounts">
            <div className="login-demo-title">Preencher acesso de teste</div>
            <div className="login-demo-grid">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="demo-chip"
                  onClick={() => fillDemo(acc.email)}
                >
                  <strong>{acc.role}</strong>
                  <span>{acc.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
