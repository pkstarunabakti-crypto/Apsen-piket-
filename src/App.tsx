/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  browserPopupRedirectResolver 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { 
  Camera, 
  MapPin, 
  LogIn, 
  LogOut, 
  History, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck,
  Users,
  Settings,
  Filter,
  Check,
  X,
  ArrowUpDown,
  User as UserIcon,
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  AlertCircle,
  Menu,
  WifiOff,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { auth, db, googleProvider } from './lib/firebase';
import { cn, handleFirestoreError } from './lib/utils';
import { 
  AttendanceType, 
  AttendanceStatus, 
  AttendanceRecord, 
  OperationType,
  UserProfile 
} from './types';
// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-zinc-50 z-50">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-zinc-600 font-medium">Memuat Absen Pintar...</p>
    </div>
  </div>
);

const Navbar = ({ 
  user, 
  profile, 
  onSignOut, 
  isAdminMode, 
  setIsAdminMode 
}: { 
  user: User, 
  profile: UserProfile | null, 
  onSignOut: () => void,
  isAdminMode: boolean,
  setIsAdminMode: (v: boolean) => void
}) => (
  <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-zinc-200">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-zinc-900">Absen <span className="text-blue-600">Pintar</span></span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setIsAdminMode(!isAdminMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
              isAdminMode 
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200" 
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            {isAdminMode ? <UserIcon className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{isAdminMode ? 'Mode User' : 'Mode Admin'}</span>
          </button>
        )}

        <div className="hidden md:flex flex-col items-end mr-1">
          <span className="text-sm font-medium text-zinc-900">{profile?.displayName || user.displayName}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{profile?.role || 'User'}</span>
        </div>
        <img 
          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
          alt="Avatar" 
          className="w-8 h-8 rounded-full border border-zinc-200"
          referrerPolicy="no-referrer"
        />
        <button 
          onClick={onSignOut}
          className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600"
          title="Keluar"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  </nav>
);

