import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

import { createUserWithEmailAndPassword, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore'; 
import { auth, db, googleProvider } from '../../firebase'; 

interface AdminRegistrationProps {
  onBack: () => void;
  onRegister: () => void;
}

export function AdminRegistration({ onBack, onRegister }: AdminRegistrationProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    adminCode: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemAdminCode, setSystemAdminCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);

  // 0. Fetch the Real Admin Code from Firestore
  useEffect(() => {
    const fetchAdminCode = async () => {
      try {
        const docRef = doc(db, "settings", "admin_config");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().registrationKey) {
          setSystemAdminCode(docSnap.data().registrationKey);
        } else {
          setSystemAdminCode('ADMIN2025'); 
        }
      } catch (err) {
        console.error("Failed to fetch admin config:", err);
        setSystemAdminCode('ADMIN2025'); 
      } finally {
        setLoadingCode(false);
      }
    };
    fetchAdminCode();
  }, []);

  // --- SMART HANDLER: Register OR Restore ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loadingCode) return;

    // Validation
    if (formData.adminCode !== systemAdminCode) {
      setError('Invalid Admin Access Code.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // 1. Attempt to Create New Account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // 2. New Account Created? Setup DB
      await setupAdminProfile(userCredential.user);
      
      alert('Admin registration successful!');
      onRegister();

    } catch (err: any) {
      // 3. HANDLE "EMAIL EXISTS" ERROR (The Magic Fix)
      if (err.code === 'auth/email-already-in-use') {
        console.log("Email exists. Attempting to log in and restore...");
        try {
            // A. Try to log in with the given password
            const loginCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            
            // B. If login works, check if they are banned
            const userDoc = await getDoc(doc(db, "users", loginCredential.user.uid));
            if (userDoc.exists() && userDoc.data().status === 'banned') {
                await signOut(auth);
                setError("This account exists but has been BANNED.");
                setLoading(false);
                return;
            }

            // C. If active or missing, RESTORE the profile
            await setupAdminProfile(loginCredential.user, true); // True = isRestore
            
            alert('Existing account found. Profile restored successfully!');
            onRegister();
            return;

        } catch (loginErr) {
            // If password was wrong
            console.error(loginErr);
            setError("This email is already registered, but the password was incorrect. Please Log In.");
        }
      } else {
        console.error(err);
        setError('Failed to register. ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to Create/Restore DB Record
  const setupAdminProfile = async (user: any, isRestore = false) => {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'admin',
        status: 'active', // Ensure they are active
        createdAt: isRestore ? undefined : new Date().toISOString(), // Keep original date if possible (though we can't read it if doc is gone)
        restoredAt: isRestore ? new Date().toISOString() : undefined
      }, { merge: true });
  };

  const handleGoogleRegister = async () => {
    setError('');
    if (loadingCode) return;

    if (formData.adminCode !== systemAdminCode) {
      setError('Please enter the correct Admin Access Code above before connecting with Gmail.');
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check Banned Status
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (userDoc.exists() && userDoc.data().status === 'banned') {
          await signOut(auth);
          setError("ACCESS DENIED: This account has been banned.");
          setLoading(false);
          return;
      }

      // Create/Restore Profile
      await setupAdminProfile(result.user, true);

      onRegister();
    } catch (err: any) {
      console.error(err);
      setError('Google registration failed. ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <div className="text-xl text-gray-900">Admin Registration</div>
            <div className="text-xs text-gray-500">Restricted access</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-[#2563EB] rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-xl text-gray-900 mb-2">Administrator Access</h2>
              <p className="text-sm text-gray-600">Only authorized personnel can register</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-left">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Admin Access Code *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.adminCode}
                    onChange={(e) => setFormData({ ...formData, adminCode: e.target.value })}
                    placeholder={loadingCode ? "Verifying..." : "Enter admin code"}
                    disabled={loadingCode}
                    className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Email Address *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || loadingCode}
                className="w-full py-3 bg-[#2563EB] text-white rounded-xl hover:bg-[#1E40AF] transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Register / Restore'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading || loadingCode}
              className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.16-3.16C17.45 1.18 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Register with Gmail
            </button>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">Go back to </span>
              <button onClick={onBack} className="text-sm text-[#2563EB] hover:text-[#1E40AF]">Sign In</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}