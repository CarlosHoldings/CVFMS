import { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
// Firebase Imports
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../firebase';

interface UserRegistrationProps {
  onBack: () => void;
  onRegister: () => void;
}

export function UserRegistration({ onBack, onRegister }: UserRegistrationProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper: Timeout function to prevent hanging forever
  const withTimeout = <T,>(promise: Promise<T>, ms: number) => {
    const timeout = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout: Database is slow.")), ms)
    );
    return Promise.race([promise, timeout]);
  };

  const saveUserProfile = async (user: any, isGoogle = false) => {
    const userData = {
      uid: user.uid,
      email: user.email,
      name: formData.fullName || user.displayName || 'User',
      phone: formData.phone || '',
      role: "user",
      authProvider: isGoogle ? 'google' : 'email',
      createdAt: new Date().toISOString()
    };

    try {
        // Try to save to DB with a 5-second timeout
        await withTimeout(
            setDoc(doc(db, "users", user.uid), userData, { merge: true }),
            5000
        );
    } catch (err) {
        console.warn("Profile save timed out or failed (likely offline). Continuing anyway...");
    }
  };

  // 1. Handle Email/Password Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Step 2: Save DB
      await saveUserProfile(userCredential.user, false);

      alert('Registration successful! Please Log In.');
      onRegister();

    } catch (err: any) {
      console.error("Registration Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please Log In.');
      } else {
        setError('Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Google Registration
  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveUserProfile(result.user, true);

      alert('Google Registration successful!');
      onRegister();
    } catch (err: any) {
      console.error(err);
      setError('Google sign-up failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <div className="text-xl text-gray-900">User Registration</div>
            <div className="text-xs text-gray-500">Create your account</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all mb-6 disabled:opacity-50"
            >
              <span className="text-gray-700">Sign up with Google</span>
            </button>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500">Or register with email</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="John Doe" className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl" />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@example.com" className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl" />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Phone Number (Full width since EPF is gone) */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+94 77 123 4567" className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl" />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-xl" />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Eye className="w-5 h-5" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-xl" />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Eye className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 bg-[#2563EB] text-white rounded-xl hover:bg-[#1E40AF] transition-all disabled:opacity-50">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">Already have an account? </span>
              <button onClick={onBack} className="text-sm text-[#2563EB] hover:text-[#1E40AF]">Sign In</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}