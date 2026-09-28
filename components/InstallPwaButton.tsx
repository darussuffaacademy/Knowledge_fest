import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';

interface InstallPwaButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'sidebar';
}

const InstallPwaButton: React.FC<InstallPwaButtonProps> = ({ className = '', variant = 'header' }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleInstallable = () => {
      setCanInstall(true);
    };

    // If deferredPrompt is already set on window
    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      (window as any).deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      (window as any).deferredPrompt = null;
      setCanInstall(false);
    } else {
      // Show guidance for browsers that don't emit beforeinstallprompt (e.g. Safari iOS)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert('To install on iPhone/iPad: Tap the Share button at the bottom of Safari, then tap "Add to Home Screen".');
      } else {
        alert('To install: Tap the browser menu (⋮ in Chrome) and select "Install App" or "Add to Home Screen".');
      }
    }
  };

  if (isInstalled) return null;

  if (variant === 'hero') {
    return (
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all duration-300 ${className}`}
        title="Install Amazio App to your phone or desktop"
      >
        <Smartphone size={16} />
        <span>Install App</span>
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleInstallClick}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all ${className}`}
      >
        <Download size={16} />
        <span>Install Mobile App</span>
      </button>
    );
  }

  // Header variant
  return (
    <button
      onClick={handleInstallClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 shadow-md active:scale-95 transition-all ${className}`}
      title="Install Amazio Fest App on your device"
    >
      <Download size={13} strokeWidth={2.5} />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
};

export default InstallPwaButton;
