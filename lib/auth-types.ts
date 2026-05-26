export type AuthRole = "TEAM" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

export interface AuthTokenPayload extends AuthUser {
  sub: string;
}
