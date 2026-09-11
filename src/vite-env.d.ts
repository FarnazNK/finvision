/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  /** Base URL of the FinVision AI service (see ai-service/). */
  readonly VITE_AI_SERVICE_URL?: string;
  readonly VITE_AI_SERVICE_API_KEY?: string;
}

declare const __FINVISION_DEV__: boolean | undefined;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
