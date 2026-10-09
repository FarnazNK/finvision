const configuredUrl = (
  import.meta.env?.VITE_AI_SERVICE_URL as string | undefined
)?.trim();

// Production deployments must configure the API origin, or serve it same-origin.
const defaultUrl = import.meta.env.PROD ? '' : 'http://localhost:8000';

export const API_BASE_URL = (configuredUrl || defaultUrl).replace(/\/+$/, '');
