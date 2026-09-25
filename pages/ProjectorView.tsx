
import { 
    ArrowLeft, Award, Crown, Maximize, Minimize, Trophy, Star, 
    ShieldCheck, Activity, Users, ClipboardList, Calendar, Clock, 
    ChevronRight, Play, Pause, Layers, Zap, 
    MapPin, TrendingUp, Timer, Presentation, Info,
    Hash, BarChart2, CheckCircle2, ChevronUp, ChevronLeft,
    Monitor, Radio, User, Upload, Video, Tv, RefreshCw,
    X, Volume2, VolumeX, Repeat, FileVideo, FileImage, Sparkles, Film
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { TABS } from '../constants';
import { useFirebase } from '../hooks/useFirebase';
import { ItemType, ResultStatus, PerformanceType } from '../types';

interface ProjectorViewProps {
    onNavigate: (tab: string) => void;
}

// --- Cinematic Constants ---
const SPEEDS = [
    { label: 'Fluid', value: 8000 },
    { label: 'Standard', value: 14000 },
    { label: 'Cinematic', value: 25000 }
];

const REVEAL_DELAY = 1000; 
const BASELINE_SURGE_DURATION = 1500; // Duration for the 0 -> Baseline climb
const RACE_STEP_DURATION = 2000;      // Duration for each subsequent item in the relay

type SlideType = string;

// --- Shared Components ---

const CountUp: React.FC<{ start?: number; end: number; duration?: number; onFinish?: () => void }> = ({ start = 0, end, duration = 2000, onFinish }) => {
    const [count, setCount] = useState(start);
    const finishedRef = useRef(false);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Dynamic easing: more "race-like" surging feel
            const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
            const current = Math.floor(start + (easeOutQuint(progress) * (end - start)));
            setCount(current);
            
            if (progress < 1) {
                animationFrame = window.requestAnimationFrame(step);
            } else if (!finishedRef.current) {
                finishedRef.current = true;
                if (onFinish) onFinish();
            }
        };
        animationFrame = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrame);
    }, [start, end, duration, onFinish]);
    return <>{count.toLocaleString()}</>;
};

// --- Slide Components ---

