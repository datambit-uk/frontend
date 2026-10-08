/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true"/"1" show DEV ribbon; "false"/"0" hide; unset → show only in Vite DEV. */
  readonly VITE_SHOW_DEV_RIBBON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
