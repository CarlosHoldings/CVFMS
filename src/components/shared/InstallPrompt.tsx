import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detect iOS (iPhone/iPad)
    // iOS doesn't support the automatic prompt, so we just detect the platform
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Optional: Show iOS prompt immediately or after a delay
      // setShowPrompt(true); 
    }

    // 2. Handle Android/Desktop "Add to Home Screen" event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can add to home screen
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // We no longer need the prompt. Clear it.
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white p-4 rounded-xl shadow-2xl border-2 border-[#2563EB] z-[100] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Smartphone className="w-6 h-6 text-[#2563EB]" />
            </div>
            <h3 className="font-bold text-gray-900">Install App</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Install the Transport System app for a better experience, offline access, and notifications.
          </p>
          <button 
            onClick={handleInstallClick}
            className="w-full bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Add to Home Screen
          </button>
        </div>
        <button 
          onClick={() => setShowPrompt(false)}
          className="text-gray-400 hover:text-gray-600 p-1 -mr-2 -mt-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}