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

export interface UpdateMyProfileRequest {
  email: string;
  firstName: string;
  lastName: string;
  currentPassword: string;
  newPassword?: string;
  reenterNewPassword?: string;
}

export interface MyProfileResponse {
  userId: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: string;
}

export interface CompanyProfile {
  organizationId: string;
  organizationName: string;
  primaryEmail: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface UpdateCompanyProfileRequest {
  organizationName: string;
  primaryEmail: string;
  currentPassword: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface ForgotPasswordCodeRequest {
  email: string;
}

export interface ResetPasswordWithCodeRequest {
  email: string;
  code: string;
  newPassword: string;
}
