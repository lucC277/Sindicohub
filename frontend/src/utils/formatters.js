export function formatDateBR(isoValue) {
  if (!isoValue) return '—';
  // Evita deslocamento de fuso horário em datas puras YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoValue)) {
    const [year, month, day] = isoValue.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimeBR(isoValue) {
  if (!isoValue) return '—';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRoleLabel(perfil) {
  const map = {
    sindico: 'Síndico',
    porteiro: 'Portaria',
    morador: 'Morador',
  };
  return map[perfil] || perfil || 'Condômino';
}

export function formatOcorrenciaStatus(status) {
  const map = {
    aberto: { label: 'Aberto', tone: 'danger' },
    em_analise: { label: 'Em análise', tone: 'warning' },
    resolvido: { label: 'Resolvido', tone: 'success' },
  };
  return map[status] || { label: status || 'Desconhecido', tone: 'neutral' };
}

export function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
