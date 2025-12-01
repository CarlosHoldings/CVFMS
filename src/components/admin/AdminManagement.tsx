import { useState, useEffect } from 'react';
import { Shield, Key, X, Check, Lock, AlertTriangle, Ban, Unlock } from 'lucide-react'; // Removed Trash2

import { TopNav } from '../shared/TopNav';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { db } from '../../firebase';
import type { User } from '../../App'; 
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore'; // Removed deleteDoc



// 🔒 ADMIN MANAGEMENT COMPONENT
// ============================================================================

interface AdminManagementProps {
  user: User;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

export function AdminManagement({ user, onNavigate, onLogout }: AdminManagementProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [globalRegKey, setGlobalRegKey] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  // Removed 'delete' from action types
  const [actionType, setActionType] = useState<'ban' | 'unban' | 'update-reg-key' | null>(null);
  const [newValueInput, setNewValueInput] = useState(''); 
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Initial Fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // A. Fetch Admins from REAL DB
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      // @ts-ignore
      const snapshot = await getDocs(q);
      const adminList = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setAdmins(adminList);

      // B. Fetch Global Registration Key (Stored in 'settings/admin_config')
      const configRef = doc(db, "settings", "admin_config");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setGlobalRegKey(configSnap.data().registrationKey || "Not Set");
      } else {
        setGlobalRegKey("ADMIN2025"); // Default if not set in DB
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setLoading(false);
    }
  };

  // 2. Modal Controls
  const openModal = (type: 'update-reg-key' | 'ban' | 'unban', admin?: any) => {
    setActionType(type);
    setSelectedAdmin(admin || null);
    setNewValueInput('');
    setErrorMsg('');
  };

  const closeModal = () => {
    setActionType(null);
    setSelectedAdmin(null);
  };

  // 3. Execution Logic (No Secret Codes)
  const handleExecute = async () => {
    setErrorMsg('');

    // --- CASE 1: UPDATE GLOBAL ADMIN ACCESS CODE ---
    if (actionType === 'update-reg-key') {
      if (newValueInput.length < 5) {
        setErrorMsg('Code is too short (min 5 chars).');
        return;
      }
      try {
        await setDoc(doc(db, "settings", "admin_config"), { registrationKey: newValueInput }, { merge: true });
        setGlobalRegKey(newValueInput);
        closeModal();
        alert("Admin Access Code Updated Successfully!");
      } catch (e) { 
        console.error(e);
        setErrorMsg("Database Error: Could not update key."); 
      }
    }

    // --- CASE 2: BAN ADMIN ---
    else if (actionType === 'ban') {
      try {
        await updateDoc(doc(db, "users", selectedAdmin.id), { status: 'banned' });
        // Update local state immediately
        setAdmins(prev => prev.map(a => a.id === selectedAdmin.id ? { ...a, status: 'banned' } : a));
        closeModal();
      } catch (e) { 
        console.error(e);
        setErrorMsg("Database Error: Could not ban user."); 
      }
    }

    // --- CASE 3: UNBAN ADMIN ---
    else if (actionType === 'unban') {
        try {
          await updateDoc(doc(db, "users", selectedAdmin.id), { status: 'active' });
          // Update local state immediately
          setAdmins(prev => prev.map(a => a.id === selectedAdmin.id ? { ...a, status: 'active' } : a));
          closeModal();
        } catch (e) { 
          console.error(e);
          setErrorMsg("Database Error: Could not unban user."); 
        }
      }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <TopNav user={user} onNavigate={onNavigate} onLogout={onLogout} currentScreen="admin-management" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => onNavigate('admin-dashboard')} className="mb-4 text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium transition-colors">
            &larr; Back to Dashboard
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Header Card */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Management</h1>
            <p className="text-gray-600">
                Manage system administrators, security clearance, and registration access codes.
            </p>
          </div>

          {/* GLOBAL ACCESS CODE MANAGER */}
          <Card className="p-5 bg-blue-50 border-blue-100 shadow-sm">
            <h3 className="text-sm font-bold text-blue-900 uppercase mb-3 flex items-center gap-2">
              <Key className="w-4 h-4"/> Admin Access Code
            </h3>
            
            {/* Display current key in a visible box */}
            <div className="relative group">
                <div className="text-2xl font-mono text-blue-700 bg-white p-3 rounded-lg mb-4 text-center border border-blue-200 shadow-inner tracking-widest">
                {globalRegKey}
                </div>
            </div>

            <button 
              onClick={() => openModal('update-reg-key')}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Key className="w-4 h-4" /> Change Access Code
            </button>
            <p className="text-xs text-blue-500 mt-3 text-center">
                This code is required for new admin registration.
            </p>
          </Card>
        </div>

        {/* ADMIN LIST */}
        <Card className="p-0 overflow-hidden shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <h2 className="font-semibold text-gray-900 text-lg">System Administrators</h2>
            <Badge status="info" label={`${admins.length} Active`} size="sm" />
          </div>

          {loading ? <div className="p-12 text-center text-gray-500">Loading admin roster...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {admins.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-gray-500">No admins found.</td></tr>
                  ) : admins.map((admin) => (
                    <tr key={admin.id} className={`transition-colors hover:bg-gray-50 ${admin.status === 'banned' ? 'bg-red-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${admin.status === 'banned' ? 'bg-red-200 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{admin.name || 'Unnamed Admin'}</div>
                                <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {admin.status === 'banned' ? (
                          <Badge status="banned" label="Banned" />
                        ) : (
                          <Badge status="active" label="Active" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                            {/* Identifier for current user */}
                            {admin.email === user?.email && (
                                <span className="text-xs font-bold text-gray-400 mr-2 bg-gray-100 px-2 py-1 rounded border border-gray-200">You</span>
                            )}

                            {/* BAN/UNBAN BUTTON */}
                            {admin.email !== user?.email && (
                                <>
                                    {admin.status !== 'banned' ? (
                                        <button 
                                            onClick={() => openModal('ban', admin)}
                                            className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors"
                                            title="Ban Admin"
                                        >
                                            <Ban className="w-4 h-4" /> Ban
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => openModal('unban', admin)}
                                            className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors"
                                            title="Unban Admin"
                                        >
                                            <Unlock className="w-4 h-4" /> Unban
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* CONFIRMATION ACTION MODAL (No Secret Code Required) */}
      {actionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100 scale-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">
                    {actionType === 'update-reg-key' ? 'Update Access Code' : 
                    actionType === 'ban' ? 'Ban Administrator' :
                    'Unban Administrator'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                    {actionType === 'update-reg-key' 
                        ? "Update the master key for new registrations." 
                        : `Action target: ${selectedAdmin?.name || selectedAdmin?.email || 'this admin'}`}
                    </p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>

            {/* Input for New Key */}
            {actionType === 'update-reg-key' && (
              <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Access Code</label>
                  <input 
                    type="text" 
                    value={newValueInput} 
                    onChange={(e) => setNewValueInput(e.target.value)}
                    className="w-full p-3 border-2 border-blue-100 rounded-lg font-mono text-center tracking-widest text-lg focus:border-blue-500 focus:outline-none"
                    placeholder="ENTER-NEW-CODE"
                    autoFocus
                  />
              </div>
            )}
            
            {errorMsg && (
                <p className="text-red-600 text-sm mb-4 flex items-center gap-2 bg-red-50 p-2 rounded border border-red-100">
                    <AlertTriangle className="w-4 h-4"/> {errorMsg}
                </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">Cancel</button>
              <button 
                onClick={handleExecute} 
                className={`flex-1 py-2.5 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2 ${
                    actionType === 'ban' ? 'bg-orange-600 hover:bg-orange-700' :
                    actionType === 'unban' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                  <Check className="w-4 h-4" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}