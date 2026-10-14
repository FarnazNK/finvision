import { API_BASE_URL } from './apiConfig';

export interface SecFiling { form: string; filedAt: string; url: string }
export interface SecFilingsResponse {
  company: string;
  cik: string;
  source: string;
  filings: SecFiling[];
}

export async function fetchSecFilings(cik: string, signal?: AbortSignal): Promise<SecFilingsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/research/sec-filings?cik=${encodeURIComponent(cik)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(response.status === 503
      ? 'SEC filings data is unavailable. The backend must configure a contact User-Agent.'
      : 'Unable to load SEC filings. Check the CIK and retry.');
  }
  return response.json() as Promise<SecFilingsResponse>;
}
