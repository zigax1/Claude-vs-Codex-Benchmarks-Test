export interface AuthPayload {
  sub: number;
  email: string;
  [claim: string]: unknown;
}
