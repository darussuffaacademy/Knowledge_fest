
import { AlertTriangle, ArrowLeft, Award, Calculator, Check, CheckCircle2, ChevronDown, ClipboardEdit, Clock, Edit3, Eye, FileText, Filter, LayoutGrid, Lock, LockOpen, Medal, Megaphone, Save, Search, ShieldAlert, Sparkles, Star, Tag, Trash2, Trophy, UploadCloud, User, UserCheck, Users, X, RefreshCw } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Card from '../components/Card';
import { useFirebase } from '../hooks/useFirebase';
import { Grade, Item, ItemType, Participant, PerformanceType, Result, ResultStatus, TabulationEntry, UserRole, Judge } from '../types';

interface ScoredParticipant {
    participantId: string;
    participantName: string;
    chestNumber: string;
    place?: string;
    teamName: string;
    marks: { [judgeId: string]: number | null };
    finalMark: number;
    rank: number;
    prizePoints: number;
    grade: Grade | undefined;
    gradePoints: number;
    totalPoints: number;
    isGroup: boolean;
    members?: Participant[];
    contributesToIndividualTally: boolean; 
    codeLetter: string;
}

const MANUAL_OVERRIDE_ID = 'manual_admin_override';

// --- Color Helpers ---
const ART_FEST_PALETTE = ['#006994', '#d4a574', '#1b5e20', '#80deea'];

const getCategoryColor = (str: string) => {
    if (!str) return ART_FEST_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return ART_FEST_PALETTE[Math.abs(hash) % ART_FEST_PALETTE.length];
};

const getTypeColor = (type: ItemType) => type === ItemType.SINGLE ? '#d4a574' : '#1b5e20';
const getPerformanceColor = (perf: PerformanceType) => perf === PerformanceType.ON_STAGE ? '#006994' : '#80deea';

