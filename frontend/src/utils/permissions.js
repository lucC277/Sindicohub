export const ROLES = {
  SINDICO: 'sindico',
  PORTEIRO: 'porteiro',
  MORADOR: 'morador',
};

export const ROUTE_ACCESS = {
  '/painel': [ROLES.SINDICO],
  '/encomendas': [ROLES.SINDICO, ROLES.PORTEIRO, ROLES.MORADOR],
  '/reservas': [ROLES.SINDICO, ROLES.PORTEIRO, ROLES.MORADOR],
  '/ocorrencias': [ROLES.SINDICO, ROLES.PORTEIRO, ROLES.MORADOR],
  '/mural': [ROLES.SINDICO, ROLES.PORTEIRO, ROLES.MORADOR],
  '/regimento': [ROLES.SINDICO, ROLES.PORTEIRO, ROLES.MORADOR],
  '/taxas': [ROLES.SINDICO, ROLES.MORADOR],
  '/plantao': [ROLES.SINDICO, ROLES.PORTEIRO],
};

export function getDefaultRouteForRole(perfil) {
  if (perfil === ROLES.SINDICO) return '/painel';
  if (perfil === ROLES.PORTEIRO) return '/encomendas';
  return '/reservas';
}

export function canAccessRoute(perfil, path) {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(perfil);
}

export function getPermissions(perfil) {
  const isSindico = perfil === ROLES.SINDICO;
  const isPorteiro = perfil === ROLES.PORTEIRO;
  const isMorador = perfil === ROLES.MORADOR;

  return {
    isSindico,
    isPorteiro,
    isMorador,
    canViewExecutiveDashboard: isSindico,
    canCreateEncomenda: isSindico || isPorteiro,
    canConfirmRetirada: isSindico || isPorteiro,
    canCreateAviso: isSindico,
    canCreateNorma: isSindico,
    canManagePlantao: isSindico || isPorteiro,
    canUpdateOcorrenciaStatus: isSindico,
    canCreateReserva: isSindico || isMorador,
    canViewTaxas: isSindico || isMorador,
  };
}
