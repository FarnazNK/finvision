const configuredUrl = (
  import.meta.env?.VITE_AI_SERVICE_URL as string | undefined
)?.trim();

const defaultUrl = import.meta.env.PROD
  ? 'https://finvision-api.onrender.com'
  : 'http://localhost:8000';

export const API_BASE_URL = (configuredUrl || defaultUrl).replace(/\/+$/, '');
