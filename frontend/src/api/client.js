import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_STORAGE_KEY = 'sindicohub_auth';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    }
  } catch {
    // Ignora falha de leitura no storage
  }
  return config;
});

export function extractApiError(error, fallback = 'Não foi possível completar a solicitação.') {
  if (error?.response?.data?.mensagem) {
    return error.response.data.mensagem;
  }
  if (error?.response?.data?.detail) {
    return typeof error.response.data.detail === 'string'
      ? error.response.data.detail
      : fallback;
  }
  if (error?.code === 'ECONNABORTED') {
    return 'O servidor demorou para responder. Verifique se a API está ativa e tente novamente.';
  }
  if (!error?.response) {
    return `Sem conexão com o servidor (${API_BASE_URL}). Verifique se o backend FastAPI está em execução.`;
  }
  return fallback;
}
