declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    THD_PUBLIC_ORIGIN?: string;
  }
}