// --- ResultCard Component ---
interface ResultCardProps {
    item: Item;
    result: Result | undefined;
    status: ResultStatus;
    categoryName: string;
    onEdit: () => void;
    onUnlock?: (item: Item) => void;
    onDeclare?: (item: Item) => void;
    onUpdateTally?: (item: Item) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ item, result, status, categoryName, onEdit, onUnlock, onDeclare, onUpdateTally }) => {
    const isDeclared = status === ResultStatus.DECLARED;
    const isUpdated = status === ResultStatus.UPDATED;
    const isDraft = status === ResultStatus.UPLOADED;
    
    const catColor = getCategoryColor(categoryName);
    const typeColor = getTypeColor(item.type);
    const perfColor = getPerformanceColor(item.performanceType);

    const getStatusInfo = () => {
        if (isDeclared) return {
            label: 'Declared',
            icon: <CheckCircle2 size={10} strokeWidth={3} />,
            class: 'bg-emerald-500 text-white border-emerald-400'
        };
        if (isUpdated) return {
            label: 'Updated',
            icon: <RefreshCw size={10} strokeWidth={3} />,
            class: 'bg-indigo-500 text-white border-indigo-400'
        };
        if (isDraft) return {
            label: 'Drafted',
            icon: <ClipboardEdit size={10} strokeWidth={3} />,
            class: 'bg-amber-500 text-white border-amber-400'
        };
        return {
            label: 'Pending',
            icon: <Clock size={10} strokeWidth={3} />,
            class: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
        };
    };

    const statusInfo = getStatusInfo();

    return (
        <div className={`group relative flex flex-col h-full rounded-[1rem] sm:rounded-[1.5rem] border-2 transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-[#121412] ${isDeclared ? 'border-emerald-500/20' : isUpdated ? 'border-indigo-500/20' : 'border-zinc-100 dark:border-white/5 hover:border-zinc-200'}`}>
            <div className="p-3 sm:p-4 pb-1 sm:pb-1.5 flex justify-between items-center">
                <div className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 transition-all ${statusInfo.class}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                </div>
                {isDeclared && onUnlock && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUnlock(item); }} 
                        className="p-1.5 rounded-lg text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 transition-all hover:scale-105 active:scale-95"
                    >
                        <LockOpen size={12} strokeWidth={3} />
                    </button>
                )}
            </div>

            <div className="p-3 sm:p-4 pt-1 sm:pt-1 flex-grow flex flex-col">
                <div className="mb-2">
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mb-0.5`} style={{ color: catColor }}>
                        {categoryName}
                    </p>
                    <h3 className="text-sm sm:text-base font-black font-serif uppercase tracking-tight leading-tight text-amazio-primary dark:text-zinc-100 line-clamp-2">
                        {item.name}
                    </h3>
                </div>

                <div className="flex flex-wrap gap-1 mt-auto">
                    <span 
                        className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter border"
                        style={{ backgroundColor: perfColor + '10', color: perfColor, borderColor: perfColor + '20' }}
                    >
                        {item.performanceType}
                    </span>
                    <span 
                        className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter border"
                        style={{ backgroundColor: typeColor + '10', color: typeColor, borderColor: typeColor + '20' }}
                    >
                        {item.type}
                    </span>
                </div>
            </div>

            <div className="p-3 sm:p-4 pt-0 mt-1 border-t border-zinc-50 dark:border-white/5 pt-3 sm:pt-4">
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={onEdit}
                        className="flex-grow py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1 bg-amazio-primary text-white hover:opacity-95"
                    >
                        {isDeclared ? <Eye size={12}/> : <Edit3 size={12}/>}
                        {isDeclared ? 'View' : 'Score'}
                    </button>
                    {onUpdateTally && !isDeclared && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onUpdateTally(item); }}
                            className={`px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black uppercase tracking-wider text-[8px] sm:text-[9px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                isUpdated 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white'
                            }`}
                            title="Push Internal Update / Recalculate Points"
                        >
                            <UploadCloud size={13} strokeWidth={2.5} />
                            <span className="hidden sm:inline">Update</span>
                        </button>
                    )}
                    {onDeclare && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeclare(item); }}
                            className={`px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black uppercase tracking-wider text-[8px] sm:text-[9px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                isDeclared 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                            }`}
                            title={isDeclared ? "Re-Declare Result" : "Declare Official Result"}
                        >
                            <Calculator size={13} strokeWidth={2.5} />
                            <span className="hidden sm:inline">{isDeclared ? 'Re-Declare' : 'Declare'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- ScoringTable Component ---
const ScoringTable: React.FC<{
    participants: ScoredParticipant[];
    judgeIds: string[];
    isLocked: boolean;
    isJudge: boolean;
    isManager: boolean;
    currentJudgeId?: string;
    onMarkChange: (pid: string, jid: string, val: string) => void;
    state: any;
}> = ({ participants, judgeIds, isLocked, isJudge, isManager, currentJudgeId, onMarkChange, state }) => {
    return (
        <div className={`bg-white dark:bg-[#121412] rounded-[2rem] border border-zinc-100 dark:border-white/5 shadow-glass-light dark:shadow-2xl overflow-hidden animate-in fade-in duration-500`}>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/80 dark:bg-black/40 backdrop-blur-md border-b border-zinc-100 dark:border-white/5">
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center w-24">Entry</th>
                            {!isJudge && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-24">Chest#</th>}
                            {!isJudge && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Identity</th>}
                            {isJudge && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Anonymous Entry Reference</th>}
                            {judgeIds.map(jid => (
                                <th key={jid} className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center w-32">
                                    {jid === MANUAL_OVERRIDE_ID ? 'Admin Override' : (state.judges.find((j: Judge)=>j.id===jid)?.name || 'Judge')}
                                </th>
                            ))}
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center w-28">Mean %</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right w-40">Standing</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-white/5">
                        {participants.map(sp => (
                            <tr key={sp.participantId} className={`group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors ${sp.rank === 1 ? 'bg-amber-50/30 dark:bg-amber-500/[0.03]' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">{sp.codeLetter}</span>
                                    </div>
                                </td>
                                {!isJudge && (
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono font-black text-zinc-500 dark:text-zinc-400">
                                            #{sp.chestNumber}
                                        </span>
                                    </td>
                                )}
                                <td className="px-6 py-4 min-w-[200px]">
                                    {!isJudge ? (
                                        <>
                                            <div className="font-black text-sm uppercase text-amazio-primary dark:text-zinc-100 truncate">{sp.participantName}</div>
                                            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">{sp.teamName}</div>
                                        </>
                                    ) : (
                                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Registry ID: {sp.codeLetter}</div>
                                    )}
                                </td>
                                {judgeIds.map(jid => (
                                    <td key={jid} className="px-4 py-4">
                                        <div className="flex justify-center">
                                            <input 
                                                type="number"
                                                inputMode="decimal"
                                                min="0" max="100" step="0.1"
                                                disabled={(isLocked && !isManager) || (isJudge && jid !== currentJudgeId)}
                                                value={sp.marks[jid] ?? ''}
                                                onChange={e => onMarkChange(sp.participantId, jid, e.target.value)}
                                                className={`w-20 h-10 text-center font-black rounded-xl border transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${(isLocked && !isManager) || (isJudge && jid !== currentJudgeId) ? 'bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 border-transparent' : 'bg-zinc-50 dark:bg-black/40 border-zinc-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-300'}`}
                                                placeholder="--"
                                            />
                                        </div>
                                    </td>
                                ))}
                                <td className="px-6 py-4">
                                    <div className="text-center font-black text-lg text-zinc-900 dark:text-white tabular-nums">
                                        {sp.finalMark.toFixed(1)}%
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end items-center gap-2">
                                        {sp.grade && (
                                            <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[9px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">
                                                Tier {sp.grade.name}
                                            </span>
                                        )}
                                        {sp.rank > 0 && (
                                            <span className={`px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-sm ${sp.rank === 1 ? 'bg-amber-400 text-amber-950' : sp.rank === 2 ? 'bg-slate-200 text-slate-700' : sp.rank === 3 ? 'bg-orange-200 text-orange-800' : ''}`}>
                                                Rank {sp.rank}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Page Component ---

const JudgementPage: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
    const { 
        state, 
        currentUser, 
        globalFilters, 
        globalSearchTerm, 
        updateTabulationEntry, 
        updateMultipleTabulationEntries, 
        deleteEventTabulation, 
        saveResult 
    } = useFirebase();
    
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | ResultStatus>('ALL');

    const [confirmModal, setConfirmModal] = useState<{
        type: 'DECLARE' | 'UPDATE' | 'UNLOCK';
        item: Item;
        scoring: ScoredParticipant[];
    } | null>(null);

    const [toast, setToast] = useState<{
        type: 'success' | 'info' | 'warning' | 'error';
        message: string;
    } | null>(null);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4500);
        return () => clearTimeout(timer);
    }, [toast]);

    const isJudge = currentUser?.role === UserRole.JUDGE;
    const isManager = !currentUser || currentUser?.role === UserRole.MANAGER;
    const judgeId = currentUser?.judgeId;

    const selectedItem = useMemo(() => state?.items.find(i => i.id === selectedItemId), [state, selectedItemId]);
    const selectedItemResult = useMemo(() => state?.results.find(r => r.itemId === selectedItemId), [state, selectedItemId]);
    const isDeclared = selectedItemResult?.status === ResultStatus.DECLARED;
    const isUpdated = selectedItemResult?.status === ResultStatus.UPDATED;
    const isDraft = selectedItemResult?.status === ResultStatus.UPLOADED;
    
    // UPDATED: Judges are only locked if a manager has DECLARED or UPDATED the result.
    // They can still edit their own column in UPLOADED (Draft) mode.
    const isLocked = isDeclared || isUpdated;

    const filteredItems = useMemo(() => {
        if (!state) return [];
        let list = state.items.filter(item => {
            const result = state.results.find(r => r.itemId === item.id);
            const currentStatus = result?.status || ResultStatus.NOT_UPLOADED;
            const matchesSearch = item.name.toLowerCase().includes(globalSearchTerm.toLowerCase());
            const matchesCat = globalFilters.categoryId.length > 0 ? globalFilters.categoryId.includes(item.categoryId) : true;
            const matchesPerf = globalFilters.performanceType.length > 0 ? globalFilters.performanceType.includes(item.performanceType) : true;
            const matchesStatus = globalFilters.status.length > 0 ? globalFilters.status.includes(currentStatus) : true;
            const matchesTabFilter = statusFilter === 'ALL' || currentStatus === statusFilter;
            const assignment = state.judgeAssignments.find(a => a.itemId === item.id);
            const isAssigned = isJudge ? assignment?.judgeIds.includes(judgeId!) : true;
            return matchesSearch && matchesCat && matchesPerf && matchesStatus && matchesTabFilter && isAssigned;
        });
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [state, globalSearchTerm, globalFilters, statusFilter, isJudge, judgeId]);

    const getScoringForItem = useCallback((item: Item, currentTabulation: TabulationEntry[]) => {
        if (!state) return [];
        const gradesConfig = item.type === ItemType.SINGLE ? (state.gradePoints?.single || []) : (state.gradePoints?.group || []);
        const enrolled = state.participants.filter(p => p.itemIds.includes(item.id));
        
        let entities: { id: string, name: string, chestNumber: string, teamId: string, isGroup: boolean }[] = [];
        if (item.type === ItemType.GROUP) {
            const groups: Record<string, Participant[]> = {};
            enrolled.forEach(p => {
                const groupIdx = p.itemGroups?.[item.id] || 1;
                const key = `${p.teamId}_${groupIdx}`;
                if(!groups[key]) groups[key] = [];
                groups[key].push(p);
            });
            entities = Object.values(groups).map(members => {
                let leader = members.find(p => p.groupLeaderItemIds?.includes(item.id)) || members[0];
                return {
                    id: leader.id,
                    name: `${leader.name} & Party`,
                    chestNumber: leader.groupChestNumbers?.[item.id] || leader.chestNumber,
                    teamId: leader.teamId,
                    isGroup: true
                };
            });
        } else {
            entities = enrolled.map(p => ({
                id: p.id,
                name: p.name,
                chestNumber: p.chestNumber,
                teamId: p.teamId,
                isGroup: false
            }));
        }

        const scores = entities.map(entity => {
            const tab = currentTabulation.find(t => t.itemId === item.id && t.participantId === entity.id);
            const team = state.teams.find(t => t.id === entity.teamId);
            const marks = tab?.marks || {};
            const validMarks = Object.values(marks).filter(m => m !== null && m !== undefined && !isNaN(m as number)) as number[];
            const finalMark = validMarks.length > 0 ? validMarks.reduce((a,b) => a+b,0) / validMarks.length : 0;
            const grade = gradesConfig.find(g => finalMark >= g.lowerLimit && finalMark <= g.upperLimit);
            const gradePoints = grade ? (item.gradePointsOverride?.[grade.id] ?? (grade.points || 0)) : 0;
            return {
                participantId: entity.id,
                participantName: entity.name,
                chestNumber: entity.chestNumber,
                teamName: team?.name || 'N/A',
                marks: marks,
                finalMark: finalMark,
                grade: grade,
                gradePoints: gradePoints,
                isGroup: entity.isGroup,
                codeLetter: tab?.codeLetter || '?',
                rank: 0, prizePoints: 0, totalPoints: 0
            };
        });

        const sorted = [...scores].sort((a,b) => b.finalMark - a.finalMark);
        const uniqueMarks = [...new Set(sorted.map(s => s.finalMark).filter(m => m > 0))].sort((a,b) => b-a);
        
        return sorted.map(score => {
            let rank = 0;
            let prizePoints = 0;
            if (score.finalMark > 0) {
                const markRank = uniqueMarks.indexOf(score.finalMark) + 1;
                if (markRank <= 3) {
                    rank = markRank;
                    if (rank === 1) prizePoints = item.points?.first || 0;
                    else if (rank === 2) prizePoints = item.points?.second || 0;
                    else if (rank === 3) prizePoints = item.points?.third || 0;
                }
            }
            return { ...score, rank, prizePoints, totalPoints: prizePoints + score.gradePoints, contributesToIndividualTally: !score.isGroup };
        }).sort((a,b) => (a.codeLetter || '').localeCompare(b.codeLetter || ''));
    }, [state]);

    const scoredParticipants = useMemo(() => {
        if (!selectedItem || !state) return [];
        return getScoringForItem(selectedItem, state.tabulation);
    }, [selectedItem, state, getScoringForItem]);

    const handleMarkChange = async (participantId: string, judgeKey: string, val: string) => {
        if (!selectedItem || (isLocked && !isManager) || (isJudge && judgeKey !== judgeId)) return;
        const mark = val === '' ? null : parseFloat(val);
        if (mark !== null && (mark < 0 || mark > 100)) return;
        const entryId = `${selectedItem.id}-${participantId}`;
        const existing = state?.tabulation.find(t => t.id === entryId);
        const marks = { ...(existing?.marks || {}), [judgeKey]: mark };
        
        const nextTab: TabulationEntry = {
            id: entryId, itemId: selectedItem.id, categoryId: selectedItem.categoryId,
            participantId: participantId, marks: marks, codeLetter: existing?.codeLetter || '',
            finalMark: null, position: null, gradeId: null
        };

        await updateTabulationEntry(nextTab);

        // Auto-update declared/updated results if manager edits
        if ((isDeclared || isUpdated) && isManager && state) {
            const simulatedTabs = (state.tabulation || []).map(t => t.id === entryId ? nextTab : t);
            const foundInSim = simulatedTabs.find(t => t.id === entryId);
            if (foundInSim) foundInSim.marks = marks;

            const scoring = getScoringForItem(selectedItem, simulatedTabs);
            const winners = scoring.map(sp => ({
                participantId: sp.participantId, position: sp.rank > 0 ? sp.rank : null, mark: sp.finalMark, gradeId: sp.grade?.id || null
            }));
            await saveResult({ itemId: selectedItem.id, categoryId: selectedItem.categoryId, status: selectedItemResult?.status || ResultStatus.DECLARED, winners });
        }
    };

    const podiumWinners = useMemo(() => {
        if (!confirmModal) return [];
        return [...confirmModal.scoring]
            .filter(s => s.rank > 0)
            .sort((a, b) => a.rank - b.rank);
    }, [confirmModal]);

    const openDeclareModal = (targetItem: Item) => {
        if (!state) return;
        const scoring = getScoringForItem(targetItem, state.tabulation || []);
        if (scoring.length === 0) {
            setToast({ type: 'warning', message: `Cannot declare "${targetItem.name}": No enrolled participants registered.` });
            return;
        }
        setConfirmModal({
            type: 'DECLARE',
            item: targetItem,
            scoring
        });
    };

    const openUpdateModal = (targetItem: Item) => {
        if (!state) return;
        const scoring = getScoringForItem(targetItem, state.tabulation || []);
        if (scoring.length === 0) {
            setToast({ type: 'warning', message: `Cannot update "${targetItem.name}": No enrolled participants registered.` });
            return;
        }
        setConfirmModal({
            type: 'UPDATE',
            item: targetItem,
            scoring
        });
    };

    const openUnlockModal = (targetItem: Item) => {
        if (!state) return;
        const scoring = getScoringForItem(targetItem, state.tabulation || []);
        setConfirmModal({
            type: 'UNLOCK',
            item: targetItem,
            scoring
        });
    };

    const executeDeclare = async (item: Item, scoringList?: ScoredParticipant[]) => {
        if (!state) return;
        const scoring = scoringList || getScoringForItem(item, state.tabulation || []);
        if (scoring.length === 0) {
            setToast({ type: 'warning', message: `No participants enrolled in "${item.name}".` });
            return;
        }
        setIsSaving(true);
        try {
            const winners = scoring.map(sp => ({
                participantId: sp.participantId,
                position: sp.rank > 0 ? sp.rank : null,
                mark: sp.finalMark,
                gradeId: sp.grade?.id || null
            }));

            await saveResult({
                itemId: item.id,
                categoryId: item.categoryId,
                status: ResultStatus.DECLARED,
                winners
            });

            // Sync tabulation entries with computed final mark, rank, and grade
            if (updateMultipleTabulationEntries) {
                const updatedTabs: TabulationEntry[] = [];
                scoring.forEach(sp => {
                    const entryId = `${item.id}-${sp.participantId}`;
                    const existing = (state.tabulation || []).find(t => t.id === entryId);
                    updatedTabs.push({
                        id: entryId,
                        itemId: item.id,
                        categoryId: item.categoryId,
                        participantId: sp.participantId,
                        marks: existing?.marks || sp.marks || {},
                        codeLetter: existing?.codeLetter || sp.codeLetter || '',
                        finalMark: sp.finalMark > 0 ? sp.finalMark : null,
                        position: sp.rank > 0 ? sp.rank : null,
                        gradeId: sp.grade?.id || null,
                        customChestNumber: existing?.customChestNumber
                    });
                });
                await updateMultipleTabulationEntries(updatedTabs);
            }

            setToast({
                type: 'success',
                message: `🎉 Official verdict for "${item.name}" has been DECLARED! Live displays and leaderboard points are now active.`
            });
            setConfirmModal(null);
        } catch (err: any) {
            console.error('Declare error:', err);
            setToast({ type: 'error', message: `Failed to declare results: ${err?.message || 'Error occurred'}` });
        } finally {
            setIsSaving(false);
        }
    };

    const executePushUpdate = async (item: Item, scoringList?: ScoredParticipant[]) => {
        if (!state) return;
        const scoring = scoringList || getScoringForItem(item, state.tabulation || []);
        if (scoring.length === 0) {
            setToast({ type: 'warning', message: `No participants enrolled in "${item.name}".` });
            return;
        }
        setIsSaving(true);
        try {
            const winners = scoring.map(sp => ({
                participantId: sp.participantId,
                position: sp.rank > 0 ? sp.rank : null,
                mark: sp.finalMark,
                gradeId: sp.grade?.id || null
            }));

            await saveResult({
                itemId: item.id,
                categoryId: item.categoryId,
                status: ResultStatus.UPDATED,
                winners
            });

            if (updateMultipleTabulationEntries) {
                const updatedTabs: TabulationEntry[] = [];
                scoring.forEach(sp => {
                    const entryId = `${item.id}-${sp.participantId}`;
                    const existing = (state.tabulation || []).find(t => t.id === entryId);
                    updatedTabs.push({
                        id: entryId,
                        itemId: item.id,
                        categoryId: item.categoryId,
                        participantId: sp.participantId,
                        marks: existing?.marks || sp.marks || {},
                        codeLetter: existing?.codeLetter || sp.codeLetter || '',
                        finalMark: sp.finalMark > 0 ? sp.finalMark : null,
                        position: sp.rank > 0 ? sp.rank : null,
                        gradeId: sp.grade?.id || null,
                        customChestNumber: existing?.customChestNumber
                    });
                });
                await updateMultipleTabulationEntries(updatedTabs);
            }

            setToast({
                type: 'info',
                message: `✓ Internal score update pushed for "${item.name}". Team points calculated internally.`
            });
            setConfirmModal(null);
        } catch (err: any) {
            console.error('Update error:', err);
            setToast({ type: 'error', message: `Failed to push update: ${err?.message || 'Error occurred'}` });
        } finally {
            setIsSaving(false);
        }
    };

    const executeUnlock = async (item: Item) => {
        if (!state) return;
        setIsSaving(true);
        try {
            const existingResult = (state.results || []).find(r => r.itemId === item.id);
            await saveResult({
                itemId: item.id,
                categoryId: item.categoryId,
                status: ResultStatus.UPLOADED,
                winners: existingResult?.winners || []
            });
            setToast({
                type: 'info',
                message: `🔓 Event "${item.name}" unlocked. Reverted to Draft status for re-evaluation.`
            });
            setConfirmModal(null);
        } catch (err: any) {
            console.error('Unlock error:', err);
            setToast({ type: 'error', message: `Failed to unlock event: ${err?.message || 'Error occurred'}` });
        } finally {
            setIsSaving(false);
        }
    };

    const executeSaveDraft = async (item: Item) => {
        if (!state) return;
        const scoring = getScoringForItem(item, state.tabulation || []);
        setIsSaving(true);
        try {
            const winners = scoring.map(sp => ({
                participantId: sp.participantId,
                position: sp.rank > 0 ? sp.rank : null,
                mark: sp.finalMark,
                gradeId: sp.grade?.id || null
            }));
            await saveResult({
                itemId: item.id,
                categoryId: item.categoryId,
                status: ResultStatus.UPLOADED,
                winners
            });
            setToast({
                type: 'success',
                message: isJudge ? `Scores for "${item.name}" submitted successfully for verification.` : `Draft scores saved for "${item.name}".`
            });
        } catch (err: any) {
            console.error('Draft error:', err);
            setToast({ type: 'error', message: `Failed to save draft: ${err?.message || 'Error occurred'}` });
        } finally {
            setIsSaving(false);
        }
    };

    if (!state) return <div className="p-8 text-center text-zinc-500">Loading scoring modules...</div>;

    if (selectedItemId && selectedItem) {
        const category = (state.categories || []).find(c => c.id === selectedItem.categoryId);
        const validJudgeIds = new Set((state.judges || []).map(j => j.id));
        const assignedJudges = (state.judgeAssignments.find(a => a.itemId === selectedItem.id)?.judgeIds || [])
            .filter(id => validJudgeIds.has(id));
        const activeJudgeInputs = isJudge ? [judgeId!] : [...assignedJudges, MANUAL_OVERRIDE_ID];

        return (
            <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right duration-500 pb-24">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                        <button onClick={() => setSelectedItemId(null)} className="flex items-center gap-2 text-zinc-400 hover:text-indigo-600 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-4">
                            <ArrowLeft size={14} /> Back to Events Queue
                        </button>
                        <h2 className="text-xl sm:text-3xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">{selectedItem.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[8px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">{category?.name}</span>
                            <span className="px-2 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: getPerformanceColor(selectedItem.performanceType) + '15', color: getPerformanceColor(selectedItem.performanceType), borderColor: getPerformanceColor(selectedItem.performanceType) + '40' }}>{selectedItem.performanceType}</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {isDeclared && (
                            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm">
                                <CheckCircle2 size={13} strokeWidth={2.5} className="text-emerald-500" />
                                <span>Verdict Declared (Live)</span>
                            </div>
                        )}
                        {isUpdated && !isDeclared && (
                            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm">
                                <RefreshCw size={13} strokeWidth={2.5} className="text-indigo-500" />
                                <span>Scores Updated (Internal)</span>
                            </div>
                        )}

                        {/* Save Draft / Submit */}
                        {(isManager || isJudge) && !isDeclared && (
                            <button 
                                onClick={() => executeSaveDraft(selectedItem)} 
                                disabled={scoredParticipants.length === 0 || isSaving} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                                    isJudge 
                                        ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700' 
                                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-amazio-primary dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                                title={isJudge ? "Submit marks for manager verification" : "Save draft scoring"}
                            >
                                <Save size={14}/> {isSaving ? 'Saving...' : (isJudge ? 'Submit' : 'Save Draft')}
                            </button>
                        )}

                        {/* Update Button (Managers) */}
                        {isManager && (
                            <button 
                                onClick={() => openUpdateModal(selectedItem)} 
                                disabled={scoredParticipants.length === 0 || isSaving} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 ${
                                    isUpdated
                                        ? 'bg-indigo-700 text-white shadow-indigo-600/30'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                                }`}
                                title="Push internal score update and calculate points without making public"
                            >
                                <UploadCloud size={14} strokeWidth={2.5}/> 
                                {isSaving ? 'Updating...' : isUpdated ? 'Re-Sync Update' : 'Update'}
                            </button>
                        )}

                        {/* Declare Button (Managers) */}
                        {isManager && (
                            <button 
                                onClick={() => openDeclareModal(selectedItem)} 
                                disabled={scoredParticipants.length === 0 || isSaving} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
                                    isDeclared
                                        ? 'bg-emerald-700 text-white shadow-emerald-600/30'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                                }`}
                                title="Publish official verdict to live projector displays, dashboard, and points"
                            >
                                <Calculator size={14} strokeWidth={2.5}/> 
                                {isSaving ? 'Declaring...' : isDeclared ? 'Re-Declare' : 'Declare'}
                            </button>
                        )}

                        {/* Unlock Button */}
                        {isManager && (isDeclared || isUpdated) && (
                            <button 
                                onClick={() => openUnlockModal(selectedItem)} 
                                disabled={isSaving} 
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 transition-all"
                                title="Unlock to revert to draft and allow editing"
                            >
                                <LockOpen size={14}/> Unlock
                            </button>
                        )}
                    </div>
                </div>
                
                {isLocked && (
                    <div className={`p-3 sm:p-4 border rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-sm ${isDeclared ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200'}`}>
                        {isDeclared ? <CheckCircle2 size={16} className="shrink-0" /> : <RefreshCw size={16} className="shrink-0" />}
                        <p className="text-[10px] sm:text-xs font-bold leading-tight">
                            {isDeclared ? 'Live Points Active. Modifications will sync in real-time.' : 'Updated Status. Points are calculated internally but hidden from public.'}
                        </p>
                    </div>
                )}

                {!isMobile ? (
                    <ScoringTable participants={scoredParticipants} judgeIds={activeJudgeInputs} isLocked={isLocked && !isManager} isJudge={isJudge} isManager={isManager} currentJudgeId={judgeId} onMarkChange={handleMarkChange} state={state} />
                ) : (
                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-3`}>
                        {scoredParticipants.map(sp => (
                            <div key={sp.participantId} className={`bg-white dark:bg-zinc-900 rounded-[1.2rem] sm:rounded-[2.5rem] border transition-all ${sp.rank === 1 ? 'border-amber-500 shadow-xl ring-2 ring-amber-500/5' : 'border-zinc-100 dark:border-white/5 shadow-sm'}`}>
                                <div className="p-3 border-b border-zinc-100 dark:border-white/8 flex justify-between items-center bg-zinc-50/50 dark:bg-black/20 rounded-t-[1.2rem]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">{sp.codeLetter}</span>
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Entry</span>
                                    </div>
                                    {!isJudge && <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-black">#{sp.chestNumber}</div>}
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {!isJudge ? (
                                                <>
                                                    <h4 className="font-black text-amazio-primary dark:text-white uppercase tracking-tight text-sm leading-tight truncate">{sp.participantName}</h4>
                                                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide truncate mt-0.5">{sp.teamName}</p>
                                                </>
                                            ) : (
                                                <h4 className="font-black text-zinc-400 uppercase tracking-widest text-xs italic">Anonymous Entry</h4>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none tabular-nums">{sp.finalMark.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {activeJudgeInputs.map(jid => (
                                            <div key={jid} className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-zinc-400 pointer-events-none">{jid === MANUAL_OVERRIDE_ID ? 'Adm' : state.judges.find((j: Judge)=>j.id===jid)?.name.substring(0,3) || 'Jdg'}</div>
                                                <input type="number" inputMode="decimal" min="0" max="100" step="0.1" disabled={(isLocked && !isManager) || (isJudge && jid !== judgeId)} value={sp.marks[jid] ?? ''} onChange={e => handleMarkChange(sp.participantId, jid, e.target.value)} className={`w-full h-10 pl-10 pr-3 text-right font-black rounded-lg border transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${(isLocked && !isManager) || (isJudge && jid !== judgeId) ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-transparent' : 'bg-zinc-50 dark:bg-black/40 border-zinc-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-300'}`} placeholder="--" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-zinc-50/50 dark:bg-black/20 rounded-b-[1.2rem] border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {sp.rank > 0 && <div className={`flex items-center gap-1 px-2 py-1 rounded-md font-black text-[8px] uppercase tracking-widest shadow-md ${sp.rank === 1 ? 'bg-amber-400 text-amber-950' : sp.rank === 2 ? 'bg-slate-200 text-slate-700' : sp.rank === 3 ? 'bg-orange-200 text-orange-800' : ''}`}>Rank {sp.rank}</div>}
                                        {sp.grade && <div className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">Tier {sp.grade.name}</div>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">+{sp.totalPoints}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Confirmation Modal */}
                {confirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${
                                        confirmModal.type === 'DECLARE' 
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800' 
                                            : confirmModal.type === 'UPDATE'
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                                    }`}>
                                        {confirmModal.type === 'DECLARE' ? <Trophy size={24} strokeWidth={2.5} /> : confirmModal.type === 'UPDATE' ? <UploadCloud size={24} strokeWidth={2.5} /> : <LockOpen size={24} strokeWidth={2.5} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tight">
                                            {confirmModal.type === 'DECLARE' ? 'Declare Official Verdict' : confirmModal.type === 'UPDATE' ? 'Push Internal Update' : 'Unlock Scoring Event'}
                                        </h3>
                                        <p className="text-xs text-zinc-500 font-medium">
                                            {confirmModal.item.name}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setConfirmModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {confirmModal.type === 'DECLARE' && (
                                    <>
                                        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                                            This will publish the official verdict to <strong>Live Projector Displays</strong>, the <strong>Dashboard</strong>, and award points to global team tallies.
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Podium Standings Preview</div>
                                            {podiumWinners.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {podiumWinners.slice(0, 3).map(winner => (
                                                        <div key={winner.participantId} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                                                                    winner.rank === 1 ? 'bg-amber-400 text-amber-950' : winner.rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-orange-200 text-orange-800'
                                                                }`}>
                                                                    {winner.rank}
                                                                </span>
                                                                <div>
                                                                    <div className="text-xs font-black uppercase text-amazio-primary dark:text-white truncate max-w-[200px]">{winner.participantName}</div>
                                                                    <div className="text-[9px] text-zinc-400 uppercase font-bold">{winner.teamName}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">{winner.finalMark.toFixed(1)}%</div>
                                                                <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">+{winner.totalPoints} pts</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-3 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-black/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                                    Participants have not been scored yet. Declaring will record current entries.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {confirmModal.type === 'UPDATE' && (
                                    <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900 rounded-xl text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
                                        Internal scores and rankings will be computed and updated in the background tally ledger. Scores will remain <strong>withheld from public screens</strong> until declared.
                                    </div>
                                )}

                                {confirmModal.type === 'UNLOCK' && (
                                    <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                                        Unlocking this event will revert its status back to <strong>Draft</strong>, allowing judges and operators to edit marks freely.
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.type === 'DECLARE') executeDeclare(confirmModal.item, confirmModal.scoring);
                                        else if (confirmModal.type === 'UPDATE') executePushUpdate(confirmModal.item, confirmModal.scoring);
                                        else executeUnlock(confirmModal.item);
                                    }}
                                    disabled={isSaving}
                                    className={`flex-1 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                                        confirmModal.type === 'DECLARE' 
                                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' 
                                            : confirmModal.type === 'UPDATE'
                                            ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
                                            : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
                                    }`}
                                >
                                    {isSaving ? 'Processing...' : confirmModal.type === 'DECLARE' ? 'Confirm & Declare' : confirmModal.type === 'UPDATE' ? 'Confirm & Update' : 'Confirm & Unlock'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Toast Notification */}
                {toast && (
                    <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
                        toast.type === 'success' 
                            ? 'bg-emerald-950/95 text-emerald-100 border-emerald-700 backdrop-blur-md' 
                            : toast.type === 'error'
                            ? 'bg-rose-950/95 text-rose-100 border-rose-700 backdrop-blur-md'
                            : toast.type === 'warning'
                            ? 'bg-amber-950/95 text-amber-100 border-amber-700 backdrop-blur-md'
                            : 'bg-indigo-950/95 text-indigo-100 border-indigo-700 backdrop-blur-md'
                    }`}>
                        <div className="shrink-0 mt-0.5">
                            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
                            {toast.type === 'error' && <AlertTriangle size={18} className="text-rose-400" />}
                            {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
                            {toast.type === 'info' && <RefreshCw size={18} className="text-indigo-400" />}
                        </div>
                        <p className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</p>
                        <button onClick={() => setToast(null)} className="shrink-0 text-white/60 hover:text-white p-0.5">
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl sm:text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Scoring Terminal</h2>
                    <p className="text-xs sm:text-lg text-zinc-500 dark:text-zinc-400 mt-2 sm:mt-3 font-medium italic">Manage competition verdicts and global standings.</p>
                </div>
                <div className="flex items-center gap-3 pb-1">
                    <div className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Registry:</span>
                        <span className="ml-2 text-sm font-black text-amazio-primary dark:text-white tabular-nums">{filteredItems.length}</span>
                        <span className="ml-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Events</span>
                    </div>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-fit">
                {[
                    { id: 'ALL', label: 'All Events', count: (state.items || []).length },
                    { id: ResultStatus.NOT_UPLOADED, label: 'Pending', count: (state.items || []).filter(i => !(state.results || []).some(r => r.itemId === i.id) || (state.results || []).find(r => r.itemId === i.id)?.status === ResultStatus.NOT_UPLOADED).length },
                    { id: ResultStatus.UPLOADED, label: 'Drafted', count: (state.results || []).filter(r => r.status === ResultStatus.UPLOADED).length },
                    { id: ResultStatus.UPDATED, label: 'Updated', count: (state.results || []).filter(r => r.status === ResultStatus.UPDATED).length },
                    { id: ResultStatus.DECLARED, label: 'Declared', count: (state.results || []).filter(r => r.status === ResultStatus.DECLARED).length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            statusFilter === tab.id
                                ? 'bg-white dark:bg-zinc-800 text-amazio-primary dark:text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                            statusFilter === tab.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredItems.map(item => (
                    <ResultCard 
                        key={item.id} 
                        item={item} 
                        result={state.results.find(r => r.itemId === item.id)}
                        status={state.results.find(r => r.itemId === item.id)?.status || ResultStatus.NOT_UPLOADED}
                        categoryName={state.categories.find(c => c.id === item.categoryId)?.name || 'N/A'}
                        onEdit={() => setSelectedItemId(item.id)}
                        onDeclare={isManager ? () => openDeclareModal(item) : undefined}
                        onUpdateTally={isManager ? () => openUpdateModal(item) : undefined}
                        onUnlock={isManager ? () => openUnlockModal(item) : undefined}
                    />
                ))}
                {filteredItems.length === 0 && (
                    <div className="col-span-full py-16 sm:py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] sm:rounded-[2rem] opacity-30">
                        <Award size={48} sm:size={64} strokeWidth={1} className="mx-auto mb-4" />
                        <p className="font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs">No matching events in queue</p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal in Queue View */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${
                                    confirmModal.type === 'DECLARE' 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800' 
                                        : confirmModal.type === 'UPDATE'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                                }`}>
                                    {confirmModal.type === 'DECLARE' ? <Trophy size={24} strokeWidth={2.5} /> : confirmModal.type === 'UPDATE' ? <UploadCloud size={24} strokeWidth={2.5} /> : <LockOpen size={24} strokeWidth={2.5} />}
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tight">
                                        {confirmModal.type === 'DECLARE' ? 'Declare Official Verdict' : confirmModal.type === 'UPDATE' ? 'Push Internal Update' : 'Unlock Scoring Event'}
                                    </h3>
                                    <p className="text-xs text-zinc-500 font-medium">
                                        {confirmModal.item.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setConfirmModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {confirmModal.type === 'DECLARE' && (
                                <>
                                    <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                                        This will publish the official verdict to <strong>Live Projector Displays</strong>, the <strong>Dashboard</strong>, and award points to global team tallies.
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Podium Standings Preview</div>
                                        {podiumWinners.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {podiumWinners.slice(0, 3).map(winner => (
                                                    <div key={winner.participantId} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                                                                winner.rank === 1 ? 'bg-amber-400 text-amber-950' : winner.rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-orange-200 text-orange-800'
                                                            }`}>
                                                                {winner.rank}
                                                            </span>
                                                            <div>
                                                                <div className="text-xs font-black uppercase text-amazio-primary dark:text-white truncate max-w-[200px]">{winner.participantName}</div>
                                                                <div className="text-[9px] text-zinc-400 uppercase font-bold">{winner.teamName}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">{winner.finalMark.toFixed(1)}%</div>
                                                            <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">+{winner.totalPoints} pts</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-black/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                                Participants have not been scored yet. Declaring will record current entries.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {confirmModal.type === 'UPDATE' && (
                                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900 rounded-xl text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
                                    Internal scores and rankings will be computed and updated in the background tally ledger. Scores will remain <strong>withheld from public screens</strong> until declared.
                                </div>
                            )}

                            {confirmModal.type === 'UNLOCK' && (
                                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                                    Unlocking this event will revert its status back to <strong>Draft</strong>, allowing judges and operators to edit marks freely.
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmModal.type === 'DECLARE') executeDeclare(confirmModal.item, confirmModal.scoring);
                                    else if (confirmModal.type === 'UPDATE') executePushUpdate(confirmModal.item, confirmModal.scoring);
                                    else executeUnlock(confirmModal.item);
                                }}
                                disabled={isSaving}
                                className={`flex-1 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                                    confirmModal.type === 'DECLARE' 
                                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' 
                                        : confirmModal.type === 'UPDATE'
                                        ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
                                        : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
                                }`}
                            >
                                {isSaving ? 'Processing...' : confirmModal.type === 'DECLARE' ? 'Confirm & Declare' : confirmModal.type === 'UPDATE' ? 'Confirm & Update' : 'Confirm & Unlock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toast Notification in Queue View */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-950/95 text-emerald-100 border-emerald-700 backdrop-blur-md' 
                        : toast.type === 'error'
                        ? 'bg-rose-950/95 text-rose-100 border-rose-700 backdrop-blur-md'
                        : toast.type === 'warning'
                        ? 'bg-amber-950/95 text-amber-100 border-amber-700 backdrop-blur-md'
                        : 'bg-indigo-950/95 text-indigo-100 border-indigo-700 backdrop-blur-md'
                }`}>
                    <div className="shrink-0 mt-0.5">
                        {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
                        {toast.type === 'error' && <AlertTriangle size={18} className="text-rose-400" />}
                        {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
                        {toast.type === 'info' && <RefreshCw size={18} className="text-indigo-400" />}
                    </div>
                    <p className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</p>
                    <button onClick={() => setToast(null)} className="shrink-0 text-white/60 hover:text-white p-0.5">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default JudgementPage;
