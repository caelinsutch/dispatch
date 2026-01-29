/// <reference types="@cloudflare/workers-types" />

// Extend CloudflareEnv to include our D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

export {};