const ResultSlide: React.FC<{ result: any; revealStep: number }> = ({ result, revealStep }) => {
    const winners = result?.winners || [];
    const rank3 = winners.find((w: any) => w.position === 3);
    const rank2 = winners.find((w: any) => w.position === 2);
    const rank1 = winners.find((w: any) => w.position === 1);

    const PodiumCard = ({ rank, winner, isVisible, isChampion }: any) => {
        if (!isVisible || !winner) return <div className="hidden lg:block w-full h-1"></div>;
        
        const config = {
            1: { 
                cardBg: 'bg-gradient-to-b from-[#422006] via-[#2D1B0A] to-black border-[#EAB308]',
                badgeBg: 'bg-[#EAB308] text-black',
                icon: <Crown className="w-[10vh] h-[10vh] text-[#EAB308] animate-bounce-slow" fill="currentColor"/>,
                label: 'CHAMPION',
                glow: 'shadow-[0_0_80px_rgba(234,179,8,0.25)]',
                textColor: 'text-[#FEF08A]',
                numberColor: '#EAB308' 
            },
            2: { 
                cardBg: 'bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-black border-[#94a3b8]',
                badgeBg: 'bg-[#94a3b8] text-black',
                icon: <Star className="w-[8vh] h-[8vh] text-[#94a3b8]" fill="currentColor"/>,
                label: 'RUNNER UP',
                glow: 'shadow-[0_0_60px_rgba(148,163,184,0.15)]',
                textColor: 'text-[#F1F5F9]',
                numberColor: '#94a3b8'
            },
            3: { 
                cardBg: 'bg-gradient-to-b from-[#431407] via-[#250802] to-black border-[#D97706]',
                badgeBg: 'bg-[#D97706] text-black',
                icon: <Trophy className="w-[7vh] h-[7vh] text-[#D97706]" fill="currentColor"/>,
                label: 'THIRD PLACE',
                glow: 'shadow-[0_0_50px_rgba(217,119,6,0.15)]',
                textColor: 'text-[#FFEDD5]',
                numberColor: '#D97706'
            }
        }[rank as 1|2|3]!;

        return (
            <div className={`
                relative flex flex-col items-center p-[2.5vh] lg:p-[4vh] rounded-[4vh] border-[0.4vh]
                animate-in zoom-in-95 slide-in-from-bottom-12 duration-1000 backdrop-blur-3xl 
                ${config.cardBg} ${config.glow} 
                ${isChampion ? 'scale-110 z-20 w-full mb-[2vh]' : 'scale-90 opacity-95 w-full'}
            `}>
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-[3vh] py-[0.8vh] rounded-full font-black uppercase text-[1.2vh] tracking-[0.3em] shadow-xl ${config.badgeBg} animate-pulse`}>
                    {config.label}
                </div>
                
                <div className="mb-[2vh] mt-[1vh]">{config.icon}</div>

                <div className="text-center space-y-[0.5vh] mb-[2.5vh] w-full">
                    <h3 className={`text-[3vh] lg:text-[4.5vh] font-black font-serif uppercase tracking-tighter leading-tight line-clamp-1 ${config.textColor}`}>
                        {winner.participantName}
                    </h3>
                    <p className={`text-[1.4vh] lg:text-[2vh] font-black uppercase tracking-[0.3em] opacity-60 ${config.textColor}`}>{winner.teamName}</p>
                </div>

                <div className="w-full text-center p-[2vh] rounded-[2.5vh] bg-black/40 border border-white/10">
                    <div className="text-[5vh] lg:text-[7vh] font-black tabular-nums leading-none tracking-tighter" style={{ color: config.numberColor }}>
                        <CountUp end={winner.totalPoints} duration={2500} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-[2vh] lg:p-[5vh] overflow-hidden select-none">
            <div className="text-center mb-[5vh] relative z-20 w-full animate-float">
                <div className="inline-flex items-center gap-[1.5vh] px-[3vh] py-[1vh] bg-white/5 rounded-full border border-white/10 mb-[2vh] animate-in fade-in slide-in-from-top-4 duration-700">
                    <span className="text-[1.8vh] lg:text-[2.5vh] font-black uppercase tracking-[0.5em] text-zinc-400">{result.categoryName}</span>
                </div>
                <h1 className="text-[6vh] lg:text-[9vh] font-black font-serif uppercase tracking-tighter leading-[0.95] text-white mb-[1.5vh] whitespace-nowrap overflow-hidden text-ellipsis px-[4vh] animate-in fade-in zoom-in-95 duration-1000 delay-200">
                    {result.itemName}
                </h1>
                <div className="flex items-center justify-center gap-[3vh] animate-in fade-in duration-1000 delay-500">
                    <div className="h-[1px] flex-1 max-w-[25vw] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    <span className="text-[1.2vh] lg:text-[1.6vh] font-black uppercase tracking-[1em] text-emerald-500 ml-[1em]">VERDICT DECLARED</span>
                    <div className="h-[1px] flex-1 max-w-[25vw] bg-gradient-to-l from-transparent via-white/20 to-transparent"></div>
                </div>
            </div>

            <div className="flex flex-row items-end justify-center w-full max-w-1300px gap-[1vh] lg:gap-[4vh] relative z-20 px-[2vh]">
                <div className="flex-1 flex justify-center order-1"><PodiumCard rank={2} winner={rank2} isVisible={revealStep >= 2} /></div>
                <div className="flex-1.3 flex justify-center order-2"><PodiumCard rank={1} winner={rank1} isVisible={revealStep >= 3} isChampion /></div>
                <div className="flex-1 flex justify-center order-3"><PodiumCard rank={3} winner={rank3} isVisible={revealStep >= 1} /></div>
            </div>
        </div>
    );
};

// --- LEADERBOARD RACE LOGIC ---

interface TeamRaceState {
    id: string;
    name: string;
    points: number;
    prevPoints: number;
    lastGain: number;
    lastItem: string;
}

const LeaderboardSlide: React.FC<{ 
    teams: any[]; 
    active: boolean; 
    timeline: any[]; 
    items: any[]; 
    calculateItemScores: any;
    baselinePoints: Record<string, number>;
    baselineCount: number;
}> = ({ teams, active, timeline, items, calculateItemScores, baselinePoints, baselineCount }) => {
    const [teamStates, setTeamStates] = useState<TeamRaceState[]>([]);
    const [progressIndex, setProgressIndex] = useState(-1); // -1 = Surge Phase, 0+ = Relay Phase
    const [isReplaying, setIsReplaying] = useState(false);

    const timelineKey = useMemo(() => {
        return JSON.stringify((timeline || []).map(t => t.itemId)) + JSON.stringify(baselinePoints);
    }, [timeline, baselinePoints]);

    useEffect(() => {
        if (active) {
            setTeamStates((teams || []).map(t => ({
                id: t.id,
                name: t.name,
                points: 0, 
                prevPoints: 0,
                lastGain: 0,
                lastItem: ''
            })));
            setProgressIndex(-1);
            setIsReplaying(true);
        } else {
            setIsReplaying(false);
            setProgressIndex(-1);
        }
    }, [active, teams, timelineKey]);

    useEffect(() => {
        if (!active || !isReplaying) return;

        const getNextStepDelay = () => {
            if (progressIndex === -1) return 100; 
            if (progressIndex === 0) return BASELINE_SURGE_DURATION + 200; 
            return RACE_STEP_DURATION;
        };

        const timer = setTimeout(() => {
            if (progressIndex === -1) {
                setTeamStates(prev => prev.map(t => {
                    const basePoints = baselinePoints[t.id] || 0;
                    return {
                        ...t,
                        prevPoints: 0,
                        points: basePoints,
                        lastGain: basePoints,
                        lastItem: basePoints > 0 ? 'FESTIVAL PROGRESS' : ''
                    };
                }));
                setProgressIndex(0);
            } else if (progressIndex < timeline.length) {
                const result = timeline[progressIndex];
                const item = items.find(i => i.id === result.itemId);
                if (item) {
                    const wins = calculateItemScores(item, result.winners);
                    setTeamStates(prev => prev.map(t => {
                        const teamWins = wins.filter((w: any) => w.teamId === t.id);
                        const gain = teamWins.reduce((sum: number, w: any) => sum + w.totalPoints, 0);
                        return {
                            ...t,
                            prevPoints: t.points,
                            points: t.points + gain,
                            lastGain: gain,
                            lastItem: gain > 0 ? item.name : ''
                        };
                    }));
                }
                setProgressIndex(prev => prev + 1);
            }
        }, getNextStepDelay());

        return () => clearTimeout(timer);
    }, [active, isReplaying, progressIndex, timeline, items, calculateItemScores, baselinePoints]);

    const sortedStates = useMemo(() => {
        return [...teamStates].sort((a, b) => b.points - a.points);
    }, [teamStates]);

    const maxPoints = Math.max(...teamStates.map(t => t.points), 1);
    const visibleCount = Math.min(8, teams.length);
    const ROW_HEIGHT_VH = 65 / visibleCount;
    const itemsProcessedCount = baselineCount + (progressIndex >= 0 ? Math.min(progressIndex + 1, timeline.length) : 0);

    return (
        <div className="h-full w-full flex flex-col p-[5vh] lg:p-[8vh] relative overflow-hidden select-none">
            <div className="absolute inset-0 z-0 opacity-[0.03] transition-all duration-1000" style={{ background: `radial-gradient(circle at 50% 50%, #3b82f6 0%, transparent 80%)` }}></div>

            <div className="flex flex-row justify-between items-end mb-[5vh] relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <div className="flex items-center gap-[1.5vh] mb-[1.5vh]">
                        <div className="w-[1.5vh] h-[1.5vh] rounded-full bg-sky-500 shadow-[0_0_25px_#0ea5e9] animate-pulse"></div>
                        <h2 className="text-[1.5vh] lg:text-[2.2vh] font-black uppercase tracking-[0.6em] text-sky-500">LIVE POINT RACE</h2>
                    </div>
                    <div className="flex items-center gap-[4vh]">
                        <h1 className="text-[6vh] lg:text-[11vh] font-black font-serif uppercase tracking-tighter leading-none text-white">LEADERBOARD</h1>
                        {progressIndex >= 0 && (
                            <div className="px-[3vh] py-[1vh] bg-emerald-500/10 rounded-[2.5vh] border border-emerald-500/20 animate-in fade-in zoom-in duration-700 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                <span className="text-[1.8vh] lg:text-[2.8vh] font-black text-emerald-400 tabular-nums uppercase tracking-widest whitespace-nowrap">
                                    After {itemsProcessedCount} Result Points
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 relative w-full">
                {teamStates.map((team) => {
                    const rankIdx = sortedStates.findIndex(s => s.id === team.id);
                    if (rankIdx >= visibleCount) return null;
                    const isWinner = rankIdx === 0;
                    const isRunner = rankIdx === 1;
                    const medalColor = isWinner ? 'text-[#FFD700]' : isRunner ? 'text-[#C0C0C0]' : rankIdx === 2 ? 'text-[#CD7F32]' : 'text-zinc-700';
                    const barColor = isWinner 
                        ? 'bg-gradient-to-r from-[#FFD700] via-yellow-400 to-yellow-600 shadow-[0_0_40px_rgba(255,215,0,0.3)]' 
                        : isRunner 
                            ? 'bg-gradient-to-r from-[#C0C0C0] via-slate-300 to-slate-500 shadow-[0_0_30px_rgba(192,192,192,0.15)]'
                            : rankIdx === 2 
                                ? 'bg-gradient-to-r from-[#CD7F32] via-orange-500 to-orange-800'
                                : 'bg-gradient-to-r from-sky-600 to-indigo-700';
                    const percentage = (team.points / maxPoints) * 100;
                    return (
                        <div key={team.id} className="absolute left-0 w-full transition-all duration-[1200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center group" style={{ top: `${rankIdx * (ROW_HEIGHT_VH + 2)}vh`, height: `${ROW_HEIGHT_VH}vh`, zIndex: team.lastGain > 0 ? 50 : 10 }}>
                            <div className={`w-[8vh] lg:w-[15vh] shrink-0 flex items-center justify-center font-black text-[3vh] lg:text-[6vh] font-mono ${medalColor} transition-colors duration-1000`}>{(rankIdx + 1).toString().padStart(2, '0')}</div>
                            <div className={`flex-grow h-full bg-zinc-950/60 border-2 transition-all duration-1000 rounded-[2.5vh] relative overflow-hidden flex items-center px-[3vh] lg:px-[6vh] ${team.lastGain > 0 ? 'border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'border-white/5'}`}>
                                <div className="flex justify-between items-center relative z-10 w-full">
                                    <div className="flex items-center gap-4 min-w-0 pr-6">
                                        <span className={`text-[2vh] lg:text-[4vh] font-black uppercase tracking-tight truncate transition-colors duration-1000 ${isWinner ? 'text-white' : 'text-zinc-500'}`}>{team.name}</span>
                                    </div>
                                    <div className={`text-[3.5vh] lg:text-[6.5vh] font-black tabular-nums tracking-tighter leading-none transition-all duration-1000 ${medalColor}`}><CountUp start={team.prevPoints} end={team.points} duration={progressIndex === 0 ? BASELINE_SURGE_DURATION : 1400} /></div>
                                </div>
                                <div className="absolute bottom-0 left-0 h-[1.2vh] bg-white/[0.02] w-full"></div>
                                <div className={`absolute bottom-0 left-0 h-[1.2vh] transition-all duration-[1500ms] ease-out ${barColor}`} style={{ width: `${Math.max(percentage, 1)}%` }}></div>
                                {team.lastGain > 0 && (
                                    <div className="absolute right-[2vh] top-1/2 -translate-y-1/2 animate-in fade-in zoom-in slide-in-from-right-12 duration-700 bg-emerald-500 text-white px-[2.5vh] py-[1vh] rounded-[2vh] shadow-[0_15px_40px_rgba(16,185,129,0.4)] flex items-center gap-[2vh] border border-emerald-400">
                                        <span className="text-[2.2vh] lg:text-[3.2vh] font-black leading-none">+{team.lastGain}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- NEW: CATEGORY TOPPERS SLIDE ---

interface TopperState {
    id: string;
    name: string;
    points: number;
    prevPoints: number;
    teamName: string;
    categoryName: string;
    chestNumber: string;
}

const CategoryToppersSlide: React.FC<{ toppers: any[]; active: boolean }> = ({ toppers, active }) => {
    const [localToppers, setLocalToppers] = useState<TopperState[]>([]);
    const [isSurging, setIsSurging] = useState(false);

    useEffect(() => {
        if (active) {
            setLocalToppers(toppers.map(t => ({ ...t, points: 0, prevPoints: 0 })));
            setIsSurging(false);
            const timer = setTimeout(() => {
                setLocalToppers(toppers.map(t => ({ ...t, prevPoints: 0, points: t.points })));
                setIsSurging(true);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setIsSurging(false);
            setLocalToppers([]);
        }
    }, [active, toppers]);

    const maxPoints = Math.max(...toppers.map(t => t.points), 1);
    const visibleToppers = localToppers.slice(0, 8); // Top 8 by point value for layout
    const ROW_HEIGHT_VH = 65 / Math.max(visibleToppers.length, 1);

    return (
        <div className="h-full w-full flex flex-col p-[5vh] lg:p-[8vh] relative overflow-hidden select-none">
            <div className="absolute inset-0 z-0 opacity-[0.03] transition-all duration-1000" style={{ background: `radial-gradient(circle at 50% 50%, #10b981 0%, transparent 80%)` }}></div>

            <div className="mb-[5vh] animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-[1.5vh] mb-[1.5vh]">
                    <div className="w-[1.5vh] h-[1.5vh] rounded-full bg-emerald-500 shadow-[0_0_25px_#10b981] animate-pulse"></div>
                    <h2 className="text-[1.5vh] lg:text-[2.2vh] font-black uppercase tracking-[0.6em] text-emerald-500">INDIVIDUAL EXCELLENCE</h2>
                </div>
                <h1 className="text-[6vh] lg:text-[11vh] font-black font-serif uppercase tracking-tighter leading-none text-white">CATEGORY TOPPERS</h1>
                <p className="text-[1.2vh] lg:text-[1.6vh] font-bold text-zinc-600 uppercase tracking-[0.4em] mt-[1.5vh]">MOST POINTS EARNED IN SINGLE ITEMS</p>
            </div>

            <div className="flex-1 relative w-full">
                {visibleToppers.map((topper, idx) => {
                    const percentage = (topper.points / maxPoints) * 100;
                    return (
                        <div 
                            key={topper.id}
                            className="absolute left-0 w-full transition-all duration-[1200ms] ease-out flex items-center group"
                            style={{ 
                                top: `${idx * (ROW_HEIGHT_VH + 2)}vh`,
                                height: `${ROW_HEIGHT_VH}vh`
                            }}
                        >
                            <div className="w-[8vh] lg:w-[20vh] shrink-0 flex items-center justify-center font-black text-[2.5vh] lg:text-[4vh] text-zinc-600 truncate px-2 font-mono">
                                {topper.categoryName}
                            </div>

                            <div className={`flex-grow h-full bg-zinc-950/60 border-2 border-white/5 transition-all duration-1000 rounded-[2.5vh] relative overflow-hidden flex items-center px-[3vh] lg:px-[6vh] ${isSurging ? 'border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.1)]' : ''}`}>
                                <div className="flex justify-between items-center relative z-10 w-full">
                                    <div className="flex items-center gap-4 min-w-0 pr-6">
                                        <div className="p-2 bg-indigo-500/20 rounded-xl hidden lg:block shrink-0"><User size={24} className="text-indigo-400" /></div>
                                        <div className="min-w-0">
                                            <span className="text-[2vh] lg:text-[3.5vh] font-black uppercase tracking-tight text-white block truncate leading-tight">{topper.name}</span>
                                            <span className="text-[1vh] lg:text-[1.4vh] font-black uppercase tracking-widest text-zinc-500 block truncate opacity-80">{topper.teamName} • #{topper.chestNumber}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[3.5vh] lg:text-[6.5vh] font-black tabular-nums tracking-tighter leading-none text-indigo-400">
                                            <CountUp start={topper.prevPoints} end={topper.points} duration={2000} />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 h-[1.2vh] bg-white/[0.02] w-full"></div>
                                <div 
                                    className="absolute bottom-0 left-0 h-[1.2vh] transition-all duration-[2000ms] ease-out bg-gradient-to-r from-indigo-600 to-emerald-500"
                                    style={{ width: `${Math.max(percentage, 1)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
                {visibleToppers.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 italic text-[2vh] font-black uppercase tracking-widest">
                        <Award size={80} strokeWidth={1} className="mb-6" />
                        Awaiting individual standings
                    </div>
                )}
            </div>
        </div>
    );
};

const StatsSlide: React.FC<{ stats: any }> = ({ stats }) => (
    <div className="h-full w-full flex flex-col p-[5vh] lg:p-[10vh] overflow-hidden select-none">
        <div className="mb-[5vh] animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-[1.5vh] h-[1.5vh] rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse"></div>
                <h2 className="text-[1.5vh] lg:text-[2.2vh] font-black uppercase tracking-[0.6em] text-emerald-500">SYSTEM TELEMETRY</h2>
            </div>
            <h1 className="text-[6vh] lg:text-[11vh] font-black font-serif uppercase tracking-tighter leading-none text-white">FESTIVAL DATA</h1>
        </div>
        
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-[2vh] lg:gap-[3.5vh]">
            {[
                { icon: Users, label: 'TOTAL DELEGATES', value: stats.participants, color: 'text-emerald-500' },
                { icon: Trophy, label: 'VERDICTS DECLARED', value: stats.declared, color: 'text-amber-500' },
                { icon: Star, label: 'POINTS REGISTERED', value: stats.totalPoints, color: 'text-indigo-500' },
                { icon: ClipboardList, label: 'LEVELS ACTIVE', value: stats.categories, color: 'text-rose-500' },
                { icon: Layers, label: 'DISCIPLINES', value: stats.items, color: 'text-sky-500' },
                { icon: Calendar, label: 'TIMELINE SLOTS', value: stats.scheduled, color: 'text-purple-500' }
            ].map((stat, i) => (
                <div 
                    key={i} 
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[3vh] p-[4vh] flex flex-col items-center justify-center group hover:border-white/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-12 fill-mode-backwards"
                    style={{ animationDelay: `${i * 120}ms` }}
                >
                    <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 group-hover:scale-110 transition-transform duration-500 ${stat.color}`}>
                        <stat.icon size={32} />
                    </div>
                    
                    <div className="text-center">
                        <div className="text-[5vh] lg:text-[8vh] font-black mb-[0.8vh] tabular-nums leading-none text-white tracking-tighter">
                            <CountUp end={stat.value} duration={3000} />
                        </div>
                        <p className="text-[1vh] lg:text-[1.4vh] font-black uppercase tracking-[0.4em] text-zinc-500 ml-[0.4em]">
                            {stat.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const UpcomingSlide: React.FC<{ events: any[] }> = ({ events }) => (
    <div className="h-full w-full flex flex-col p-[5vh] lg:p-[10vh] overflow-hidden select-none">
        <div className="mb-[5vh] animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-[1.5vh] h-[1.5vh] rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse"></div>
                <h2 className="text-[1.5vh] lg:text-[2.2vh] font-black uppercase tracking-[0.6em] text-amber-500">STAGE FLOW</h2>
            </div>
            <h1 className="text-[6vh] lg:text-[11vh] font-black font-serif uppercase tracking-tighter leading-none text-white">UPCOMING EVENTS</h1>
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[2vh] lg:gap-[3.5vh]">
            {events.slice(0, 6).map((ev, i) => (
                <div 
                    key={i} 
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[3vh] p-[3vh] flex flex-col justify-between group hover:border-white/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-12 fill-mode-backwards"
                    style={{ animationDelay: `${i * 120}ms` }}
                >
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <span className="text-[1vh] lg:text-[1.3vh] font-black uppercase tracking-widest text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">{ev.categoryName}</span>
                            <div className="p-2 bg-amber-600 rounded-xl text-white shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform"><Clock size={16}/></div>
                        </div>
                        <h3 className="text-[2.2vh] lg:text-[3.2vh] font-black uppercase tracking-tight text-white line-clamp-2 leading-tight min-h-[2.4em]">{ev.itemName}</h3>
                    </div>
                    
                    <div className="border-t border-white/10 pt-[2vh] mt-[2vh]">
                        <div className="flex justify-between items-end">
                            <div className="min-w-0 flex-1">
                                <p className="text-[0.9vh] lg:text-[1.1vh] font-black uppercase text-zinc-500 tracking-widest mb-2">Target Venue</p>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-500 text-black rounded-xl shadow-lg border border-amber-400">
                                    <MapPin size={16} fill="currentColor" />
                                    <p className="text-[1.8vh] lg:text-[2.6vh] font-black truncate uppercase tracking-tighter leading-none">{ev.stage || 'TBA'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// --- Main View ---

const ProjectorView: React.FC<ProjectorViewProps> = ({ onNavigate }) => {
    const { state } = useFirebase();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [revealStep, setRevealStep] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [slideTempo, setSlideTempo] = useState(SPEEDS[1]);

    // Single Media Upload & Projection State
    const [media, setMedia] = useState<{
        file: File;
        url: string;
        type: 'image' | 'video';
        name: string;
        size: string;
    } | null>(null);
    const [isProjectingMedia, setIsProjectingMedia] = useState(false);
    const [isMediaVideoPlaying, setIsMediaVideoPlaying] = useState(true);
    const [isMediaVideoMuted, setIsMediaVideoMuted] = useState(false);
    const [isMediaVideoLooping, setIsMediaVideoLooping] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<number>(0);
    const lastTickRef = useRef<number>(Date.now());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoElementRef = useRef<HTMLVideoElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (media?.url) {
            URL.revokeObjectURL(media.url);
        }
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) {
            alert('Please select a valid image or video file.');
            return;
        }
        const url = URL.createObjectURL(file);
        setMedia({
            file,
            url,
            type: isVideo ? 'video' : 'image',
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        });
        e.target.value = '';
    };

    useEffect(() => {
        return () => {
            if (media?.url) {
                URL.revokeObjectURL(media.url);
            }
        };
    }, [media]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isProjectingMedia) {
                setIsProjectingMedia(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isProjectingMedia]);

    const calculateItemScores = useCallback((item: any, winners: any[]) => {
        if (!state || !item) return [];
        const gradesConfig = item.type === ItemType.SINGLE ? (state.gradePoints?.single || []) : (state.gradePoints?.group || []);
        const participants = state.participants || [];
        const teams = state.teams || [];
        return (winners || []).map(w => {
            const p = participants.find(part => part.id === w.participantId);
            const t = p ? teams.find(tm => tm.id === p.teamId) : null;
            let prizePts = 0;
            if (w.position === 1) prizePts += item.points?.first || 0;
            else if (w.position === 2) prizePts += item.points?.second || 0;
            else if (w.position === 3) prizePts += item.points?.third || 0;
            let gradePts = 0;
            if (w.gradeId) {
                const grade = gradesConfig.find(g => g.id === w.gradeId);
                if (grade) gradePts += (item.gradePointsOverride?.[grade.id] ?? (grade.points || 0));
            }
            return {
                ...w,
                participantName: item.type === ItemType.GROUP ? `${p?.name || '---'} & Party` : (p?.name || '---'),
                teamId: p?.teamId, teamName: t?.name || '---', prizePts, gradePts, totalPoints: prizePts + gradePts
            };
        });
    }, [state]);

    const data = useMemo(() => {
        if (!state) return null;
        const results = state.results || [];
        const items = state.items || [];
        const categories = state.categories || [];
        const teams = state.teams || [];
        const schedule = state.schedule || [];
        const participants = state.participants || [];
        
        const declaredOnly = results.filter(r => {
            const item = items.find(i => i.id === r.itemId);
            return r.status === ResultStatus.DECLARED && !!item;
        });

        const rotationLimit = state.settings?.projector?.resultsLimit || 3;
        const raceLimit = state.settings?.projector?.pointsLimit || 10;
        
        const resultsSlidesData = declaredOnly.slice(-rotationLimit).reverse().map(r => {
            const item = items.find(i => i.id === r.itemId);
            const category = categories.find(c => c.id === item?.categoryId);
            if (!item || !category) return null;
            return {
                id: r.itemId, itemName: item.name, categoryName: category.name,
                winners: calculateItemScores(item, r.winners || []).sort((a,b) => (a.position || 99) - (b.position || 99))
            };
        }).filter(Boolean);

        const timeline = declaredOnly.slice(-raceLimit);
        const baselineResults = declaredOnly.slice(0, Math.max(0, declaredOnly.length - raceLimit));
        const baselineCount = baselineResults.length;

        const baselinePoints: Record<string, number> = {};
        teams.forEach(t => baselinePoints[t.id] = 0);
        
        baselineResults.forEach(r => {
            const item = items.find(i => i.id === r.itemId);
            if (item) {
                calculateItemScores(item, r.winners || []).forEach(w => {
                    if (w.teamId) baselinePoints[w.teamId] = (baselinePoints[w.teamId] || 0) + w.totalPoints;
                });
            }
        });

        const totalPointsMap: Record<string, number> = { ...baselinePoints };
        timeline.forEach(r => {
            const item = items.find(i => i.id === r.itemId);
            if (item) {
                calculateItemScores(item, r.winners || []).forEach(w => {
                    if (w.teamId) totalPointsMap[w.teamId] = (totalPointsMap[w.teamId] || 0) + w.totalPoints;
                });
            }
        });

        // CALCULATE CATEGORY TOPPERS (Individual Single Points)
        const toppersMap: Record<string, any[]> = {};
        categories.forEach(c => toppersMap[c.id] = []);

        declaredOnly.forEach(r => {
            const item = items.find(i => i.id === r.itemId);
            if (item && item.type === ItemType.SINGLE) {
                calculateItemScores(item, r.winners || []).forEach(w => {
                    if (w.participantId && w.totalPoints > 0) {
                        const existing = toppersMap[item.categoryId]?.find(e => e.participantId === w.participantId);
                        if (existing) {
                            existing.points += w.totalPoints;
                        } else if (toppersMap[item.categoryId]) {
                            toppersMap[item.categoryId].push({ 
                                participantId: w.participantId, 
                                name: w.participantName, 
                                teamName: w.teamName, 
                                chestNumber: w.chestNumber || '',
                                points: w.totalPoints, 
                                categoryName: categories.find(c => c.id === item.categoryId)?.name || '' 
                            });
                        }
                    }
                });
            }
        });

        const categoryToppers = (categories || []).map(c => {
            const list = toppersMap[c.id];
            if (!list || list.length === 0) return null;
            const topper = [...list].sort((a,b) => b.points - a.points)[0];
            return { ...topper, id: c.id };
        }).filter(Boolean).sort((a: any, b: any) => b.points - a.points);

        return { 
            results: resultsSlidesData,
            timeline: timeline,
            baselinePoints: baselinePoints,
            baselineCount: baselineCount,
            categoryToppers: categoryToppers,
            teams: (teams || []).map(t => ({ id: t.id, name: t.name })),
            stats: {
                participants: (participants || []).length, items: (items || []).length,
                declared: (declaredOnly || []).length, categories: (categories || []).length,
                totalPoints: Object.values(totalPointsMap).reduce((a, b) => a + b, 0),
                scheduled: (schedule || []).length
            },
            upcoming: (schedule || []).map(ev => ({ 
                ...ev, itemName: (items || []).find(i => i.id === ev.itemId)?.name, 
                categoryName: (categories || []).find(c => c.id === ev.categoryId)?.name 
            }))
        };
    }, [state, calculateItemScores]);

    const SLIDE_ORDER: SlideType[] = useMemo(() => {
        const config = state?.settings?.projector;
        const slides: SlideType[] = [];
        if (config?.showResults !== false && data?.results) {
            data.results.forEach((_, i) => slides.push(`RESULT_${i}`));
        }
        if (config?.showLeaderboard !== false) slides.push('LEADERBOARD');
        
        // Always show toppers slide if there is data
        if (data?.categoryToppers && data.categoryToppers.length > 0) {
            slides.push('TOPPERS');
        }

        if (config?.showStats !== false) slides.push('STATS');
        if (config?.showUpcoming !== false) slides.push('UPCOMING');
        return slides.length > 0 ? slides : ['STATS'];
    }, [state?.settings.projector, data?.results, data?.categoryToppers]);

    const currentSlideDuration = useMemo(() => {
        const slideKey = SLIDE_ORDER[currentSlideIndex];
        if (slideKey === 'LEADERBOARD') {
            const timelineLength = data?.timeline?.length || 0;
            return BASELINE_SURGE_DURATION + (timelineLength * RACE_STEP_DURATION) + 10000;
        }
        if (slideKey === 'TOPPERS') {
            return 15000; // Static long duration for toppers race
        }
        return slideTempo.value;
    }, [currentSlideIndex, SLIDE_ORDER, data?.timeline?.length, slideTempo.value]);

    useEffect(() => {
        const tick = () => {
            if (isPaused || isProjectingMedia) { lastTickRef.current = Date.now(); return; }
            const now = Date.now();
            const delta = now - lastTickRef.current;
            lastTickRef.current = now;
            
            const speed = currentSlideDuration;
            progressRef.current += (delta / speed) * 100;
            
            if (progressRef.current >= 100) {
                progressRef.current = 0;
                setCurrentSlideIndex(prev => (prev + 1) % SLIDE_ORDER.length);
            }
            const bar = document.getElementById('active-slide-progress');
            if (bar) bar.style.width = `${progressRef.current}%`;
        };
        const interval = setInterval(tick, 30);
        return () => clearInterval(interval);
    }, [isPaused, isProjectingMedia, currentSlideDuration, SLIDE_ORDER.length]);

    useEffect(() => {
        if (SLIDE_ORDER[currentSlideIndex]?.startsWith('RESULT')) {
            setRevealStep(0);
            const t1 = setTimeout(() => setRevealStep(1), REVEAL_DELAY);
            const t2 = setTimeout(() => setRevealStep(2), REVEAL_DELAY * 2);
            const t3 = setTimeout(() => setRevealStep(3), REVEAL_DELAY * 3);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        }
    }, [currentSlideIndex, SLIDE_ORDER]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); } 
        else { document.exitFullscreen(); setIsFullscreen(false); }
    };

    if (!state || !data) return null;

    return (
        <div ref={containerRef} className="h-screen w-screen overflow-hidden relative font-sans select-none bg-black text-white flex flex-col p-0 m-0">
            {/* Hidden File Input for Single Media Upload */}
            <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*,video/*" 
                className="hidden" 
                onChange={handleFileUpload} 
            />

            {/* Top Right Media Upload / Project Media Control (Visible during slideshow) */}
            {!isProjectingMedia && (
                <div className="fixed top-5 right-5 z-[70] flex items-center gap-3 pointer-events-auto">
                    {!media ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 bg-black/80 hover:bg-black/95 backdrop-blur-2xl border border-white/20 hover:border-emerald-500/50 text-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.7)] transition-all duration-300 hover:scale-105 active:scale-95 group text-xs font-black uppercase tracking-wider"
                            title="Upload single media (image or video) to project"
                        >
                            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                                <Upload size={14} className="stroke-[2.5]" />
                            </div>
                            <span>Upload Media</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 p-1.5 bg-black/85 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl text-[11px] font-bold text-zinc-300 max-w-[140px] sm:max-w-[200px] truncate">
                                {media.type === 'video' ? <FileVideo size={14} className="text-amber-400 shrink-0" /> : <FileImage size={14} className="text-emerald-400 shrink-0" />}
                                <span className="truncate" title={media.name}>{media.name}</span>
                            </div>

                            <button
                                onClick={() => setIsProjectingMedia(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse"
                                title="Project this media onto the big screen"
                            >
                                <Tv size={14} className="stroke-[2.5]" />
                                <span>Project Media</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white rounded-xl transition-all"
                                title="Replace media"
                            >
                                <RefreshCw size={14} />
                            </button>

                            <button
                                onClick={() => {
                                    if (media.url) URL.revokeObjectURL(media.url);
                                    setMedia(null);
                                }}
                                className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all"
                                title="Remove media"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* FULLSCREEN MEDIA PROJECTION SCREEN */}
            {isProjectingMedia && media && (
                <div className="fixed inset-0 z-[80] bg-black flex flex-col animate-in fade-in duration-300 select-none">
                    {/* Top Navigation Bar */}
                    <div className="relative z-20 w-full p-4 sm:p-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent">
                        {/* Back button to live point race screen */}
                        <button
                            onClick={() => setIsProjectingMedia(false)}
                            className="flex items-center gap-2.5 px-4 sm:px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_10px_35px_rgba(99,102,241,0.5)] transition-all duration-300 hover:scale-105 active:scale-95 border border-indigo-400/40 group"
                            title="Return to the live point race screen"
                        >
                            <ArrowLeft size={18} className="stroke-[3] group-hover:-translate-x-1 transition-transform" />
                            <span>Back to Live Points Race</span>
                        </button>

                        {/* Status badge */}
                        <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-xs font-bold text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Media Projection</span>
                            <span className="text-zinc-500">•</span>
                            <span className="max-w-[240px] truncate text-zinc-200 font-medium">{media.name}</span>
                        </div>

                        {/* Right Quick Controls */}
                        <div className="flex items-center gap-2">
                            {media.type === 'video' && (
                                <>
                                    <button
                                        onClick={() => {
                                            if (videoElementRef.current) {
                                                if (videoElementRef.current.paused) {
                                                    videoElementRef.current.play();
                                                    setIsMediaVideoPlaying(true);
                                                } else {
                                                    videoElementRef.current.pause();
                                                    setIsMediaVideoPlaying(false);
                                                }
                                            }
                                        }}
                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                        title={isMediaVideoPlaying ? "Pause Video" : "Play Video"}
                                    >
                                        {isMediaVideoPlaying ? <Pause size={18} /> : <Play size={18} />}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (videoElementRef.current) {
                                                videoElementRef.current.muted = !isMediaVideoMuted;
                                                setIsMediaVideoMuted(!isMediaVideoMuted);
                                            }
                                        }}
                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                        title={isMediaVideoMuted ? "Unmute Audio" : "Mute Audio"}
                                    >
                                        {isMediaVideoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsMediaVideoLooping(!isMediaVideoLooping);
                                        }}
                                        className={`p-3 rounded-xl transition-all ${isMediaVideoLooping ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-zinc-400'}`}
                                        title={isMediaVideoLooping ? "Loop Enabled" : "Loop Disabled"}
                                    >
                                        <Repeat size={18} />
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                                title="Replace currently projected media"
                            >
                                <RefreshCw size={14} />
                                <span className="hidden sm:inline">Replace Media</span>
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                title="Toggle Fullscreen"
                            >
                                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Media Display Container */}
                    <div className="flex-grow w-full h-full relative overflow-hidden flex items-center justify-center p-4 sm:p-8">
                        {media.type === 'image' ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <div 
                                    className="absolute inset-0 bg-contain bg-center blur-3xl opacity-25 scale-125 pointer-events-none" 
                                    style={{ backgroundImage: `url(${media.url})` }} 
                                />
                                <img
                                    src={media.url}
                                    alt={media.name}
                                    className="relative z-10 max-w-full max-h-[82vh] object-contain rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.95)] border border-white/10 animate-in zoom-in-95 duration-500"
                                />
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <video
                                    ref={videoElementRef}
                                    src={media.url}
                                    autoPlay
                                    playsInline
                                    loop={isMediaVideoLooping}
                                    muted={isMediaVideoMuted}
                                    controls
                                    className="relative z-10 max-w-full max-h-[82vh] object-contain rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.95)] border border-white/10"
                                    onPlay={() => setIsMediaVideoPlaying(true)}
                                    onPause={() => setIsMediaVideoPlaying(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-emerald-50/10 rounded-full blur-[160px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-50/15 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '3s' }}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <main className="relative z-10 flex-grow w-full overflow-hidden flex flex-col">
                {SLIDE_ORDER.map((key, index) => {
                    const isActive = index === currentSlideIndex;
                    const renderKey = isActive ? `${key}_active` : `${key}_idle`;

                    return (
                        <div key={renderKey} className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out flex items-center justify-center ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                            {key.startsWith('RESULT_') && <ResultSlide result={data.results[parseInt(key.split('_')[1])]} revealStep={revealStep} />}
                            {key === 'LEADERBOARD' && (
                                <LeaderboardSlide 
                                    teams={data.teams} 
                                    active={isActive} 
                                    timeline={data.timeline} 
                                    items={state.items} 
                                    calculateItemScores={calculateItemScores} 
                                    baselinePoints={data.baselinePoints} 
                                    baselineCount={data.baselineCount}
                                />
                            )}
                            {key === 'TOPPERS' && (
                                <CategoryToppersSlide toppers={data.categoryToppers} active={isActive} />
                            )}
                            {key === 'STATS' && <StatsSlide stats={data.stats} />}
                            {key === 'UPCOMING' && <UpcomingSlide events={data.upcoming} />}
                        </div>
                    );
                })}
            </main>

            <div className="absolute inset-0 z-[60] pointer-events-none group">
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95vw] max-w-[700px] pointer-events-auto opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700">
                    <div className="bg-black/95 backdrop-blur-3xl border-2 border-white/10 p-5 rounded-[3vh] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col gap-5 overflow-hidden">
                        <div className="flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                                 <button onClick={() => { progressRef.current = 0; setCurrentSlideIndex(p => (p - 1 + SLIDE_ORDER.length) % SLIDE_ORDER.length); }} className="p-3 text-zinc-500 hover:text-white transition-all active:scale-90"><ChevronLeft size={32} /></button>
                                 <button onClick={() => setIsPaused(!isPaused)} className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isPaused ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>{isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}</button>
                                 <button onClick={() => { progressRef.current = 0; setCurrentSlideIndex(p => (p + 1) % SLIDE_ORDER.length); }} className="p-3 text-zinc-500 hover:text-white transition-all active:scale-90"><ChevronRight size={32} /></button>
                            </div>
                            <div className="flex items-center gap-2">
                                {SPEEDS.map(s => (
                                    <button key={s.label} onClick={() => setSlideTempo(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${slideTempo.value === s.value ? 'bg-indigo-600 text-white shadow-lg' : 'border-white/5 text-zinc-500 hover:text-zinc-300'}`}>{s.label}</button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={toggleFullscreen} className="p-3 text-zinc-500 hover:text-white transition-all">{isFullscreen ? <Minimize size={28}/> : <Maximize size={28}/>}</button>
                                <button onClick={() => onNavigate(TABS.DASHBOARD)} className="p-3 bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white rounded-full transition-all border border-rose-500/20"><ArrowLeft size={28} strokeWidth={3} /></button>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div id="active-slide-progress" className="h-full bg-emerald-500 transition-all duration-300 linear shadow-[0_0_15px_#10b981]"></div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5vh); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-0.8vh); } }
                .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default ProjectorView;
