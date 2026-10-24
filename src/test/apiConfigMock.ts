// Jest stand-in for services/apiConfig.ts, which reads import.meta.env
// (Vite-only syntax that ts-jest's CommonJS output can't compile).
export const API_BASE_URL = 'http://api.test';
