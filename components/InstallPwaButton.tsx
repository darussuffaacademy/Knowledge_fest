import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, MoreVertical, Share2, PlusSquare, Sparkles } from 'lucide-react';

interface InstallPwaButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'sidebar';
  isCollapsed?: boolean;
}

const InstallPwaButton: React.FC<InstallPwaButtonProps> = ({ 
  className = '', 
  variant = 'header',
  isCollapsed = false 
}) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detect if currently running in standalone / installed PWA mode
    const checkIsInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      if (isStandalone || localStorage.getItem('amazio_pwa_installed') === 'true') {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkIsInstalled()) {
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleInstallable = () => {
      setCanInstall(true);
    };

    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      localStorage.setItem('amazio_pwa_installed', 'true');
      (window as any).deferredPrompt = null;
      setShowModal(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('amazio_pwa_installed', 'true');
        }
        (window as any).deferredPrompt = null;
        setCanInstall(false);
        return;
      } catch (e) {
        console.error('Install prompt error:', e);
      }
    }

    // Fallback: Show guided modal for mobile browsers & Safari
    setShowModal(true);
  };

  // If already installed, hide the button completely!
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {variant === 'hero' ? (
        <button
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#C21D2E] hover:bg-[#A81322] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all duration-300 border border-[#F9B344]/30 ${className}`}
          title="Install Amazio App with icon to your phone or desktop"
        >
          <img src="/icons/pwa-192x192.png" alt="App Icon" className="w-5 h-5 rounded-md shadow-sm" />
          <span>Install App</span>
        </button>
      ) : variant === 'sidebar' ? (
        isCollapsed ? (
          <div className="relative group w-full flex justify-center">
            <button
              onClick={handleInstallClick}
              className={`p-2 rounded-2xl bg-gradient-to-tr from-[#C21D2E]/10 to-[#F9B344]/10 hover:from-[#C21D2E]/20 hover:to-[#F9B344]/20 text-[#C21D2E] dark:text-[#F9B344] border border-[#C21D2E]/20 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center ${className}`}
              title="Install Amazio Web App"
            >
              <img src="/icons/pwa-192x192.png" alt="Install App" className="w-6 h-6 rounded-lg shadow-sm" />
            </button>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-[1000] shadow-2xl">
              Install App
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className={`w-full group flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-[#C21D2E]/10 via-[#F9B344]/10 to-[#C21D2E]/5 hover:from-[#C21D2E]/20 hover:to-[#F9B344]/20 border border-[#C21D2E]/20 dark:border-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${className}`}
            title="Install Amazio App to your phone or computer"
          >
            <div className="relative shrink-0">
              <img src="/icons/pwa-192x192.png" alt="App Icon" className="w-8 h-8 rounded-xl shadow-md border border-[#F9B344]/40 transition-transform group-hover:scale-105" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <Download size={9} strokeWidth={3} />
              </div>
            </div>
            <div className="text-left min-w-0 flex-grow">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#C21D2E] dark:text-[#F9B344] leading-tight truncate">
                Install App
              </p>
              <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5 truncate">
                Add to Home Screen
              </p>
            </div>
            <Sparkles size={14} className="text-[#F9B344] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        )
      ) : (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#C21D2E] text-white hover:bg-[#A81322] shadow-md border border-[#F9B344]/40 active:scale-95 transition-all ${className}`}
          title="Install Amazio Fest App with Home Screen Icon"
        >
          <img src="/icons/pwa-192x192.png" alt="App Icon" className="w-4 h-4 rounded-sm" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {/* Instructional Modal for Mobile Browsers */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#151816] border border-[#C21D2E]/20 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <img
                src="/icons/pwa-192x192.png"
                alt="Amazio Fest 2026 Icon"
                className="w-14 h-14 rounded-2xl shadow-lg border border-[#F9B344]/50"
              />
              <div>
                <h3 className="text-base font-black tracking-tight text-[#C21D2E] dark:text-white">
                  AMAZIO FEST 2026
                </h3>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Install with official crest icon
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                  How to add icon on iPhone / iPad (Safari):
                </p>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                  <Share2 className="text-[#C21D2E] shrink-0 mt-0.5" size={18} />
                  <span>1. Tap the <strong>Share</strong> button at the bottom of Safari.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                  <PlusSquare className="text-[#C21D2E] shrink-0 mt-0.5" size={18} />
                  <span>2. Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                  <Check className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                  <span>3. Tap <strong>Add</strong>. The icon will appear on your home screen!</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                  How to install with icon on Android (Chrome / Brave / Samsung):
                </p>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                  <MoreVertical className="text-[#C21D2E] shrink-0 mt-0.5" size={18} />
                  <span>1. Tap the <strong>three dots (⋮)</strong> menu at the top right of your browser.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                  <Download className="text-[#C21D2E] shrink-0 mt-0.5" size={18} />
                  <span>2. Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                  <Check className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                  <span>3. Confirm <strong>Install</strong>. The full-color crest icon will be pinned to your home screen!</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 rounded-2xl bg-[#C21D2E] text-white font-black text-xs uppercase tracking-widest hover:bg-[#A81322] active:scale-95 transition-all shadow-lg"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPwaButton;