const AdminDashboard = ({ 
  records, 
  users, 
  onUpdateStatus, 
  onUpdateRole 
}: { 
  records: AttendanceRecord[], 
  users: UserProfile[],
  onUpdateStatus: (id: string, status: AttendanceStatus) => void,
  onUpdateRole: (uid: string, role: 'user' | 'admin') => void
}) => {
  const [tab, setTab] = useState<'attendance' | 'users'>('attendance');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-zinc-200">
        <button 
          onClick={() => setTab('attendance')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all",
            tab === 'attendance' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-zinc-500 hover:bg-zinc-50"
          )}
        >
          <History className="w-4 h-4" />
          Semua Absen
        </button>
        <button 
          onClick={() => setTab('users')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all",
            tab === 'users' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-zinc-500 hover:bg-zinc-50"
          )}
        >
          <Users className="w-4 h-4" />
          Manajemen User
        </button>
      </div>

      {tab === 'attendance' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">Total {records.length} Record</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full border border-yellow-100 font-bold uppercase">
                {records.filter(r => r.status === 'pending').length} Pending
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {records.map(record => (
              <motion.div 
                layout
                key={record.id}
                className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${record.userName}&background=random`} 
                      className="w-10 h-10 rounded-xl"
                      alt={record.userName}
                    />
                    <div>
                      <h4 className="font-bold text-zinc-900">{record.userName}</h4>
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                        {record.timestamp ? format(record.timestamp.toDate(), 'HH:mm • d MMM yyyy') : '...'}
                        {(record as any)._pending && <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    record.type === AttendanceType.CHECK_IN ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {record.type}
                  </div>
                </div>

                {record.photoUrl && (
                  <div className="mb-4 relative rounded-2xl overflow-hidden aspect-video bg-zinc-100">
                    <img src={record.photoUrl} className="w-full h-full object-cover" alt="Verification" />
                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] text-white">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-dashed border-zinc-100">
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-bold capitalize",
                    record.status === AttendanceStatus.APPROVED ? "text-green-600" : 
                    record.status === AttendanceStatus.REJECTED ? "text-red-600" : 
                    "text-yellow-600"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full", 
                      record.status === AttendanceStatus.APPROVED ? "bg-green-600" : 
                      record.status === AttendanceStatus.REJECTED ? "bg-red-600" : 
                      "bg-yellow-600"
                    )} />
                    {record.status}
                  </div>
                  
                  {record.status === AttendanceStatus.PENDING && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onUpdateStatus(record.id!, AttendanceStatus.REJECTED)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(record.id!, AttendanceStatus.APPROVED)}
                        className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                          className="w-10 h-10 rounded-xl border border-zinc-100"
                          alt={u.displayName}
                        />
                        <div>
                          <p className="font-bold text-zinc-900">{u.displayName}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={u.role}
                        onChange={(e) => onUpdateRole(u.uid, e.target.value as 'user' | 'admin')}
                        className="bg-zinc-100 border-none text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Data lists
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const [currentAttendanceType, setCurrentAttendanceType] = useState<AttendanceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Passive Location Fetching
  useEffect(() => {
    if (user && !isAdminMode) {
      const getPos = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => {
            console.warn("Initial location error", err);
            // Don't show critical error on dashboard yet to keep it clean
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      };
      getPos();
      const id = setInterval(getPos, 30000); // Update every 30s
      return () => clearInterval(id);
    }
  }, [user, isAdminMode]);

  // 1. Auth Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (currentUser.email === 'marko13366@gmail.com' && data.role !== 'admin') {
              await updateDoc(userDocRef, { role: 'admin' });
              setProfile({ ...data, role: 'admin' });
            } else {
              setProfile(data);
            }
          } else {
            const isAdminEmail = currentUser.email === 'marko13366@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'User',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          console.error("Error fetching profile", e);
        }
      } else {
        setProfile(null);
        setRecords([]);
        setAllRecords([]);
        setAllUsers([]);
        setIsAdminMode(false);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Personal Attendance Listener
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        _pending: doc.metadata.hasPendingWrites 
      } as AttendanceRecord & { _pending?: boolean }));
      setRecords(docs);
    }, (err) => {
      console.error("Snapshot error (User)", err);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Admin Listeners
  useEffect(() => {
    if (profile?.role !== 'admin' || !isAdminMode) return;

    // All Attendance
    const recordsQuery = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(50));
    const unsubRecords = onSnapshot(recordsQuery, { includeMetadataChanges: true }, (snap) => {
      setAllRecords(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        _pending: d.metadata.hasPendingWrites 
      } as AttendanceRecord & { _pending?: boolean })));
    }, (err) => console.error("Admin Records error", err));

    // All Users
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    }, (err) => console.error("Admin Users error", err));

    return () => {
      unsubRecords();
      unsubUsers();
    };
  }, [profile, isAdminMode]);

  const handleSignIn = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      // Passive trigger for permissions
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1000 });
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError("Gagal masuk dengan Google. Silakan coba lagi.");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = () => signOut(auth);

  const startCamera = async (type: AttendanceType) => {
    setError(null);
    setShowCamera(true);
    setCurrentAttendanceType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Refresh location while opening camera
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Gagal mendapatkan lokasi. Izinkan akses lokasi."),
        { enableHighAccuracy: true }
      );
    } catch (err) {
      console.error(err);
      setError("Gagal mengakses kamera. Izinkan akses kamera.");
    }
  };

  const captureAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current || !currentAttendanceType) return;
    if (!location) {
      setError("Menunggu lokasi GPS... Pastikan GPS aktif.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Capture
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      
      // 2. Submit
      const newRecord: Omit<AttendanceRecord, 'id'> = {
        userId: user!.uid,
        userName: profile?.displayName || user!.displayName || 'Unknown',
        type: currentAttendanceType,
        timestamp: serverTimestamp(),
        location: {
          lat: location.lat,
          lng: location.lng,
          address: "Lokasi saat ini" 
        },
        photoUrl: dataUrl,
        status: AttendanceStatus.PENDING
      };

      await addDoc(collection(db, 'attendance'), newRecord);
      
      // 3. Cleanup
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
      setCurrentAttendanceType(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions
  const updateRecordStatus = async (id: string, status: AttendanceStatus) => {
    try {
      await updateDoc(doc(db, 'attendance', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'attendance');
    }
  };

  const updateUserRole = async (uid: string, role: 'user' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      if (role === 'admin') {
        const userToPromote = allUsers.find(u => u.uid === uid);
        await setDoc(doc(db, 'admins', uid), { email: userToPromote?.email || '' });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 text-center"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Absen Pintar</h1>
          <p className="text-zinc-500 mb-8">Solusi absensi modern untuk efisiensi kerja tim Anda.</p>
          
          <button 
            disabled={isAuthenticating}
            onClick={handleSignIn}
            className={cn(
              "w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold py-4 px-6 border-2 border-zinc-200 rounded-2xl transition-all active:scale-95",
              isAuthenticating ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-50"
            )}
          >
            {isAuthenticating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            )}
            {isAuthenticating ? "Menghubungkan..." : "Masuk dengan Google"}
          </button>
        </motion.div>
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const hasCheckedIn = records.some(r => r.type === AttendanceType.CHECK_IN && r.timestamp && format(r.timestamp.toDate(), 'yyyy-MM-dd') === today);
  const hasCheckedOut = records.some(r => r.type === AttendanceType.CHECK_OUT && r.timestamp && format(r.timestamp.toDate(), 'yyyy-MM-dd') === today);

  const checkInTime = records.find(r => r.type === AttendanceType.CHECK_IN && r.timestamp && format(r.timestamp.toDate(), 'yyyy-MM-dd') === today)?.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--';
  const checkOutTime = records.find(r => r.type === AttendanceType.CHECK_OUT && r.timestamp && format(r.timestamp.toDate(), 'yyyy-MM-dd') === today)?.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--';

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <Navbar 
        user={user} 
        profile={profile} 
        onSignOut={handleSignOut} 
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
      />

      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-orange-500 text-white overflow-hidden"
          >
            <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
              <WifiOff className="w-4 h-4" />
              Anda sedang offline. Absen akan disimpan lokal & sinkron otomatis saat online.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {isAdminMode ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-2 mb-8">
                <div className="p-2 bg-zinc-900 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h2>
                  <p className="text-sm text-zinc-500">Monitor dan kelola kehadiran tim</p>
                </div>
              </div>
              <AdminDashboard 
                records={allRecords} 
                users={allUsers} 
                onUpdateStatus={updateRecordStatus}
                onUpdateRole={updateUserRole}
              />
            </motion.div>
          ) : (
            <motion.div
              key="user"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Status Card */}
              <div className="bg-blue-600 rounded-3xl p-6 text-white mb-8 shadow-lg shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-blue-100 text-sm font-medium mb-1">
                    {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
                  </p>
                  <h2 className="text-2xl font-bold mb-4">Selamat Datang, {user.displayName?.split(' ')[0]}!</h2>
                  
                  <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1">
                      <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Check In</p>
                      <p className="font-mono text-lg font-bold">
                        {checkInTime}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1">
                      <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Check Out</p>
                      <p className="font-mono text-lg font-bold">
                        {checkOutTime}
                      </p>
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10" />
              </div>

              {/* Action Area */}
              <section className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-zinc-900 font-bold text-lg">Kehadiran Hari Ini</h3>
                  {hasCheckedIn && hasCheckedOut && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                      <ShieldCheck className="w-3 h-3" /> Selesai
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    disabled={hasCheckedIn || isSubmitting}
                    onClick={() => startCamera(AttendanceType.CHECK_IN)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all active:scale-95",
                      hasCheckedIn 
                        ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed" 
                        : "bg-white border-zinc-100 hover:border-blue-400 text-zinc-900 shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-2xl",
                      hasCheckedIn ? "bg-zinc-200" : "bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform"
                    )}>
                      <LogIn className="w-6 h-6" />
                    </div>
                    <span className="font-bold">Check In</span>
                    {hasCheckedIn && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-green-500" />}
                  </button>

                  <button 
                    disabled={!hasCheckedIn || hasCheckedOut || isSubmitting}
                    onClick={() => startCamera(AttendanceType.CHECK_OUT)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all active:scale-95",
                      !hasCheckedIn || hasCheckedOut
                        ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed" 
                        : "bg-white border-zinc-100 hover:border-orange-400 text-zinc-900 shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-2xl",
                      !hasCheckedIn || hasCheckedOut ? "bg-zinc-200" : "bg-orange-50 text-orange-600 group-hover:scale-110 transition-transform"
                    )}>
                      <LogOut className="w-6 h-6" />
                    </div>
                    <span className="font-bold">Check Out</span>
                    {hasCheckedOut && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-green-500" />}
                  </button>
                </div>
              </section>

              {/* History Section */}
              <section className="mt-12">
                <div className="flex items-center gap-2 mb-6">
                  <History className="w-5 h-5 text-zinc-400" />
                  <h3 className="text-zinc-900 font-bold text-lg">Riwayat Terakhir</h3>
                </div>

                <div className="space-y-3">
                  {records.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-zinc-200">
                      <CalendarIcon className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                      <p className="text-zinc-400">Belum ada riwayat absen.</p>
                    </div>
                  ) : (
                    records.map((record) => (
                      <div 
                        key={record.id}
                        className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between group hover:shadow-md hover:shadow-zinc-200/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            record.type === AttendanceType.CHECK_IN ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {record.type === AttendanceType.CHECK_IN ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 capitalize">{record.type.replace('-', ' ')}</h4>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {record.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Proses...'}</span>
                              <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                              <span>{record.timestamp ? format(record.timestamp.toDate(), 'd MMM yyyy') : '...'}</span>
                              {(record as any)._pending && (
                                <>
                                  <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                                  <span className="flex items-center gap-0.5 text-blue-500 font-medium">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Sinkron...
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                            record.status === AttendanceStatus.APPROVED ? "bg-green-50 text-green-600" : 
                            record.status === AttendanceStatus.REJECTED ? "bg-red-50 text-red-600" : 
                            "bg-zinc-50 text-zinc-500"
                          )}>
                            {record.status === AttendanceStatus.APPROVED && <ShieldCheck className="w-3 h-3" />}
                            {record.status}
                          </div>
                          <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Camera Modal Overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="p-4 flex items-center justify-between text-white">
              <button 
                onClick={() => {
                  if (videoRef.current?.srcObject) {
                    (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                  }
                  setShowCamera(false);
                  setCurrentAttendanceType(null);
                }} 
                className="p-2 bg-white/10 rounded-full"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <h3 className="font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Verifikasi {currentAttendanceType?.replace('-', ' ')}
              </h3>
              <div className="w-10" />
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover mirror"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Guides */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-72 h-96 border-4 border-white/20 border-dashed rounded-[60px] relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-full blur-xl" />
                </div>
              </div>
            </div>

            <div className="p-8 bg-zinc-950 flex flex-col items-center gap-6">
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-xl border border-red-500/20 animate-pulse">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button 
                onClick={captureAndSubmit}
                disabled={isSubmitting}
                className={cn(
                  "group relative w-full max-w-xs flex items-center justify-center gap-3 bg-white text-zinc-900 py-5 rounded-[2rem] font-bold transition-all active:scale-95 shadow-2xl shadow-white/5",
                  isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    Ambil Foto & Kirim
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <MapPin className={cn("w-4 h-4 transition-colors", location ? "text-blue-500" : "text-zinc-800")} />
                  GPS {location ? "Aktif" : "Mencari..."}
                </div>
                <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                <div>Wajah Terdeteksi</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
