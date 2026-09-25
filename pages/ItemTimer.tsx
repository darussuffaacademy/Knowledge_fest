
import React, { useState, useMemo } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { useTimer } from '../store/TimerContext';
import { PerformanceType } from '../types';
import { 
    Play, Pause, RotateCcw, Search, ChevronRight, 
    ArrowRightLeft, Clock, AlertTriangle, 
    Volume2, VolumeX, Bell, Layers, X, Mic2, Monitor, PlayCircle, History, Command
} from 'lucide-react';

const formatTime = (totalSeconds: number) => {
    const isNegative = totalSeconds < 0;
    const absSeconds = Math.abs(totalSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    return `${isNegative ? '-' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const CATEGORY_COLORS = ['#006994', '#d4a574', '#1b5e20', '#80deea'];

const getCategoryHex = (categoryId: string) => {
    if (!categoryId) return '#6366f1'; 
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
        hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
};

const ItemTimerPage: React.FC = () => {
    const { state, globalSearchTerm, globalFilters } = useFirebase();
    const { 
        activeItem, timeLeft, isRunning, isMuted, initialDuration,
        startTimer, togglePause, resetTimer, clearTimer, toggleMute, triggerManualBell
    } = useTimer();
    
    const filteredItems = useMemo(() => {
        if (!state) return { onStage: [], offStage: [] };
        const catFilter = globalFilters?.categoryId || [];
        const perfFilter = globalFilters?.performanceType || [];
        const q = (globalSearchTerm || '').toLowerCase();
        let items = (state.items || []).filter(item => {
            const matchesSearch = q ? item.name.toLowerCase().includes(q) : true;
            const matchesCat = catFilter.length > 0 ? catFilter.includes(item.categoryId) : true;
            const matchesPerf = perfFilter.length > 0 ? perfFilter.includes(item.performanceType) : true;
            return matchesSearch && matchesCat && matchesPerf;
        });
        items.sort((a,b) => a.name.localeCompare(b.name));
        return {
            onStage: items.filter(i => i.performanceType === PerformanceType.ON_STAGE),
            offStage: items.filter(i => i.performanceType === PerformanceType.OFF_STAGE)
        };
    }, [state, globalSearchTerm, globalFilters]);

    const progress = initialDuration > 0 ? (timeLeft / initialDuration) * 100 : 0;
    const timePassed = initialDuration - timeLeft;
    const isWarning = timeLeft <= 60 && timeLeft > 0;
    const isEnded = timeLeft <= 0;
    const isOvertimeCritical = timeLeft <= -60;
    const activeCategoryHex = activeItem ? getCategoryHex(activeItem.categoryId) : '#6366f1';

    if (!state) return null;

    if (!activeItem) {
        return (
            <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pb-24">
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <Command size={20} />
                        </div>
                        <h2 className="text-3xl font-black font-serif uppercase tracking-tighter text-amazio-primary dark:text-white">Timer Control Deck</h2>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium italic">Initialize stage clock for a registered discipline.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {[
                        { label: 'On Stage Registry', items: filteredItems.onStage, icon: Mic2, color: 'bg-indigo-500' },
                        { label: 'Off Stage Registry', items: filteredItems.offStage, icon: Monitor, color: 'bg-zinc-500' }
                    ].map((section) => {
                        if (section.items.length === 0) return null;
                        return (
                            <div key={section.label} className="space-y-5">
                                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
                                    <div className="flex items-center gap-3">
                                        <section.icon size={16} className="text-zinc-400" />
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{section.label}</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-300 uppercase">{section.items.length} Entries</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(section.items || []).map(item => {
                                        const catHex = getCategoryHex(item.categoryId);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => startTimer(item)}
                                                className="group relative flex flex-col p-5 bg-white dark:bg-zinc-900/40 rounded-[2rem] border-2 border-zinc-50 dark:border-white/5 hover:border-indigo-500/30 transition-all text-left shadow-sm hover:shadow-xl hover:-translate-y-1"
                                            >
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PlayCircle size={20} className="text-indigo-500" />
                                                </div>
                                                <div className="mb-3">
                                                    <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border" style={{ backgroundColor: `${catHex}10`, color: catHex, borderColor: `${catHex}30` }}>
                                                        {state.categories.find(c => c.id === item.categoryId)?.name}
                                                    </span>
                                                </div>
                                                <h4 className="font-black text-zinc-800 dark:text-zinc-100 text-sm sm:text-base uppercase tracking-tight leading-tight mb-2 line-clamp-2">
                                                    {item.name}
                                                </h4>
                                                <div className="mt-auto pt-3 border-t border-zinc-50 dark:border-white/5 flex items-center gap-2">
                                                    <Clock size={10} className="text-zinc-400" />
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.duration} MINS</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col transition-all duration-700 bg-[#030403] text-white relative overflow-hidden">
            {/* Ambient Lighting Overlay */}
            <div 
                className="absolute inset-0 transition-all duration-1000 opacity-[0.08]" 
                style={{ background: `radial-gradient(circle at center, ${activeCategoryHex} 0%, transparent 70%)` }}
            ></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none"></div>

            {/* Top Toolbar */}
            <div className="relative z-10 px-6 py-5 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => { if(!isRunning || confirm("This will stop the current clock. Switch event?")) clearTimer(); }}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all group"
                    >
                        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ArrowRightLeft size={16} strokeWidth={3} />
                        </div>
                        <span className="font-black uppercase text-[10px] tracking-[0.2em] hidden sm:inline">Switch Deck</span>
                    </button>
                    <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                    <div className="hidden sm:flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-rose-500'}`}></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{isRunning ? 'Running' : 'Paused'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleMute}
                        className={`p-2.5 rounded-xl transition-all border-2 ${isMuted ? 'bg-rose-600/20 text-rose-500 border-rose-500/20' : 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={18} strokeWidth={2.5} /> : <Volume2 size={18} strokeWidth={2.5} />}
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-1"></div>
                    <button 
                        onClick={clearTimer}
                        className="p-2.5 rounded-xl bg-rose-600 text-white shadow-lg active:scale-95 transition-all"
                        title="Close Timer"
                    >
                        <X size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Cinematic Main Display */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center relative z-10">
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div 
                        className="inline-block px-6 py-2 rounded-full text-[11px] md:text-xs font-black uppercase tracking-[0.4em] border-2 mb-6 backdrop-blur-md"
                        style={{ backgroundColor: `${activeCategoryHex}10`, color: activeCategoryHex, borderColor: `${activeCategoryHex}30` }}
                    >
                        {state.categories.find(c => c.id === activeItem?.categoryId)?.name}
                    </div>
                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-black font-serif text-white leading-none tracking-tighter uppercase max-w-5xl px-4 drop-shadow-2xl">
                        {activeItem?.name}
                    </h1>
                </div>

                <div className="relative flex flex-col items-center group">
                    {/* Visual Progress Ring Backdrop */}
                    <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] md:w-[60vh] md:h-[60vh] -rotate-90 opacity-20 transition-all duration-1000">
                        <circle
                            cx="50%" cy="50%" r="48%"
                            stroke="currentColor" strokeWidth="1" fill="transparent"
                            className="text-white/10"
                        />
                        <circle
                            cx="50%" cy="50%" r="48%"
                            stroke="currentColor" strokeWidth="4" fill="transparent"
                            strokeDasharray="301.59"
                            strokeDashoffset={301.59 - (progress / 100 * 301.59)}
                            strokeLinecap="round"
                            className={`transition-all duration-1000 ${isOvertimeCritical ? 'text-rose-600' : isEnded ? 'text-amber-500' : 'text-emerald-500'}`}
                            style={{ strokeDasharray: 'calc(48% * 2 * 3.14159)' }}
                        />
                    </svg>

                    <div className="flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center mb-[-2vh]">
                            <span className="text-zinc-500 text-[2vh] lg:text-[3vh] font-black uppercase tracking-[0.4em] drop-shadow-md">
                                Elapsed: {formatTime(timePassed)}
                            </span>
                        </div>
                        <div 
                            className={`text-[8rem] sm:text-[14rem] md:text-[20rem] font-black font-mono leading-none tracking-tighter transition-all duration-700 tabular-nums drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isOvertimeCritical ? 'text-rose-600' : isEnded ? 'text-amber-500' : 'text-white'}`}
                        >
                            {formatTime(timeLeft)}
                        </div>
                        <div className="flex flex-col items-center mt-[-2vh]">
                            <span className="text-zinc-500 text-[1.5vh] lg:text-[2vh] font-black uppercase tracking-[0.2em] opacity-60">Time Left</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center gap-1">
                        {isOvertimeCritical ? (
                            <span className="text-rose-600 text-[10px] md:text-sm font-black uppercase tracking-[0.5em] animate-pulse">Critical Overtime</span>
                        ) : isEnded ? (
                            <span className="text-amber-600 text-[10px] md:text-sm font-black uppercase tracking-[0.5em] animate-pulse">Time Expired</span>
                        ) : isWarning ? (
                            <span className="text-amber-500 text-[10px] md:text-sm font-black uppercase tracking-[0.5em] animate-pulse">Final Minute</span>
                        ) : isRunning ? (
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Live Countdown</span>
                        ) : (
                            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Ready to start</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tactile Control Console */}
            <div className="relative z-10 bg-black/60 backdrop-blur-3xl border-t border-white/5 pb-12 pt-8 px-6">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                    
                    {/* Bell Station */}
                    <div className="flex gap-3 p-1.5 bg-white/5 rounded-[1.5rem] border border-white/10">
                        {[
                            { count: 1, label: 'Warning', icon: Bell, color: 'text-amber-400' },
                            { count: 2, label: 'Final', icon: Bell, color: 'text-amber-600' },
                            { count: 4, label: 'Critical', icon: AlertTriangle, color: 'text-rose-600' }
                        ].map(bell => (
                            <button 
                                key={bell.count}
                                onClick={() => triggerManualBell(bell.count)}
                                className={`group px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-2.5 hover:bg-white/10 ${bell.color}`}
                            >
                                <bell.icon size={14} fill="currentColor" className="group-hover:scale-125 transition-transform" />
                                {bell.label}
                            </button>
                        ))}
                    </div>

                    {/* Master Actions */}
                    <div className="flex justify-center items-center gap-10 md:gap-16">
                        <button 
                            onClick={resetTimer} 
                            className="p-5 md:p-6 rounded-full bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all active:scale-90 border border-white/5 shadow-xl"
                            title="Reset Timer"
                        >
                            <History size={24} md:size={32} strokeWidth={2.5} />
                        </button>
                        
                        <button 
                            onClick={togglePause}
                            className={`w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform transition-all active:scale-95 flex items-center justify-center border-4 border-white/10 ${isRunning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white shadow-emerald-500/20'}`}
                        >
                            {isRunning ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-2" />}
                        </button>

                        <button 
                            onClick={clearTimer} 
                            className="p-5 md:p-6 rounded-full bg-white/5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 border border-white/5 shadow-xl"
                            title="Abort Process"
                        >
                            <RotateCcw size={24} md:size={32} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default ItemTimerPage;
