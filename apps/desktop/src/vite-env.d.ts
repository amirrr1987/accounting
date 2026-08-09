/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module "vue" {
  interface GlobalDirectives {
    /** v-latin-digits — ارقام فارسی/عربی → انگلیسی؛ false برای خاموش */
    latinDigits: import("vue").Directive<
      HTMLElement,
      boolean | "on" | "off" | undefined
    >;
  }
}
