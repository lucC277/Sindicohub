import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { authApi } from '../api/endpoints';
import { getPermissions } from '../utils/permissions';

const AUTH_STORAGE_KEY = 'sindicohub_auth';
const UNIT_STORAGE_KEY = 'sindicohub_unit_prefs';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: null, usuario: null };
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.usuario) {
      return { token: parsed.token, usuario: parsed.usuario };
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return { token: null, usuario: null };
}

function readStoredUnit(email) {
  const defaults = { bloco: 'A', apartamento: '101' };
  if (!email) return defaults;
  try {
    const raw = localStorage.getItem(UNIT_STORAGE_KEY);
    if (!raw) return defaults;
    const map = JSON.parse(raw);
    if (map && map[email]?.bloco && map[email]?.apartamento) {
      return map[email];
    }
  } catch {
    // fallback para padrão
  }
  return defaults;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const initial = readStoredAuth();
  const [token, setToken] = useState(initial.token);
  const [usuario, setUsuario] = useState(initial.usuario);
  const [unidade, setUnidadeState] = useState(() => readStoredUnit(initial.usuario?.email));

  const login = useCallback(async ({ email, senha }) => {
    const data = await authApi.login({ email, senha });
    const nextToken = data.access_token || 'token_sessao_ativa';
    const nextUser = data.usuario || {
      id: 0,
      nome: email.split('@')[0],
      email,
      perfil: 'morador',
    };

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: nextToken, usuario: nextUser }),
    );
    setToken(nextToken);
    setUsuario(nextUser);
    setUnidadeState(readStoredUnit(nextUser.email));
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
    setUsuario(null);
  }, []);

  const updateUnidade = useCallback(
    (nextUnidade) => {
      const sanitized = {
        bloco: (nextUnidade.bloco || 'A').trim(),
        apartamento: (nextUnidade.apartamento || '101').trim(),
      };
      setUnidadeState(sanitized);
      if (usuario?.email) {
        try {
          const raw = localStorage.getItem(UNIT_STORAGE_KEY);
          const map = raw ? JSON.parse(raw) : {};
          map[usuario.email] = sanitized;
          localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(map));
        } catch {
          // ignora erro de quota
        }
      }
    },
    [usuario],
  );

  const permissions = useMemo(() => getPermissions(usuario?.perfil), [usuario?.perfil]);

  const value = useMemo(
    () => ({
      token,
      usuario,
      unidade,
      isAuthenticated: Boolean(token && usuario),
      permissions,
      login,
      logout,
      updateUnidade,
    }),
    [token, usuario, unidade, permissions, login, logout, updateUnidade],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
}
