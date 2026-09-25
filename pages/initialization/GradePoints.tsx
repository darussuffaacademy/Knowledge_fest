import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useFirebase } from '../../hooks/useFirebase';
import { Grade, Item, ItemType, Participant, PerformanceType, TabulationEntry, CodeLetter } from '../../types';
import Card from '../../components/Card';
import { 
    Trash2, Trophy, Users, AlertTriangle, Wand2, RefreshCw, 
    ChevronDown, Check, Medal, Hash, SlidersHorizontal,
    Dices, Save, CheckCircle, CheckCircle2, Edit2, X, Layers, Sparkles, Plus,
    LayoutList, Mic, PenTool, Search, Filter, Keyboard, ArrowRightLeft,
    CheckSquare, Square, MousePointer2, ListRestart, Zap, Info, RotateCcw,
    Award, Star, Settings2, ShieldAlert
} from 'lucide-react';

// --- VISUALIZERS & HELPERS ---

const getGradeColor = (name: string) => {
    const n = name.toLowerCase().trim();
    if (n.startsWith('a')) return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500/20', light: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (n.startsWith('b')) return { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500/20', light: 'bg-indigo-50 dark:bg-indigo-900/30' };
    if (n.startsWith('c')) return { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200 dark:border-amber-800', light: 'bg-amber-50 dark:bg-amber-950/30' };
    return { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500/20', light: 'bg-rose-50 dark:bg-rose-950/30' };
};

const getCodeColor = (code: string, isConflict: boolean) => {
    if (isConflict) return '#f43f5e'; 
    if (!code || code === '?') return '#94a3b8';
    const char = code.charAt(0).toUpperCase();
    const colors: Record<string, string> = {
        'A': '#10b981', 'B': '#6366f1', 'C': '#f59e0b', 'D': '#f43f5e',
        'E': '#8b5cf6', 'F': '#ec4899', 'G': '#06b6d4', 'H': '#f97316',
    };
    return colors[char] || '#6366f1'; 
};

const SectionTitle = ({ title, icon: Icon, color = 'indigo' }: { title: string, icon?: any, color?: string }) => {
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]',
        emerald: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        purple: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]',
        rose: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
    };
    return (
        <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className={`h-5 w-1.5 rounded-full ${colors[color] || colors.indigo}`}></div>
            <h3 className="text-lg md:text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">
                {title}
            </h3>
            {Icon && <Icon className="text-zinc-400 ml-1" size={18} />}
        </div>
    );
};

const selectClasses = "w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm font-bold cursor-pointer text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50";

const GradeRangeVisualizer: React.FC<{ grades: Grade[], min: number, max: number }> = ({ grades, min, max }) => {
    const range = max - min;
    const sortedGrades = [...grades].sort((a, b) => a.lowerLimit - b.lowerLimit);

    return (
        <div className="w-full h-10 bg-zinc-100 dark:bg-black/40 rounded-2xl overflow-hidden flex mt-4 border border-zinc-200 dark:border-white/5 shadow-inner">
            {sortedGrades.map((grade) => {
                const widthPercent = Math.max(0, ((grade.upperLimit - grade.lowerLimit + 1) / range) * 100); 
                const colors = getGradeColor(grade.name);
                return (
                    <div 
                        key={grade.id} 
                        className="h-full flex flex-col items-center justify-center border-r border-white/20 last:border-0 transition-all duration-300 hover:brightness-110 cursor-help group relative"
                        style={{ width: `${widthPercent}%`, backgroundColor: `var(--tw-bg-opacity, 1)` }}
                    >
                        <div className={`absolute inset-0 ${colors.bg}`}></div>
                        <span className="relative z-10 text-[10px] font-black text-white drop-shadow-md">{grade.name}</span>
                    </div>
                );
            })}
            {sortedGrades.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    No ranges defined
                </div>
            )}
        </div>
    );
};

// --- SECTION: Points Override Modal ---

