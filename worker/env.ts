import type { LiveSessionRoom } from "./live/LiveSessionRoom";

export type Env = {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  LIVE_SESSION_ROOM: DurableObjectNamespace<LiveSessionRoom>;
  ADMIN_EMAIL: string;
  APP_ORIGIN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

export type UserRole = "admin" | "teacher";
export type CurrentUser = { id: string; email: string; role: UserRole };
