import { apiClient } from './client';

export const authApi = {
  login: async ({ email, senha }) => {
    const { data } = await apiClient.post('/login', { email, senha });
    return data;
  },
};

export const encomendasApi = {
  list: async () => {
    const { data } = await apiClient.get('/encomendas');
    return Array.isArray(data) ? data : [];
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/encomendas', payload);
    return data;
  },
  retirar: async (encomendaId) => {
    const { data } = await apiClient.put(`/encomendas/${encomendaId}/retirar`);
    return data;
  },
};

export const avisosApi = {
  list: async (tipo) => {
    const { data } = await apiClient.get('/avisos', {
      params: tipo ? { tipo } : undefined,
    });
    return Array.isArray(data) ? data : [];
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/avisos', payload);
    return data;
  },
};

export const plantaoApi = {
  list: async (somenteAtivos = true) => {
    const { data } = await apiClient.get('/plantao', {
      params: { somente_ativos: somenteAtivos },
    });
    return Array.isArray(data) ? data : [];
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/plantao', payload);
    return data;
  },
};

export const reservasApi = {
  list: async () => {
    const { data } = await apiClient.get('/reservas');
    return Array.isArray(data) ? data : [];
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/reservas', payload);
    return data;
  },
};

export const ocorrenciasApi = {
  list: async () => {
    const { data } = await apiClient.get('/ocorrencias');
    return Array.isArray(data) ? data : [];
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/ocorrencias', payload);
    return data;
  },
  updateStatus: async (ocorrenciaId, status) => {
    const { data } = await apiClient.put(`/ocorrencias/${ocorrenciaId}/status`, { status });
    return data;
  },
};
