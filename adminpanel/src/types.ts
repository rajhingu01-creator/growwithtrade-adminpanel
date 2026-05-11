export type UserStatus = 'active' | 'deactivated';
export type TransactionMode = 'deposit' | 'withdraw' | 'trade';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'rejected';
export type KYCStatus = 'pending' | 'approved' | 'rejected';
export type AdminRole = 'super_admin' | 'admin' | 'staff';

export interface User {
  uid: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  password?: string;
  status: UserStatus;
  isActive?: boolean;
  registrationDate: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
  realBalance?: number;
  demoBalance?: number;
  isVerified?: boolean;
  isAdmin?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  mode: TransactionMode;
  currency: string;
  amount: number;
  status: TransactionStatus;
  date: string;
  paymentMethod?: string;
  details?: any;
  transactionCode?: string;
}

export interface KYC {
  userId: string;
  username?: string;
  email?: string;
  idType?: string;
  idNumber?: string;
  documentImage?: string;
  idProofUrl?: string;
  addressProofUrl?: string;
  selfieUrl?: string;
  status: KYCStatus;
  adminNotes?: string;
  updatedAt?: string;
  history?: any[];
}

export interface BankAccount {
  userId: string;
  bankName: string;
  accountNumber: string;
  ifsc?: string;
  upiId?: string;
  addedDate: string;
  history?: any[];
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  timestamp: string;
  details?: string;
}

export interface Admin {
  uid: string;
  email: string;
  role: AdminRole;
}

export interface LoginHistory {
  id: string;
  userId: string;
  timestamp: string;
  ipAddress: string;
  userAgent?: string;
  location?: string;
}
