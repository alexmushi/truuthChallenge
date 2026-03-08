export type RequiredDocType = 'AU_PASSPORT' | 'AU_DRIVER_LICENCE' | 'RESUME';

export type VerificationStatus = 'NOT_SUBMITTED' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface Submission {
  id: number;
  docType: RequiredDocType;
  status: VerificationStatus;
  documentVerifyId?: string;
  resultJson?: unknown;
  updatedAt?: string;
}

export interface User {
  id: number;
  username: string;
}
