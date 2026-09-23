import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
    onConfirm,
    onClose,
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
            onClick={() => { if (!isLoading) onClose(); }}
        >
            <div 
                className="bg-white dark:bg-[#121412] w-full max-w-md rounded-3xl sm:rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden transform animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 sm:p-7 flex gap-4 sm:gap-5 items-start">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        isDanger 
                            ? 'bg-rose-500 text-white shadow-rose-500/20' 
                            : 'bg-amber-500 text-white shadow-amber-500/20'
                    }`}>
                        {isDanger ? <Trash2 size={22} strokeWidth={2.5} /> : <AlertTriangle size={22} strokeWidth={2.5} />}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white uppercase font-sans">
                                {title}
                            </h3>
                            {!isLoading && (
                                <button 
                                    onClick={onClose}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="p-5 sm:p-6 bg-zinc-50 dark:bg-white/[0.02] border-t border-zinc-100 dark:border-white/5 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onClose}
                        className="px-5 py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onConfirm}
                        className={`px-6 py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 ${
                            isDanger
                                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                        }`}
                    >
                        {isLoading && <Loader2 size={14} className="animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
