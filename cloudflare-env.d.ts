declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SCHOOL_OWNER_EMAIL?: string;
  }
}