const ItemPointOverrideModal: React.FC<{
    item: Item;
    onClose: () => void;
    grades: Grade[];
}> = ({ item, onClose, grades }) => {
    const { updateItem } = useFirebase();
    const [prizePoints, setPrizePoints] = useState(item.points);
    const [gradeOverrides, setGradeOverrides] = useState<{ [gradeId: string]: number }>(item.gradePointsOverride || {});
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateItem({
                ...item,
                points: prizePoints,
                gradePointsOverride: gradeOverrides
            });
            onClose();
        } catch (e) {
            alert("Failed to save overrides.");
        } finally {
            setIsSaving(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-xl text-white"><SlidersHorizontal size={18}/></div>
                        <div>
                            <h3 className="text-xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">{item.name}</h3>
                            <p className="text-[10px] font-black uppercase text-zinc-400 mt-1 tracking-widest">Specific Point Overrides</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl"><X size={20} className="text-zinc-500"/></button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {/* Prize Overrides */}
                    <div className="space-y-4">
                        <SectionTitle title="Prize Points Override" icon={Trophy} color="amber" />
                        <div className="grid grid-cols-3 gap-6">
                            {[
                                { k: 'first', l: '1st Place', c: 'text-amber-500' },
                                { k: 'second', l: '2nd Place', c: 'text-slate-400' },
                                { k: 'third', l: '3rd Place', c: 'text-orange-500' }
                            ].map(p => (
                                <div key={p.k} className="space-y-2">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${p.c}`}>{p.l}</label>
                                    <input 
                                        type="number" 
                                        value={(prizePoints as any)[p.k]} 
                                        onChange={e => setPrizePoints({ ...prizePoints, [p.k]: +e.target.value })}
                                        className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-700 font-black text-center text-lg outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Grade Overrides */}
                    <div className="space-y-4">
                        <SectionTitle title="Grade Points Override" icon={Medal} color="indigo" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {grades.map(g => (
                                <div key={g.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white ${getGradeColor(g.name).bg}`}>{g.name.charAt(0)}</div>
                                        <div className="text-[10px] font-black uppercase text-zinc-400">Default: {g.points}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Override:</span>
                                        <input 
                                            type="number" 
                                            placeholder={g.points.toString()}
                                            value={gradeOverrides[g.id] ?? ''} 
                                            onChange={e => setGradeOverrides({ ...gradeOverrides, [g.id]: e.target.value === '' ? g.points : +e.target.value })}
                                            className="w-16 p-2 rounded-xl bg-white dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-900 text-center font-black outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-7 border-t border-white/5 bg-zinc-50 dark:bg-white/[0.02] flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-amazio-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amazio-primary/20 active:scale-95 transition-all">
                        {isSaving ? 'Saving...' : 'Apply Overrides'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- SECTION: Lot System ---

const LotMachine: React.FC = () => {
    const { state, updateMultipleTabulationEntries, updateLotPool, globalFilters, globalSearchTerm } = useFirebase();
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
    const [lotResults, setLotResults] = useState<Array<{ participantId: string; name: string; code: string; isLocked?: boolean }>>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [assignmentStatus, setAssignmentStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const lotPool = state?.lotPool || [];
    const categories = useMemo(() => (state?.categories || []).slice().sort((a, b) => a.name.localeCompare(b.name)), [state?.categories]);
    
    // Clear lot results when changing items
    useEffect(() => {
        setLotResults([]);
        setSelectedParticipantIds(new Set());
        setAssignmentStatus('idle');
    }, [selectedItemId]);

    const availableItems = useMemo(() => {
        if (!state) return [];
        let items = state.items;
        if (selectedCategoryId) items = items.filter(i => i.categoryId === selectedCategoryId);
        if (globalFilters.categoryId?.length > 0) items = items.filter(i => globalFilters.categoryId.includes(i.categoryId));
        if (globalFilters.performanceType?.length > 0) items = items.filter(i => globalFilters.performanceType.includes(i.performanceType));
        
        if (globalFilters.assignmentStatus?.length > 0) {
            items = items.filter(item => {
                const isAssigned = state.tabulation.some(t => t.itemId === item.id && t.codeLetter);
                const showAssigned = globalFilters.assignmentStatus.includes('ASSIGNED');
                const showUnassigned = globalFilters.assignmentStatus.includes('UNASSIGNED');
                if (showAssigned && showUnassigned) return true;
                if (showAssigned) return isAssigned;
                if (showUnassigned) return !isAssigned;
                return true;
            });
        }

        if (globalSearchTerm) {
            const query = globalSearchTerm.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(query));
        }
        return items.slice().sort((a,b) => a.name.localeCompare(b.name));
    }, [state, selectedCategoryId, globalFilters, globalSearchTerm]);

    const participants = useMemo(() => {
        if (!selectedItemId || !state) return [];
        const item = (state.items || []).find(i => i.id === selectedItemId);
        if (!item) return [];
        const enrolled = (state.participants || []).filter(p => (p.itemIds || []).includes(item.id));
        if (item.type === ItemType.GROUP) {
             const groups: Record<string, Participant[]> = {};
             enrolled.forEach(p => {
                 const groupIndex = p.itemGroups?.[item.id] || 1;
                 const key = `${p.teamId}_${groupIndex}`;
                 if (!groups[key]) groups[key] = [];
                 groups[key].push(p);
             });
             return Object.values(groups).map(members => {
                 let leader = (members || []).find(p => p.groupLeaderItemIds?.includes(item.id)) || members[0];
                 return { ...leader, id: leader.id, name: leader.name, chestNumber: leader.chestNumber, teamId: leader.teamId, displayName: `${leader.name} & Party` };
             }).sort((a,b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, {numeric: true}));
        }
        return (enrolled || []).map(p => ({ ...p, id: p.id, name: p.name, chestNumber: p.chestNumber, teamId: p.teamId, displayName: p.name })).sort((a,b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, {numeric: true}));
    }, [selectedItemId, state]);

    const conflicts = useMemo(() => {
        const conflictSet = new Set<string>();
        const codeMap = new Map<string, string>();
        if (state && selectedItemId) {
            (state.tabulation || []).filter(t => t.itemId === selectedItemId && t.codeLetter).forEach(t => {
                if (!lotResults.some(r => r.participantId === t.participantId)) codeMap.set(t.codeLetter, t.participantId);
            });
        }
        lotResults.forEach(res => {
            if (!res.code || res.code === '?') return;
            if (codeMap.has(res.code)) conflictSet.add(res.participantId);
            else codeMap.set(res.code, res.participantId);
        });
        return conflictSet;
    }, [lotResults, state, selectedItemId]);

    const toggleParticipant = (p: any) => {
        const newSet = new Set(selectedParticipantIds);
        const isAdding = !newSet.has(p.id);
        
        if (isAdding) {
            newSet.add(p.id);
        } else {
            newSet.delete(p.id);
        }

        setSelectedParticipantIds(newSet);

        // Auto-Sync Identity Registry Pool and Results
        if (state) {
            const count = newSet.size;
            // Get all possible codes from registry sorted
            const allRegCodes = [...(state.codeLetters || [])].sort((a,b) => (a.code || '').localeCompare(b.code || '')).map(c => c.code);
            // Select exactly the first N codes to match participant count
            const nextPool = allRegCodes.slice(0, count);
            
            // 1. Update the global pool in isolated lotPool doc
            if (JSON.stringify(state.lotPool) !== JSON.stringify(nextPool)) {
                updateLotPool(nextPool);
            }

            // 2. Refresh the local lotResults to map participants to the new pool
            const sortedSelections = Array.from(newSet).map(pid => {
                const participant = (participants || []).find(part => part.id === pid);
                return participant;
            }).filter(Boolean).sort((a: any, b: any) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, {numeric: true}));

            const newResults = sortedSelections.map((part: any, idx) => {
                const existingTab = (state.tabulation || []).find(t => t.itemId === selectedItemId && t.participantId === part.id);
                return {
                    participantId: part.id,
                    name: part.displayName || part.name,
                    code: existingTab?.codeLetter || nextPool[idx] || '?',
                    isLocked: !!existingTab?.codeLetter
                };
            });
            setLotResults(newResults);
        }
    };

    const handleSpin = () => {
        if (selectedParticipantIds.size === 0) return;
        setIsSpinning(true);
        const shuffledPool = [...lotPool].sort(() => Math.random() - 0.5);
        let elapsed = 0;
        const interval = setInterval(() => {
            setLotResults(prev => prev.map(res => ({ ...res, code: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)], isLocked: false })));
            elapsed += 50;
            if (elapsed >= 1500) {
                clearInterval(interval);
                setLotResults(prev => prev.map((res, idx) => ({ ...res, code: shuffledPool[idx] || '?', isLocked: true })));
                setIsSpinning(false);
            }
        }, 50);
    };

    const handleAssign = async () => {
        if (!state || !selectedItemId) return;
        setIsSpinning(true); 
        const updates = lotResults.map(res => {
            const entryId = `${selectedItemId}-${res.participantId}`;
            const existing = state.tabulation.find(t => t.id === entryId);
            return existing ? { ...existing, codeLetter: res.code } : {
                id: entryId, itemId: selectedItemId, categoryId: availableItems.find(i=>i.id===selectedItemId)?.categoryId || '',
                participantId: res.participantId, codeLetter: res.code, marks: {}, finalMark: null, position: null, gradeId: null
            };
        });
        await updateMultipleTabulationEntries(updates as any);
        const usedCodes = new Set(lotResults.filter(r => r.code !== '?').map(r => r.code));
        await updateLotPool(lotPool.filter(c => !usedCodes.has(c)));
        
        setIsSpinning(false);
        setAssignmentStatus('success');
        
        // Success Timeout
        setTimeout(() => { 
            setAssignmentStatus('idle'); 
            setSelectedParticipantIds(new Set()); 
            setLotResults([]); 
            setSelectedItemId('');
            setSelectedCategoryId('');
        }, 3000);
    };

    return (
        <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl md:rounded-[3rem] border border-amazio-primary/5 dark:border-white/5 p-5 md:p-10 shadow-glass-light dark:shadow-2xl relative overflow-hidden min-h-[500px]">
            {/* SUCCESS OVERLAY */}
            {assignmentStatus === 'success' && (
                <div className="absolute inset-0 z-[100] bg-emerald-600/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                        <CheckCircle2 size={100} strokeWidth={1.5} className="relative z-10 animate-in zoom-in-50 duration-700" />
                    </div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter font-serif mb-2">Lots Confirmed</h3>
                    <p className="text-emerald-100 font-bold uppercase tracking-[0.3em] text-xs">Registry assignments synchronized</p>
                </div>
            )}

            <div className="relative z-10 flex flex-col gap-6 md:gap-8">
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleSpin} disabled={isSpinning || selectedParticipantIds.size === 0 || assignmentStatus === 'success'} className={`flex-[3] py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs sm:text-sm shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isSpinning || selectedParticipantIds.size === 0 || assignmentStatus === 'success' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-500/20'}`}>
                        {isSpinning ? <RefreshCw className="animate-spin" size={20}/> : <Dices size={20}/>} Spin Lots
                    </button>
                    {lotResults.length > 0 && !isSpinning && assignmentStatus === 'idle' && (
                        <div className="flex flex-[2] gap-2">
                             <button onClick={handleAssign} disabled={conflicts.size > 0} className={`flex-1 py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all flex items-center justify-center gap-2 bg-white text-emerald-600 border-2 border-emerald-100 shadow-emerald-500/5 hover:bg-emerald-50`}>
                                <CheckCircle2 size={18}/> Confirm Assignments
                            </button>
                            <button onClick={() => { setLotResults([]); setSelectedParticipantIds(new Set()); }} className="px-5 py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] bg-rose-50 dark:bg-rose-900/10 text-rose-500 border-2 border-rose-100 dark:border-rose-900/30 shadow-xl transition-all hover:bg-rose-100 active:scale-95 flex items-center justify-center" title="Cancel Lots">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
                    <div className="w-full xl:w-1/3 flex flex-col gap-6">
                        <SectionTitle title="Logic Mapping" icon={Layers} color="emerald" />
                        <div className="space-y-4">
                            <div className="relative">
                                <select disabled={assignmentStatus === 'success'} value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} className={selectClasses}>
                                    <option value="" className="dark:bg-zinc-900">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                            </div>
                            <div className="relative">
                                <select disabled={assignmentStatus === 'success'} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className={selectClasses}>
                                    <option value="" className="dark:bg-zinc-900">-- Choose Item --</option>
                                    {availableItems.map(i => <option key={i.id} value={i.id} className="dark:bg-zinc-900">{i.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                            </div>
                            <div className="flex-grow bg-zinc-50/30 dark:bg-black/20 border border-zinc-100 dark:border-white/5 rounded-[2rem] p-2 space-y-2 custom-scrollbar max-h-[300px] overflow-y-auto">
                                {participants.map(p => (
                                    <div key={p.id} onClick={() => assignmentStatus !== 'success' && toggleParticipant(p)} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedParticipantIds.has(p.id) ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-white/5 hover:border-zinc-200'} ${assignmentStatus === 'success' ? 'opacity-50' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedParticipantIds.has(p.id) ? 'bg-white border-white' : 'border-zinc-200 dark:border-zinc-800'}`}>{selectedParticipantIds.has(p.id) && <Check size={12} className="text-emerald-600" strokeWidth={4} />}</div>
                                            <div className="font-black text-xs uppercase truncate max-w-[120px]">{p.displayName}</div>
                                        </div>
                                        <div className="font-mono text-[10px] font-black tracking-widest opacity-60">#{p.chestNumber}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="w-full xl:w-2/3 flex flex-col gap-6">
                        <div className="flex-grow bg-zinc-50/50 dark:bg-black/40 rounded-3xl md:rounded-[2.5rem] border border-zinc-100 dark:border-white/5 p-6 md:p-8 overflow-y-auto custom-scrollbar shadow-inner min-h-[300px]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {lotResults.map((res) => {
                                    const isConflict = conflicts.has(res.participantId);
                                    const color = getCodeColor(res.code, isConflict);
                                    return (
                                        <div key={res.participantId} className={`relative aspect-square rounded-3xl md:rounded-[2rem] border-2 flex flex-col items-center justify-center p-4 transition-all duration-500 ${isSpinning ? 'animate-pulse' : ''} ${isConflict ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-500' : res.isLocked ? 'bg-white dark:bg-zinc-900 border-emerald-500/50' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest mb-3 truncate w-full text-center text-zinc-400">{res.name}</span>
                                            {isSpinning ? <div className="text-6xl md:text-7xl font-black tracking-tighter leading-none" style={{ color }}>{res.code}</div> : <input type="text" value={res.code === '?' ? '' : res.code} onChange={e => { const val = e.target.value.toUpperCase().substring(0,1); setLotResults(prev => prev.map(r => r.participantId === res.participantId ? { ...r, code: val || '?', isLocked: !!val } : r)); }} className="w-full bg-transparent text-center text-6xl md:text-7xl font-black tracking-tighter leading-none outline-none focus:ring-0 placeholder:text-zinc-200" style={{ color }} placeholder="?" maxLength={1}/>}
                                            {isConflict && <div className="absolute top-2 right-2 animate-pulse"><AlertTriangle size={18} className="text-rose-500"/></div>}
                                            {res.isLocked && !isConflict && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-zinc-900"><Check size={12} strokeWidth={4}/></div>}
                                        </div>
                                    );
                                })}
                                {lotResults.length === 0 && <div className="col-span-full h-full flex flex-col items-center justify-center opacity-20 py-20"><Dices size={80} strokeWidth={1} /><p className="font-black uppercase tracking-[0.3em] text-xs mt-4">Spin Lots to start</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SECTION: Bulk Participant Code Assignment ---

const BulkCodeAssigner: React.FC = () => {
    const { state, updateMultipleTabulationEntries, globalSearchTerm, globalFilters } = useFirebase();
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [manualEditId, setManualEditId] = useState<string | null>(null);

    // Check if an item has any codes assigned
    const getItemAssignedStatus = (itemId: string) => {
        if (!state) return false;
        return (state.tabulation || []).some(t => t.itemId === itemId && t.codeLetter);
    };

    // Check if an item has duplicate codes (Conflict)
    const getItemConflictStatus = (itemId: string) => {
        if (!state) return false;
        const tabs = (state.tabulation || []).filter(t => t.itemId === itemId && t.codeLetter);
        const codes = tabs.map(t => t.codeLetter);
        const uniqueCodes = new Set(codes);
        return codes.length !== uniqueCodes.size;
    };

    const filteredItems = useMemo(() => {
        if (!state) return [];
        return (state.items || []).filter(item => {
            const matchesSearch = item.name.toLowerCase().includes((globalSearchTerm || '').toLowerCase());
            const matchesCat = (globalFilters?.categoryId || []).length > 0 ? globalFilters.categoryId.includes(item.categoryId) : true;
            const matchesPerf = (globalFilters?.performanceType || []).length > 0 ? globalFilters.performanceType.includes(item.performanceType) : true;
            
            let matchesStatus = true;
            if ((globalFilters?.assignmentStatus || []).length > 0) {
                const isAssigned = getItemAssignedStatus(item.id);
                const showAssigned = globalFilters.assignmentStatus.includes('ASSIGNED');
                const showUnassigned = globalFilters.assignmentStatus.includes('UNASSIGNED');
                if (showAssigned && showUnassigned) matchesStatus = true;
                else if (showAssigned) matchesStatus = isAssigned;
                else if (showUnassigned) matchesStatus = !isAssigned;
            }

            return matchesSearch && matchesCat && matchesPerf && matchesStatus;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [state, globalSearchTerm, globalFilters]);

    // Group items by category for the requested grouping
    const groupedItems = useMemo(() => {
        if (!state) return [];
        const result: { category: any, items: Item[] }[] = [];
        (state.categories || []).forEach(cat => {
            const catItems = filteredItems.filter(i => i.categoryId === cat.id);
            if (catItems.length > 0) result.push({ category: cat, items: catItems });
        });
        return result.sort((a, b) => a.category.name.localeCompare(b.category.name));
    }, [state, filteredItems]);

    const hasAnyConflicts = useMemo(() => {
        return filteredItems.some(item => getItemConflictStatus(item.id));
    }, [filteredItems, state?.tabulation]);

    const runBatchAssign = async () => {
        if (!state || (state.codeLetters?.length || 0) === 0) return;
        const updates: TabulationEntry[] = [];
        Array.from(selectedItemIds).forEach(itemId => {
            const item = (state.items || []).find(i => i.id === itemId);
            if (!item) return;
            const enrolled = (state.participants || []).filter(p => (p.itemIds || []).includes(itemId));
            
            let targets: { id: string, categoryId: string }[] = [];
            if (item.type === ItemType.GROUP) {
                const groups: Record<string, Participant[]> = {};
                enrolled.forEach(p => {
                    const groupIdx = p.itemGroups?.[item.id] || 1;
                    const key = `${p.teamId}_${groupIdx}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                });
                targets = Object.values(groups).map(members => {
                    const leader = (members || []).find(p => p.groupLeaderItemIds?.includes(item.id)) || members[0];
                    return { id: leader.id, categoryId: item.categoryId };
                });
            } else {
                targets = enrolled.map(p => ({ id: p.id, categoryId: item.categoryId }));
            }

            const codeLetters = state.codeLetters || [];
            if (codeLetters.length === 0) return;

            targets.forEach((t, idx) => {
                const entryId = `${itemId}-${t.id}`;
                const code = codeLetters[idx % codeLetters.length]?.code || '?';
                const existing = (state.tabulation || []).find(tab => tab.id === entryId);
                updates.push(existing ? { ...existing, codeLetter: code } : {
                    id: entryId, itemId, categoryId: t.categoryId, participantId: t.id, codeLetter: code, marks: {}, finalMark: null, position: null, gradeId: null
                });
            });
        });
        await updateMultipleTabulationEntries(updates);
        setSelectedItemIds(new Set());
    };

    const runBatchClear = async () => {
        if (!state) return;
        if (!confirm(`Clear assigned codes for ${selectedItemIds.size} items?`)) return;
        const updates: TabulationEntry[] = [];
        Array.from(selectedItemIds).forEach(itemId => {
            (state.tabulation || []).filter(t => t.itemId === itemId).forEach(t => updates.push({ ...t, codeLetter: '' }));
        });
        await updateMultipleTabulationEntries(updates);
        setSelectedItemIds(new Set());
    };

    return (
        <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-[3rem] border border-amazio-primary/5 dark:border-white/5 p-8 shadow-glass-light dark:shadow-2xl relative flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-start mb-6">
                <SectionTitle title="Direct Mapping" icon={LayoutList} color="indigo" />
                {hasAnyConflicts && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full border border-rose-100 dark:border-rose-900/30 animate-pulse">
                        <AlertTriangle size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Duplicate Codes Detected</span>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col gap-6 flex-grow overflow-hidden h-full">
                {selectedItemIds.size > 0 && (
                    <div className="flex flex-col gap-3 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl animate-in slide-in-from-top-4 shrink-0">
                        <div className="flex justify-between items-center">
                            <span className="font-black text-xs uppercase tracking-widest">{selectedItemIds.size} Items Selected</span>
                            {selectedItemIds.size === 1 && (
                                <button onClick={() => setManualEditId(Array.from(selectedItemIds)[0])} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                                    <Edit2 size={16} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={runBatchAssign} className="flex-1 bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Auto-Assign</button>
                            <button onClick={runBatchClear} className="flex-1 bg-rose-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Clear Codes</button>
                        </div>
                    </div>
                )}

                <div className="overflow-y-auto flex-grow custom-scrollbar space-y-8 px-1 max-h-[500px]">
                    {groupedItems.map(group => (
                        <div key={group.category.id} className="space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-grow"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 shrink-0">{group.category.name}</span>
                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-grow"></div>
                            </div>
                            
                            <div className="space-y-2">
                                {group.items.map(item => {
                                    const isSelected = selectedItemIds.has(item.id);
                                    const isAssigned = getItemAssignedStatus(item.id);
                                    const hasConflict = getItemConflictStatus(item.id);
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedItemIds(prev => { const n = new Set(prev); if(n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })} 
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all 
                                                ${isSelected 
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-500 shadow-md scale-[1.01]' 
                                                    : isAssigned 
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
                                                        : 'bg-white dark:bg-[#121412] border-zinc-100 dark:border-white/5 hover:border-zinc-200'}`}
                                        >
                                            <div className="min-w-0 pr-4 flex-grow flex items-center gap-3">
                                                <div className="truncate">
                                                    <div className={`font-black text-xs uppercase ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : isAssigned ? 'text-emerald-800 dark:text-emerald-400' : 'text-amazio-primary dark:text-zinc-200'}`}>
                                                        {item.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[8px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{item.performanceType}</span>
                                                        {hasConflict && (
                                                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 animate-pulse">
                                                                <AlertTriangle size={10} />
                                                                <span className="text-[8px] font-black uppercase tracking-widest">Conflicting Codes</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {isAssigned && !isSelected && <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />}
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors 
                                                    ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'}`}>
                                                    {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {groupedItems.length === 0 && (
                        <div className="py-24 text-center opacity-30 italic text-[10px] uppercase font-bold border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                            <Layers size={48} strokeWidth={1} />
                            <span>No items match current filter</span>
                        </div>
                    )}
                </div>
            </div>
            {manualEditId && <ManualCodeEditorModal itemId={manualEditId} onClose={() => setManualEditId(null)} />}
        </div>
    );
};

// --- SECTION: Manual Code Editor Modal ---
const ManualCodeEditorModal: React.FC<{ itemId: string; onClose: () => void }> = ({ itemId, onClose }) => {
    const { state, updateMultipleTabulationEntries } = useFirebase();
    const [draftEntries, setDraftEntries] = useState<Record<string, string>>({});
    
    const item = (state?.items || []).find(i => i.id === itemId);
    const itemEntries = useMemo(() => {
        if (!state || !item) return [];
        const enrolled = (state.participants || []).filter(p => (p.itemIds || []).includes(itemId));
        
        if (item.type === ItemType.GROUP) {
            const groups: Record<string, Participant[]> = {};
            enrolled.forEach(p => {
                const groupIdx = p.itemGroups?.[item.id] || 1;
                const key = `${p.teamId}_${groupIdx}`;
                if(!groups[key]) groups[key] = [];
                groups[key].push(p);
            });
            return Object.values(groups).map(members => {
                let leader = (members || []).find(p => p.groupLeaderItemIds?.includes(item.id)) || members[0];
                const tab = (state.tabulation || []).find(t => t.itemId === itemId && t.participantId === leader.id);
                return { 
                    id: leader.id, 
                    name: `${leader.name} & Party`, 
                    chestNumber: leader.groupChestNumbers?.[item.id] || leader.chestNumber, 
                    codeLetter: tab?.codeLetter || '' 
                };
            });
        }

        return (enrolled || []).map(p => {
            const tab = (state.tabulation || []).find(t => t.itemId === itemId && t.participantId === p.id);
            return { id: p.id, name: p.name, chestNumber: p.chestNumber, codeLetter: tab?.codeLetter || '' };
        });
    }, [state, itemId, item]);

    useEffect(() => {
        const initial: Record<string, string> = {};
        (itemEntries || []).forEach(e => initial[e.id] = e.codeLetter);
        setDraftEntries(initial);
    }, [itemEntries]);

    const hasConflict = useMemo(() => {
        const codes = Object.values(draftEntries).filter(c => c !== '');
        return codes.length !== new Set(codes).size;
    }, [draftEntries]);

    const handleSave = async () => {
        if (!state || !item) return;
        if (hasConflict && !confirm("Warning: Duplicate code letters detected. Participants within the same item should have unique codes. Save anyway?")) return;
        
        const updates = Object.entries(draftEntries).map(([pid, code]) => {
            const entryId = `${itemId}-${pid}`;
            const existing = (state.tabulation || []).find(t => t.id === entryId);
            return existing ? { ...existing, codeLetter: code } : {
                id: entryId, itemId, categoryId: item.categoryId, participantId: pid, codeLetter: code, marks: {}, finalMark: null, position: null, gradeId: null
            };
        });
        await updateMultipleTabulationEntries(updates as any);
        onClose();
    };

    if (!item) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl text-white"><Edit2 size={18}/></div>
                        <div><h3 className="text-xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">{item.name}</h3><p className="text-[10px] font-black uppercase text-zinc-400 mt-1 tracking-widest">Manual Code Assignment</p></div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl"><X size={20} className="text-zinc-500"/></button>
                </div>

                {hasConflict && (
                    <div className="px-6 py-3 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-900/30 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Duplicate code assignment detected</span>
                    </div>
                )}

                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-3">
                    {itemEntries.map(e => {
                        const isDuplicate = Object.values(draftEntries).filter(c => c !== '' && c === draftEntries[e.id]).length > 1;
                        return (
                            <div key={e.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDuplicate ? 'bg-rose-50/30 dark:bg-rose-900/10 border-rose-500/40' : 'bg-zinc-50 dark:bg-black/20 border-zinc-100 dark:border-white/5'}`}>
                                <div className="min-w-0 pr-4">
                                    <div className={`font-black text-sm uppercase tracking-tight truncate ${isDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-amazio-primary dark:text-zinc-100'}`}>
                                        {e.name}
                                    </div>
                                    <div className="text-[10px] font-mono font-black text-zinc-400 mt-0.5">#{e.chestNumber}</div>
                                </div>
                                <input 
                                    type="text" 
                                    value={draftEntries[e.id] || ''} 
                                    onChange={ev => setDraftEntries(prev => ({ ...prev, [e.id]: ev.target.value.toUpperCase().substring(0, 1) }))} 
                                    className={`w-14 h-12 rounded-xl bg-white dark:bg-zinc-800 border-2 text-center font-black text-lg outline-none focus:ring-4 transition-all
                                        ${isDuplicate ? 'border-rose-500 text-rose-600 focus:ring-rose-500/10' : 'border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500/10'}`} 
                                    placeholder="?" 
                                    maxLength={1}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="p-7 border-t border-white/5 bg-zinc-50 dark:bg-white/[0.02] flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Discard</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amazio-primary/20 active:scale-95 transition-all">Save Changes</button>
                </div>
            </div>
        </div>, document.body
    );
};

// --- SECTION: Code Registry ---

const CodeRegistry: React.FC = () => {
    const { state, addCodeLetter, addMultipleCodeLetters, deleteCodeLetter, deleteMultipleCodeLetters, updateLotPool } = useFirebase();
    const [inputValue, setInputValue] = useState('');
    const [showPresets, setShowPresets] = useState(false);

    const allCodes = useMemo(() => [...(state?.codeLetters || [])].sort((a,b) => a.code.localeCompare(b.code)), [state?.codeLetters]);
    const lotCodes = useMemo(() => new Set(state?.lotPool || []), [state?.lotPool]);

    const handleSave = () => {
        const trimmed = inputValue.trim().toUpperCase().substring(0, 1);
        if (!trimmed || !/^[A-Z0-9]$/.test(trimmed)) { alert("Enter a character."); return; }
        if (allCodes.some(c => c.code === trimmed)) { alert("Registered."); return; }
        addCodeLetter({ id: `c_${trimmed}_${Date.now()}`, code: trimmed, type: 'General' });
        setInputValue('');
    };

    const handleBulkAdd = async (type: 'AZ' | '09') => {
        const chars = type === 'AZ' ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "0123456789";
        const existing = new Set(allCodes.map(c => c.code));
        const newCodes = chars.split('').filter(c => !existing.has(c)).map((c, idx) => ({ id: `c_${c}_${Date.now()}_${idx}`, code: c, type: 'General' as const }));
        if (newCodes.length > 0) await addMultipleCodeLetters(newCodes as CodeLetter[]);
        setShowPresets(false);
    };

    return (
        <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-8 shadow-glass-light dark:shadow-2xl h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-6">
                <SectionTitle title="Identity Registry" icon={Hash} color="rose" />
                <div className="flex gap-2">
                    <button onClick={() => setShowPresets(!showPresets)} className="p-2 text-zinc-400 hover:text-indigo-500 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-100 dark:border-white/5 transition-all"><Zap size={18}/></button>
                    <button onClick={() => { if(confirm("Purge?")) deleteMultipleCodeLetters((allCodes || []).map(c => c.id)); }} className="p-2 text-zinc-400 hover:text-rose-500 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-100 dark:border-white/5 transition-all"><Trash2 size={18}/></button>
                </div>
            </div>

            {showPresets && (
                <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex flex-wrap gap-2 animate-in slide-in-from-top-2">
                    <span className="text-[10px] font-black uppercase text-indigo-500 w-full mb-1 ml-1">Quick Presets</span>
                    <button onClick={() => handleBulkAdd('AZ')} className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-[10px] font-bold border border-indigo-200 uppercase tracking-widest">A-Z</button>
                    <button onClick={() => handleBulkAdd('09')} className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-[10px] font-bold border border-indigo-200 uppercase tracking-widest">0-9</button>
                </div>
            )}

            <div className="space-y-6 flex-grow overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 bg-zinc-50/50 dark:bg-white/[0.02] p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 shrink-0">
                    <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleSave()} className="flex-grow p-4 rounded-xl bg-white dark:bg-zinc-900 uppercase font-black text-center text-3xl outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-0" placeholder="?" maxLength={1} />
                    <button onClick={handleSave} className="px-6 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all whitespace-nowrap">Register</button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-7 gap-3 overflow-y-auto flex-grow custom-scrollbar p-1">
                    {(allCodes || []).map((c, index) => (
                        <div key={c.id || `code_${c.code || index}_${index}`} className="relative group aspect-square">
                            <div onClick={() => { const s = new Set(lotCodes); if(s.has(c.code)) s.delete(c.code); else s.add(c.code); updateLotPool(Array.from(s).sort()); }} className={`w-full h-full rounded-2xl flex items-center justify-center font-black text-3xl border cursor-pointer select-none transition-all duration-500 ${lotCodes.has(c.code) ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.05]' : 'bg-white dark:bg-zinc-900/40 text-zinc-300 dark:text-zinc-600 border-zinc-100 dark:border-white/5 hover:border-zinc-300'}`}>{c.code}</div>
                            <button onClick={(e) => { e.stopPropagation(); deleteCodeLetter(c.id); }} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={10} strokeWidth={4}/></button>
                        </div>
                    ))}
                    {allCodes.length === 0 && <div className="col-span-full py-12 text-center opacity-20 italic text-[10px] uppercase font-bold border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">Awaiting registration</div>}
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-white/5 shrink-0">
                <div className="flex items-start gap-3"><Info size={14} className="text-zinc-400 shrink-0 mt-0.5" /><p className="text-[9px] text-zinc-500 leading-relaxed font-bold uppercase tracking-widest">Tap a code to toggle its availability in the Lot System. Colored codes are eligible for spinning.</p></div>
            </div>
        </div>
    );
};

// --- SECTION: Points Rules (Grades & Prizes) ---

const GlobalPrizeEditor: React.FC<{ type: 'single' | 'group' }> = ({ type }) => {
    const { state, updateSettings } = useFirebase();
    const defaults = state?.settings.defaultPoints[type] || { first: 0, second: 0, third: 0 };
    
    const handleChange = (key: 'first' | 'second' | 'third', val: string) => {
        const next = { ...defaults, [key]: +val };
        updateSettings({ defaultPoints: { ...state?.settings.defaultPoints, [type]: next } });
    };

    return (
        <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-white/[0.01] border border-zinc-100 dark:border-zinc-800">
            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                <Trophy size={14} className="text-amber-500"/> Global {type} Prizes
            </h4>
            <div className="grid grid-cols-3 gap-4">
                {[
                    { k: 'first', l: '1st', c: 'text-amber-500' },
                    { k: 'second', l: '2nd', c: 'text-slate-400' },
                    { k: 'third', l: '3rd', c: 'text-orange-500' }
                ].map(p => (
                    <div key={p.k} className="space-y-1">
                        <span className={`block text-[8px] font-black uppercase text-center ${p.c}`}>{p.l}</span>
                        <input 
                            type="number" 
                            value={(defaults as any)[p.k] ?? 0} 
                            onChange={e => handleChange(p.k as any, e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border text-center font-black text-sm"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const GradeRuleEditor: React.FC<{ itemType: 'single' | 'group' }> = ({ itemType }) => {
    const { state, addGrade, updateGrade, deleteGrade } = useFirebase();
    const grades = state?.gradePoints[itemType] || [];
    const [formData, setFormData] = useState<Omit<Grade, 'id'>>({ name: '', lowerLimit: 0, upperLimit: 100, points: 0 });
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name) return;
        if (editingId) { updateGrade({ itemType, grade: { ...formData, id: editingId } }); setEditingId(null); } 
        else { addGrade({ itemType, grade: formData }); }
        setFormData({ name: '', lowerLimit: 0, upperLimit: 100, points: 0 }); 
    };

    return (
        <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-8 shadow-glass-light dark:shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif font-black text-lg text-amazio-primary dark:text-white uppercase tracking-tighter capitalize">Global {itemType} Grade Tiers</h3>
                <span className="px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest border">
                    {grades.length} Active
                </span>
            </div>
            <GradeRangeVisualizer grades={grades} min={0} max={100} />
            <div className="mt-8 space-y-3">
                {[...grades].sort((a,b) => b.lowerLimit - a.lowerLimit).map((grade) => {
                    const colors = getGradeColor(grade.name);
                    return (
                        <div key={grade.id} className={`group flex items-center justify-between p-4 rounded-3xl transition-all ${colors.light}`}>
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg ${colors.bg}`}>{grade.name.charAt(0)}</div>
                                <div>
                                    <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest opacity-60">Range</div>
                                    <div className="font-mono font-black text-amazio-primary dark:text-zinc-200 text-lg">{grade.lowerLimit}% - {grade.upperLimit}%</div>
                                </div>
                                <div className="text-right ml-4">
                                    <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest opacity-60">Pts</div>
                                    <div className={`font-black text-lg ${colors.text}`}>{grade.points}</div>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { setFormData(grade); setEditingId(grade.id); }} className="p-2 text-zinc-400 hover:text-emerald-600"><Edit2 size={16}/></button>
                                <button onClick={() => deleteGrade({itemType, gradeId: grade.id})} className="p-2 text-zinc-400 hover:text-rose-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSave} className="mt-8 p-6 rounded-[2rem] bg-zinc-50/50 dark:bg-white/[0.01] border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <input type="text" placeholder="Grade" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl p-3 text-sm font-bold border border-zinc-200 dark:border-zinc-700 outline-none bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20" required/>
                    <input type="number" placeholder="Min %" value={formData.lowerLimit ?? 0} onChange={e => setFormData({...formData, lowerLimit: +e.target.value})} className="w-full rounded-xl p-3 text-sm font-bold border border-zinc-200 dark:border-zinc-700 outline-none bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20"/>
                    <input type="number" placeholder="Max %" value={formData.upperLimit ?? 100} onChange={e => setFormData({...formData, upperLimit: +e.target.value})} className="w-full rounded-xl p-3 text-sm font-bold border border-zinc-200 dark:border-zinc-700 outline-none bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20"/>
                    <input type="number" placeholder="Pts" value={formData.points ?? 0} onChange={e => setFormData({...formData, points: +e.target.value})} className="w-full rounded-xl p-3 text-sm font-bold border border-zinc-200 dark:border-zinc-700 outline-none bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20"/>
                </div>
                <button type="submit" className="w-full py-4 bg-amazio-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    {editingId ? 'Update Range' : 'Add Rule'}
                </button>
            </form>
        </div>
    );
};

const ItemOverrideSection: React.FC = () => {
    const { state, globalSearchTerm, globalFilters } = useFirebase();
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        if (!state) return [];
        return (state.items || []).filter(i => {
            const matchSearch = (i.name || '').toLowerCase().includes((globalSearchTerm || '').toLowerCase());
            const matchCat = (globalFilters.categoryId?.length || 0) > 0 ? (globalFilters.categoryId || []).includes(i.categoryId) : true;
            return matchSearch && matchCat;
        }).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    }, [state, globalSearchTerm, globalFilters]);

    if (!state) return null;

    const selectedItem = (state.items || []).find(i => i.id === selectedItemId);

    return (
        <Card title="Item Point Overrides" action={<span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filteredItems.length} Scopes</span>}>
            <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-4">
                    <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">
                        Use the global header search/filter to narrow down items. Tap an item below to refine its specific prize and grade point values.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar p-1">
                    {(filteredItems || []).map(item => {
                        const hasOverrides = (item.gradePointsOverride && Object.keys(item.gradePointsOverride).length > 0);
                        const isCustomPrizes = JSON.stringify(item.points) !== JSON.stringify(state.settings?.defaultPoints?.[item.type === ItemType.SINGLE ? 'single' : 'group'] || {});
                        
                        return (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedItemId(item.id)}
                                className={`p-5 rounded-[2rem] border transition-all cursor-pointer group flex flex-col justify-between ${selectedItemId === item.id ? 'bg-indigo-500 border-indigo-400 shadow-xl' : 'bg-white dark:bg-[#121412] border-zinc-100 dark:border-white/5 hover:border-zinc-300'}`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${selectedItemId === item.id ? 'bg-white/20 text-white border-white/30 border' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                                            {(state.categories || []).find(c => c.id === item.categoryId)?.name}
                                        </div>
                                        {(hasOverrides || isCustomPrizes) && <Star size={12} className={selectedItemId === item.id ? 'text-white' : 'text-amber-500'} fill="currentColor"/>}
                                    </div>
                                    <h4 className={`text-sm font-black uppercase tracking-tight truncate ${selectedItemId === item.id ? 'text-white' : 'text-amazio-primary dark:text-zinc-100'}`}>
                                        {item.name}
                                    </h4>
                                </div>
                                <div className={`mt-4 pt-3 border-t flex justify-between items-center ${selectedItemId === item.id ? 'border-white/10' : 'border-zinc-50 dark:border-zinc-800'}`}>
                                    <div className="flex gap-2">
                                        <div className={`text-[10px] font-black ${selectedItemId === item.id ? 'text-white' : 'text-amber-500'}`}>{item.points.first} <span className="opacity-50 tracking-tighter">1ST</span></div>
                                        <div className={`text-[10px] font-black ${selectedItemId === item.id ? 'text-white' : 'text-slate-400'}`}>{item.points.second} <span className="opacity-50 tracking-tighter">2ND</span></div>
                                        <div className={`text-[10px] font-black ${selectedItemId === item.id ? 'text-white' : 'text-orange-500'}`}>{item.points.third} <span className="opacity-50 tracking-tighter">3RD</span></div>
                                    </div>
                                    <Edit2 size={12} className={selectedItemId === item.id ? 'text-white' : 'text-zinc-300 group-hover:text-indigo-500'} />
                                </div>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && <div className="col-span-full py-12 text-center opacity-30 italic text-xs uppercase font-bold tracking-[0.2em]">No items match current filter</div>}
                </div>
            </div>
            {selectedItemId && selectedItem && (
                <ItemPointOverrideModal 
                    item={selectedItem} 
                    onClose={() => setSelectedItemId(null)} 
                    grades={selectedItem.type === ItemType.SINGLE ? state.gradePoints.single : state.gradePoints.group}
                />
            )}
        </Card>
    );
};

const GradePoints: React.FC = () => {
    const { state, gradeSubView: activeView } = useFirebase();
    if (!state) return null;
    return (
        <div className="space-y-10 pb-24 animate-in fade-in duration-700 relative">
            <div className="hidden md:flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h2 className="text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Points Rules</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-medium text-lg italic">Configure scoring heuristics and identity registries.</p>
                </div>
            </div>
            <div className="animate-in slide-in-from-bottom-4 duration-700">
                {activeView === 'CODES' ? (
                    <div className="space-y-10">
                        <LotMachine />
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <CodeRegistry />
                            <BulkCodeAssigner />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Global Defaults */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <GlobalPrizeEditor type="single" />
                            <GlobalPrizeEditor type="group" />
                        </div>
                        {/* Grade Tiers */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <GradeRuleEditor itemType="single" />
                            <GradeRuleEditor itemType="group" />
                        </div>
                        {/* Item Overrides */}
                        <ItemOverrideSection />
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradePoints;