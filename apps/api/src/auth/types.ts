export type Role = "ADMIN" | "VENDOR" | "COURIER" | "CLIENT";

export type AuthPayload = {
  sub: string;
  role: Role;
  vendorId?: string;
  courierId?: string;
  clientId?: string;
};

export type AuthContext = AuthPayload & {
  token: string;
};
