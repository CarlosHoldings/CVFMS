import { useState, useEffect } from 'react';
import { Car, Calendar, CheckCircle, XCircle, Navigation, Users, AlertCircle, Shield, Lock, X } from 'lucide-react';
import { User } from '../../App';
import { TopNav } from '../shared/TopNav';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// 🔒 HIDDEN CODE TO ENTER THE ADMIN PANEL
const PANEL_ACCESS_CODE = "OPEN_2025"; 

interface AdminDashboardProps {
  user: User;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

export function AdminDashboard({ user, onNavigate, onLogout }: AdminDashboardProps) {
  // 1. Data State
  const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeVehicles: 0,
    completedTrips: 0,
    cancellations: 0
  });
  const [loading, setLoading] = useState(true);

  // 2. Security Modal State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [securityError, setSecurityError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vehiclesSnapshot = await getDocs(collection(db, "vehicles"));
        const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLiveVehicles(vehicles);

        const requestsSnapshot = await getDocs(collection(db, "trip_requests"));
        const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const pending = requests.filter((req: any) => req.status === 'pending');
        setPendingRequests(pending);

        const activeVehiclesCount = vehicles.filter((v: any) => v.status === 'in-use').length;
        const completedTripsCount = requests.filter((r: any) => r.status === 'completed').length;
        const cancelledTripsCount = requests.filter((r: any) => r.status === 'cancelled').length;
        
        setStats({
          totalTrips: requests.length,
          activeVehicles: activeVehiclesCount,
          completedTrips: completedTripsCount,
          cancellations: cancelledTripsCount
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 3. Handle Security Verification
  const handleAdminPanelAccess = () => {
    if (securityCode === PANEL_ACCESS_CODE) {
      setShowSecurityModal(false);
      setSecurityCode(""); // Clear code
      setSecurityError("");
      onNavigate('admin-management'); // Navigate only if code is correct
    } else {
      setSecurityError("❌ Access Denied: Invalid Code");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-gray-500">Loading Dashboard Data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <TopNav user={user} onNavigate={onNavigate} onLogout={onLogout} currentScreen="admin-dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and manage the entire transport system</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#2563EB]" />
              </div>
              <div>
                <div className="text-2xl text-gray-900">{stats.totalTrips}</div>
                <div className="text-sm text-gray-500">Total Trips</div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl text-gray-900">{stats.activeVehicles}</div>
                <div className="text-sm text-gray-500">Active Vehicles</div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl text-gray-900">{stats.completedTrips}</div>
                <div className="text-sm text-gray-500">Completed Trips</div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl text-gray-900">{stats.cancellations}</div>
                <div className="text-sm text-gray-500">Cancellations</div>
              </div>
            </div>
          </Card>
        </div>

        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg text-gray-900 mb-2">Pending Trip Approvals</h3>
                  <p className="text-gray-600 mb-4">
                    You have {pendingRequests.length} trip requests waiting for approval
                  </p>
                  <button onClick={() => onNavigate('trip-approval')} className="px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all">
                    Review Requests
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl text-gray-900 mb-4">Live Vehicle Tracking</h2>
              <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="text-center z-10">
                  <Navigation className="w-16 h-16 text-[#2563EB] mx-auto mb-3" />
                  <p className="text-gray-500">Real-time Vehicle Locations</p>
                </div>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {liveVehicles.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No vehicles found in database.</p>
                ) : (
                  liveVehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <Car className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-900">{vehicle.number || 'Unknown Number'}</div>
                          <div className="text-sm text-gray-500">{vehicle.location || 'No Location'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-600">{vehicle.driverName || 'Unassigned'}</div>
                        <Badge status={vehicle.status || 'available'} size="sm" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            
            {/* 🔒 SECURE ADMIN MANAGEMENT CARD */}
            {/* When clicked, it now opens the security modal instead of navigating directly */}
            <Card 
              onClick={() => setShowSecurityModal(true)} 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-red-500"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-gray-900 font-medium">Admin Management</div>
                  <div className="text-sm text-gray-500">Restricted Access</div>
                </div>
              </div>
            </Card>

            <Card onClick={() => onNavigate('trip-approval')} className="p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-gray-900">Trip Approval</div>
                  <div className="text-sm text-gray-500">{pendingRequests.length} pending</div>
                </div>
              </div>
            </Card>

            <Card onClick={() => onNavigate('vehicle-management')} className="p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-gray-900">Vehicle Management</div>
                  <div className="text-sm text-gray-500">Manage fleet</div>
                </div>
              </div>
            </Card>

            <Card onClick={() => onNavigate('driver-management')} className="p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-gray-900">Driver Management</div>
                  <div className="text-sm text-gray-500">Assign drivers</div>
                </div>
              </div>
            </Card>

            <Card onClick={() => onNavigate('user-management')} className="p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <div className="text-gray-900">User Management</div>
                  <div className="text-sm text-gray-500">Search users</div>
                </div>
              </div>
            </Card>

            <Card onClick={() => onNavigate('reports')} className="p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <div className="text-gray-900">Reports</div>
                  <div className="text-sm text-gray-500">Generate reports</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 🔒 SECURITY ENTRY MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" /> Security Check
              </h3>
              <button onClick={() => setShowSecurityModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <p className="text-gray-500 mb-4 text-sm">
              This area is restricted to Super Admins. Please enter the master dashboard code to proceed.
            </p>

            <input
              type="password"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminPanelAccess()}
              className="w-full p-3 border-2 border-gray-200 rounded-xl mb-2 focus:border-red-500 focus:outline-none text-center font-mono text-lg tracking-widest"
              placeholder="••••••••"
              autoFocus
            />
            
            {securityError && <div className="text-red-600 text-sm font-medium mb-4 text-center">{securityError}</div>}

            <button 
              onClick={handleAdminPanelAccess}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-all"
            >
              Verify & Enter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}