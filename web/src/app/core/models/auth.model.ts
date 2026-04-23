export interface User {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  userRole: string;
  isEnabled: boolean;
  createdOn: Date;
  lastLoginOn?: Date;
}

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  licenseTier: string;
  registrationToken: string;
  accessToken?: string;
  refreshToken?: string;
  // Terminal binding context
  terminalId?: string;
  terminalCode?: string;
  location?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  // Terminal binding: optional terminalId (UUID) from TerminalContextService
  terminalId?: string;
}

export interface RegisterUserRequest {
  companyRegistrationCode: string;
  email: string;
  userName: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterCompanyRequest {
  companyName: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  locality: string;
  region: string;
  postalCode: string;
  countryCode: string;
  licenseTier: number;
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface CompanyRegistrationResponse {
  organizationId: string;
  companyName: string;
  registrationToken: string;
  licenseTier: string;
  adminAuth: AuthResponse;
}
