import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, MoreVertical, Share2, PlusSquare } from 'lucide-react';

interface InstallPwaButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'sidebar';
}

const InstallPwaButton: React.FC<InstallPwaButtonProps> = ({ className = '', variant = 'header' }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleInstallable = () => {
      setCanInstall(true);
    };

    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      (window as any).deferredPrompt = null;
      setShowModal(false);
    });

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        (window as any).deferredPrompt = null;
        setCanInstall(false);
        return;
      } catch (e) {
        console.error('Install prompt error:', e);
      }
    }

    // If native prompt is not yet ready or iOS Safari
    setShowModal(true);
  };

  if (isInstalled) return null;

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
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-[#C21D2E] dark:text-[#F9B344] bg-red-50 dark:bg-white/5 border border-[#C21D2E]/20 hover:bg-red-100 dark:hover:bg-white/10 transition-all ${className}`}
        >
          <img src="/icons/pwa-192x192.png" alt="App Icon" className="w-5 h-5 rounded-md shadow-sm" />
          <span>Install Mobile App</span>
        </button>
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
