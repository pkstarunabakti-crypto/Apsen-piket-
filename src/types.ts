export enum AttendanceType {
  CHECK_IN = 'check-in',
  CHECK_OUT = 'check-out',
}

export enum AttendanceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  userName: string;
  type: AttendanceType;
  timestamp: any; // Firestore Timestamp
  location: Location;
  photoUrl?: string;
  status: AttendanceStatus;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
