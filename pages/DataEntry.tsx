import { AlertTriangle, Award, Check, CheckCircle2, ChevronDown, ChevronRight, Edit3, Filter, LayoutGrid, Layers, ListPlus, Plus, Search, ShieldCheck, Tag, Trash2, User as UserIcon, Users as UsersIcon, X, MapPin, UserPlus, Info, Crown, ListCheck, UserCheck, ArrowRight, Save, Zap, UserMinus, RotateCcw } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Card from '../components/Card';
import { ConfirmModal } from '../components/ConfirmModal';
import { useFirebase } from '../hooks/useFirebase';
import { Item, ItemType, Participant, Team, User, AppState, Category } from '../types';

// --- Visual Helpers ---

const getCategoryTheme = (name: string) => {
    if (!name) return { text: 'text-zinc-500', bg: 'bg-zinc-50', border: 'border-zinc-200' };
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themes = [
        { text: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800' },
        { text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800' },
        { text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800' },
        { text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-800' },
    ];
    return themes[hash % themes.length];
};

const getTeamColor = (name: string) => {
    if (!name) return 'bg-zinc-500';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-sky-500', 'bg-teal-500', 'bg-orange-500'];
    return colors[hash % colors.length];
};

// --- Selection Modals ---

const EntitySelectorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (entity: any) => void;
    type: 'ITEM' | 'PARTICIPANT';
}> = ({ isOpen, onClose, onSelect, type }) => {
    const { state } = useFirebase();
    const [search, setSearch] = useState('');

    if (!isOpen || !state) return null;

    const list = type === 'ITEM' 
        ? (state.items || []).filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
        : (state.participants || []).filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.chestNumber.toLowerCase().includes(search.toLowerCase()));

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black font-serif uppercase tracking-tighter text-amazio-primary dark:text-white">Select {type === 'ITEM' ? 'Event' : 'Delegate'}</h3>
                        <p className="text-[10px] font-black uppercase text-zinc-400 mt-1 tracking-widest">Choose to manage enrollment</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>
                <div className="p-6">
                    <div className="relative group mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Quick search..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[40vh] pr-2">
                        {(list || []).map(entity => (
                            <button 
                                key={entity.id} 
                                onClick={() => { onSelect(entity); onClose(); }}
                                className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/30 transition-all text-left group"
                            >
                                <div className="min-w-0 pr-4">
                                    <h5 className="text-sm font-black uppercase tracking-tight text-amazio-primary dark:text-zinc-100 truncate group-hover:text-indigo-600 transition-colors">{entity.name}</h5>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                        {type === 'ITEM' 
                                            ? (state.categories || []).find(c => c.id === entity.categoryId)?.name 
                                            : `${(state.teams || []).find(t => t.id === entity.teamId)?.name} • ${(state.categories || []).find(c => c.id === entity.categoryId)?.name}`}
                                    </p>
                                </div>
                                <ArrowRight size={16} className="text-zinc-300 group-hover:text-indigo-500 transition-all" />
                            </button>
                        ))}
                        {(!list || list.length === 0) && <div className="py-12 text-center opacity-30 italic text-xs uppercase font-bold tracking-widest">No matching results</div>}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Modals ---

const ItemManagementModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    item: Item;
}> = ({ isOpen, onClose, item }) => {
    const { state, updateMultipleParticipants } = useFirebase();
    const [search, setSearch] = useState('');
    const [draftParticipants, setDraftParticipants] = useState<Participant[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && state) {
            setDraftParticipants([...state.participants]);
        }
    }, [isOpen, state]);

    const groupedAssignableParticipants = useMemo<Record<string, Participant[]>>(() => {
        if (!state) return {};
        const isGeneralItem = (state.categories || []).find(c => c.id === item.categoryId)?.isGeneralCategory;
        const list = (draftParticipants || [])
            .filter(p => (isGeneralItem || p.categoryId === item.categoryId) && !(p.itemIds || []).includes(item.id))
            .filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.chestNumber || '').toLowerCase().includes(search.toLowerCase()));
        
        const groups: Record<string, Participant[]> = {};
        list.forEach(p => {
            const catName = (state.categories || []).find(c => c.id === p.categoryId)?.name || 'Uncategorized';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(p);
        });
        return groups;
    }, [draftParticipants, item.id, item.categoryId, state, search]);

    if (!isOpen || !state) return null;

    const category = (state.categories || []).find(c => c.id === item.categoryId);
    const isGroup = item.type === ItemType.GROUP;
    const totalEnrolled = (draftParticipants || []).filter(p => (p.itemIds || []).includes(item.id)).length;

    const handleAssign = (p: Participant, groupIndex?: number) => {
        setDraftParticipants(prev => (prev || []).map(participant => {
            if (participant.id !== p.id) return participant;

            const newItemIds = Array.from(new Set([...(participant.itemIds || []), item.id]));
            const newItemGroups = { ...(participant.itemGroups || {}) };
            if (isGroup && groupIndex !== undefined) {
                newItemGroups[item.id] = groupIndex;
            } else {
                delete newItemGroups[item.id];
            }

            const updated: Participant = { ...participant, itemIds: newItemIds, itemGroups: newItemGroups };

            if (isGroup && groupIndex !== undefined) {
                const teamParticipantsInDraft = (prev || []).filter(tp => 
                    tp.teamId === participant.teamId && 
                    (tp.itemIds || []).includes(item.id) && 
                    (tp.itemGroups?.[item.id] || 1) === groupIndex
                );
                const hasLeader = teamParticipantsInDraft.some(tp => (tp.groupLeaderItemIds || []).includes(item.id));
                if (!hasLeader) {
                    updated.groupLeaderItemIds = Array.from(new Set([...(participant.groupLeaderItemIds || []), item.id]));
                }
            }

            return updated;
        }));
    };

    const handleRemove = (p: Participant) => {
        setDraftParticipants(prev => (prev || []).map(participant => {
            if (participant.id !== p.id) return participant;

            const newItemIds = (participant.itemIds || []).filter(id => id !== item.id);
            const newItemGroups = { ...(participant.itemGroups || {}) };
            delete newItemGroups[item.id];
            
            const nextLeaders = (participant.groupLeaderItemIds || []).filter(id => id !== item.id);
            const nextChests = { ...(participant.groupChestNumbers || {}) };
            delete nextChests[item.id];

            return { 
                ...participant, 
                itemIds: newItemIds, 
                itemGroups: newItemGroups, 
                groupLeaderItemIds: nextLeaders,
                groupChestNumbers: nextChests
            };
        }));
    };

    const handleToggleLeader = (targetParticipant: Participant, groupIndex: number) => {
        if (!isGroup) return;

        setDraftParticipants(prev => {
            const membersOfGroup = (prev || []).filter(p => 
                p.teamId === targetParticipant.teamId && 
                (p.itemIds || []).includes(item.id) && 
                (p.itemGroups?.[item.id] || 1) === groupIndex
            );

            return (prev || []).map(m => {
                if (!membersOfGroup.some(member => member.id === m.id)) return m;

                const isTarget = m.id === targetParticipant.id;
                let currentLeaders = m.groupLeaderItemIds || [];
                let nextLeaders = isTarget 
                    ? Array.from(new Set([...currentLeaders, item.id]))
                    : currentLeaders.filter(id => id !== item.id);
                
                let nextChests = { ...(m.groupChestNumbers || {}) };
                if (!isTarget) delete nextChests[item.id];

                return { ...m, groupLeaderItemIds: nextLeaders, groupChestNumbers: nextChests };
            });
        });
    };

    const handleClearAllEnrolled = () => {
        if (totalEnrolled === 0) return;
        setDraftParticipants(prev => (prev || []).map(participant => {
            if (!(participant.itemIds || []).includes(item.id)) return participant;
            const newItemIds = (participant.itemIds || []).filter(id => id !== item.id);
            const newItemGroups = { ...(participant.itemGroups || {}) };
            delete newItemGroups[item.id];
            const nextLeaders = (participant.groupLeaderItemIds || []).filter(id => id !== item.id);
            const nextChests = { ...(participant.groupChestNumbers || {}) };
            delete nextChests[item.id];
            return { 
                ...participant, 
                itemIds: newItemIds, 
                itemGroups: newItemGroups, 
                groupLeaderItemIds: nextLeaders,
                groupChestNumbers: nextChests
            };
        }));
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            const changed = (draftParticipants || []).filter(dp => {
                const original = (state.participants || []).find(sp => sp.id === dp.id);
                return JSON.stringify(original) !== JSON.stringify(dp);
            });

            if (changed.length > 0) {
                await updateMultipleParticipants(changed);
            }
            onClose();
        } catch (e) {
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{category?.name} • {item.type} • {item.performanceType}</p>
                                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Live Total: {totalEnrolled}</span>
                                {totalEnrolled > 0 && (
                                    <button 
                                        type="button" 
                                        onClick={handleClearAllEnrolled}
                                        title="Remove all enrolled participants from this event"
                                        className="px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-[9px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={11} /> Clear All (0)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Team Matrix */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <UsersIcon size={14}/> Unit Status
                            </h4>
                            <div className="space-y-4">
                                {(state.teams || []).map(team => {
                                    const teamParticipants = draftParticipants.filter(p => p.teamId === team.id && (p.itemIds || []).includes(item.id));
                                    
                                    return (
                                        <div key={team.id} className="p-5 rounded-3xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`w-2 h-4 rounded-full ${getTeamColor(team.name)}`}></div>
                                                <span className="text-xs font-black uppercase tracking-tight text-zinc-700 dark:text-zinc-300">{team.name}</span>
                                                <span className={`text-[9px] font-bold ml-auto ${teamParticipants.length >= item.maxParticipants ? 'text-rose-500' : 'text-zinc-400'}`}>
                                                    {teamParticipants.length} / {isGroup ? ((item.maxGroupsPerTeam || 1) * item.maxParticipants) : item.maxParticipants} Registered
                                                </span>
                                            </div>

                                            {isGroup ? (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {Array.from({ length: item.maxGroupsPerTeam || 1 }).map((_, idx) => {
                                                        const groupIdx = idx + 1;
                                                        const assigned = teamParticipants.filter(p => (p.itemGroups?.[item.id] || 1) === groupIdx);
                                                        return (
                                                            <div key={idx} className="p-3 rounded-2xl bg-white/40 dark:bg-black/20 border border-zinc-100 dark:border-zinc-800">
                                                                <div className="flex justify-between items-center mb-2 px-1">
                                                                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Group Slot {groupIdx}</span>
                                                                    <span className="text-[8px] font-bold text-zinc-400">{assigned.length} / {item.maxParticipants} Members</span>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {assigned.map(p => {
                                                                        const isLeader = p.groupLeaderItemIds?.includes(item.id);
                                                                        return (
                                                                            <div key={p.id} className={`flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 border transition-all rounded-xl shadow-sm ${isLeader ? 'border-amber-400 ring-2 ring-amber-400/5' : 'border-zinc-200 dark:border-zinc-700'}`}>
                                                                                <div className="flex items-center gap-3 min-w-0">
                                                                                    <span className="text-[10px] font-black font-mono text-indigo-500">#{p.chestNumber}</span>
                                                                                    <span className="text-xs font-bold truncate dark:text-zinc-200">{p.name}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button onClick={() => handleToggleLeader(p, groupIdx)} className={`p-1.5 rounded-lg transition-all ${isLeader ? 'text-amber-500 bg-amber-50' : 'text-zinc-300 hover:text-amber-400 hover:bg-amber-50/50'}`}><Crown size={14} fill={isLeader ? "currentColor" : "none"} /></button>
                                                                                    <button onClick={() => handleRemove(p)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {assigned.length === 0 && <div className="p-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center"><span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Available</span></div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {teamParticipants.map(p => (
                                                        <div key={p.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <span className="text-[10px] font-black font-mono text-indigo-500">#{p.chestNumber}</span>
                                                                <span className="text-xs font-bold truncate dark:text-zinc-200">{p.name}</span>
                                                            </div>
                                                            <button onClick={() => handleRemove(p)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                                        </div>
                                                    ))}
                                                    {teamParticipants.length === 0 && (
                                                        <div className="p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                                                            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">No Participants Enrolled</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Assignable Participants - Redesigned with Grouping */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <UserPlus size={14}/> Available Delegates
                            </h4>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or ID..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>
                            <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                {(Object.entries(groupedAssignableParticipants) as [string, Participant[]][]).map(([catName, members]) => (
                                    <div key={catName} className="space-y-2">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-grow"></div>
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 shrink-0">{catName}</span>
                                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-grow"></div>
                                        </div>
                                        <div className="space-y-2">
                                            {members.map(p => {
                                                const team = state.teams.find(t => t.id === p.teamId);
                                                const teamParticipantsInDraft = draftParticipants.filter(tp => tp.teamId === p.teamId && tp.itemIds.includes(item.id));
                                                const totalLimit = isGroup ? ((item.maxGroupsPerTeam || 1) * item.maxParticipants) : item.maxParticipants;
                                                const isUnitFull = teamParticipantsInDraft.length >= totalLimit;

                                                return (
                                                    <div key={p.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl group hover:border-indigo-500/30 transition-all">
                                                        <div className="min-w-0 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black font-mono text-zinc-400">#{p.chestNumber}</span>
                                                                <h5 className="text-sm font-black uppercase tracking-tight dark:text-white truncate">{p.name}</h5>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{team?.name}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {isUnitFull ? (
                                                                <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded">Limit Reached</span>
                                                            ) : isGroup ? (
                                                                Array.from({ length: item.maxGroupsPerTeam || 1 }).map((_, i) => {
                                                                    const gIdx = i + 1;
                                                                    const occupants = teamParticipantsInDraft.filter(tp => (tp.itemGroups?.[item.id] || 1) === gIdx);
                                                                    if (occupants.length >= item.maxParticipants) return null;
                                                                    return (
                                                                        <button key={i} onClick={() => handleAssign(p, gIdx)} className="px-2 py-1 bg-indigo-600 text-white rounded text-[8px] font-black uppercase hover:bg-indigo-700 transition-all">Add G{gIdx}</button>
                                                                    );
                                                                })
                                                            ) : (
                                                                <button onClick={() => handleAssign(p)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-700 transition-all">Enroll</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(groupedAssignableParticipants).length === 0 && (
                                    <div className="py-12 text-center opacity-30 italic text-xs uppercase font-bold tracking-widest border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem]">
                                        No available delegates
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-7 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01] flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-all">Discard Changes</button>
                    <button onClick={handleConfirmSave} disabled={isSaving} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2">
                        {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={14}/> Confirm & Save</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ParticipantManagementModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    participant: Participant;
}> = ({ isOpen, onClose, participant }) => {
    const { state, updateParticipant } = useFirebase();
    const [search, setSearch] = useState('');
    const [draftParticipant, setDraftParticipant] = useState<Participant | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDraftParticipant({ ...participant });
        }
    }, [isOpen, participant]);

    const groupedAvailableItems = useMemo<Record<string, Item[]>>(() => {
        if (!state || !draftParticipant) return {};
        const generalCategoryIds = new Set((state.categories || []).filter(c => c.isGeneralCategory).map(c => c.id));
        const list = (state.items || [])
            .filter(i => i.categoryId === draftParticipant.categoryId || generalCategoryIds.has(i.categoryId))
            .filter(i => (i.name || '').toLowerCase().includes(search.toLowerCase()));
        
        const groups: Record<string, Item[]> = {};
        list.forEach(i => {
            const catName = (state.categories || []).find(c => c.id === i.categoryId)?.name || 'Uncategorized';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(i);
        });
        return groups;
    }, [state, draftParticipant, search]);

    if (!isOpen || !state || !draftParticipant) return null;

    const team = (state.teams || []).find(t => t.id === draftParticipant.teamId);
    const category = (state.categories || []).find(c => c.id === draftParticipant.categoryId);
    const theme = getCategoryTheme(category?.name || '');
    const currentEnrolledCount = (draftParticipant.itemIds || []).length;

    const toggleEnrollment = (item: Item) => {
        const isEnrolled = (draftParticipant.itemIds || []).includes(item.id);
        if (isEnrolled) {
            const newItemIds = (draftParticipant.itemIds || []).filter(id => id !== item.id);
            const newItemGroups = { ...(draftParticipant.itemGroups || {}) };
            delete newItemGroups[item.id];
            const nextLeaders = (draftParticipant.groupLeaderItemIds || []).filter(id => id !== item.id);
            const nextChests = { ...(draftParticipant.groupChestNumbers || {}) };
            delete nextChests[item.id];

            setDraftParticipant({ ...draftParticipant, itemIds: newItemIds, itemGroups: newItemGroups, groupLeaderItemIds: nextLeaders, groupChestNumbers: nextChests });
        } else {
            const teamEnrolled = (state.participants || []).filter(p => p.teamId === draftParticipant.teamId && (p.itemIds || []).includes(item.id));
            const isGroup = item.type === ItemType.GROUP;
            const totalLimit = isGroup ? ((item.maxGroupsPerTeam || 1) * item.maxParticipants) : item.maxParticipants;
            
            if (teamEnrolled.length >= totalLimit) {
                alert(`The unit "${team?.name}" has already occupied all available spots for "${item.name}".`);
                return;
            }

            const newItemIds = [...(draftParticipant.itemIds || []), item.id];
            const newItemGroups = { ...(draftParticipant.itemGroups || {}) };
            const nextLeaders = [...(draftParticipant.groupLeaderItemIds || [])];

            if (isGroup) {
                let targetIdx = -1;
                for (let i = 1; i <= (item.maxGroupsPerTeam || 1); i++) {
                    const groupMembers = teamEnrolled.filter(p => (p.itemGroups?.[item.id] || 1) === i);
                    if (groupMembers.length < item.maxParticipants) {
                        targetIdx = i;
                        break;
                    }
                }
                if (targetIdx !== -1) {
                    newItemGroups[item.id] = targetIdx;
                    if (teamEnrolled.filter(p => (p.itemGroups?.[item.id] || 1) === targetIdx).length === 0) {
                        nextLeaders.push(item.id);
                    }
                }
            } else {
                delete newItemGroups[item.id];
            }

            setDraftParticipant({ ...draftParticipant, itemIds: newItemIds, itemGroups: newItemGroups, groupLeaderItemIds: nextLeaders });
        }
    };

    const handleClearAllPrograms = () => {
        if (!draftParticipant || (draftParticipant.itemIds || []).length === 0) return;
        setDraftParticipant({
            ...draftParticipant,
            itemIds: [],
            itemGroups: {},
            groupLeaderItemIds: [],
            groupChestNumbers: {}
        });
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            await updateParticipant(draftParticipant);
            onClose();
        } catch (e) {
            alert("Failed to save enrollment.");
        } finally {
            setIsSaving(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg ${getTeamColor(team?.name || '')}`}>
                            {draftParticipant.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">{draftParticipant.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{team?.name}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${theme.border} ${theme.bg} ${theme.text}`}>{category?.name}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                <span className="px-2 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest">Enrolled: {currentEnrolledCount}</span>
                                {currentEnrolledCount > 0 && (
                                    <button 
                                        type="button" 
                                        onClick={handleClearAllPrograms}
                                        title="Remove all enrolled programs for this participant"
                                        className="px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-[9px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={11} /> Clear All (0)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>

                <div className="p-8 space-y-6 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input type="text" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                    </div>

                    <div className="space-y-8">
                        {(Object.entries(groupedAvailableItems) as [string, Item[]][]).map(([catName, list]) => (
                            <div key={catName} className="space-y-3">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-grow"></div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 shrink-0">{catName}</span>
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-grow"></div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {list.map(item => {
                                        const isEnrolled = draftParticipant.itemIds.includes(item.id);
                                        const teamEnrolled = state.participants.filter(p => p.teamId === draftParticipant.teamId && p.itemIds.includes(item.id));
                                        const isGroup = item.type === ItemType.GROUP;
                                        const totalLimit = isGroup ? ((item.maxGroupsPerTeam || 1) * item.maxParticipants) : item.maxParticipants;
                                        const isFull = !isEnrolled && teamEnrolled.length >= totalLimit;

                                        return (
                                            <div key={item.id} onClick={() => toggleEnrollment(item)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isEnrolled ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md' : isFull ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200'}`}>
                                                <div className="min-w-0 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`font-black text-sm uppercase tracking-tight ${isEnrolled ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{item.name}</div>
                                                        {isFull && <span className="bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 flex items-center gap-1"><AlertTriangle size={8}/> Unit Limit</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <div className="flex gap-1">
                                                            <span className="text-[8px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-black/40 px-1.5 py-0.5 rounded">{item.type}</span>
                                                            <span className="text-[8px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-black/40 px-1.5 py-0.5 rounded">{item.performanceType}</span>
                                                        </div>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isFull ? 'text-rose-500' : 'text-zinc-400'}`}>{teamEnrolled.length} / {totalLimit} Enrolled</span>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isEnrolled ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : isFull ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-700'}`}>{isEnrolled && <Check size={16} strokeWidth={4} />}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {Object.keys(groupedAvailableItems).length === 0 && (
                            <div className="py-20 text-center opacity-30 italic text-xs uppercase font-bold tracking-[0.2em] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
                                No matching events found
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-7 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01] flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-all">Discard Changes</button>
                    <button onClick={handleConfirmSave} disabled={isSaving} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2">
                        {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={14}/> Confirm & Save</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- View Components ---

const ItemEntryView: React.FC<{ onTriggerSelection: () => void }> = ({ onTriggerSelection }) => {
    const { state, globalSearchTerm, globalFilters, updateMultipleParticipants } = useFirebase();
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [itemToClear, setItemToClear] = useState<Item | null>(null);
    const [isClearing, setIsClearing] = useState(false);

    const filteredItems = useMemo(() => {
        if (!state) return [];
        return (state.items || []).filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(globalSearchTerm.toLowerCase());
            const matchesCat = (globalFilters?.categoryId || []).length > 0 ? (globalFilters?.categoryId || []).includes(item.categoryId) : true;
            const matchesPerf = (globalFilters?.performanceType || []).length > 0 ? (globalFilters?.performanceType || []).includes(item.performanceType) : true;
            return matchesSearch && matchesCat && matchesPerf;
        }).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    }, [state, globalSearchTerm, globalFilters]);

    const handleClearItemEnrollments = async () => {
        if (!itemToClear || !state) return;
        setIsClearing(true);
        try {
            const affected = (state.participants || []).filter(p => (p.itemIds || []).includes(itemToClear.id));
            if (affected.length > 0) {
                const updated = affected.map(p => {
                    const newItemIds = (p.itemIds || []).filter(id => id !== itemToClear.id);
                    const newItemGroups = { ...(p.itemGroups || {}) };
                    delete newItemGroups[itemToClear.id];
                    const nextLeaders = (p.groupLeaderItemIds || []).filter(id => id !== itemToClear.id);
                    const nextChests = { ...(p.groupChestNumbers || {}) };
                    delete nextChests[itemToClear.id];
                    return {
                        ...p,
                        itemIds: newItemIds,
                        itemGroups: newItemGroups,
                        groupLeaderItemIds: nextLeaders,
                        groupChestNumbers: nextChests
                    };
                });
                await updateMultipleParticipants(updated);
            }
            setItemToClear(null);
        } catch (e) {
            console.error(e);
            alert("Failed to clear event enrollments.");
        } finally {
            setIsClearing(false);
        }
    };

    if (!state) return null;

    return (
        <Card title="Enrollment by Events" action={<button onClick={onTriggerSelection} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95"><ListCheck size={14} strokeWidth={3}/> Add Assignment</button>}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(filteredItems || []).map(item => {
                    const category = (state.categories || []).find(c => c.id === item.categoryId);
                    const theme = getCategoryTheme(category?.name || '');
                    const enrolledCount = (state.participants || []).filter(p => (p.itemIds || []).includes(item.id)).length;
                    const maxPossiblePerTeam = item.type === ItemType.GROUP ? ((item.maxGroupsPerTeam || 1) * item.maxParticipants) : item.maxParticipants;
                    const maxPossible = (state.teams || []).length * maxPossiblePerTeam;

                    return (
                        <div key={item.id} className="relative p-5 rounded-[2rem] border-2 border-zinc-100 dark:border-white/5 bg-white dark:bg-[#151816] transition-all hover:border-indigo-500/20 group cursor-default text-zinc-900 dark:text-zinc-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${theme.border} ${theme.bg} ${theme.text}`}>{category?.name}</div>
                                    {category?.isGeneralCategory && <span className="bg-amber-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">General</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {enrolledCount > 0 && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setItemToClear(item); }} 
                                            title="Remove all enrolled participants and make it zero" 
                                            className="p-2 rounded-xl transition-all bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:scale-105 flex items-center gap-1 shadow-sm"
                                        >
                                            <UserMinus size={16} />
                                            <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline-block">Clear (0)</span>
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedItem(item)} title="Manage Event Enrollment" className="p-2 rounded-xl transition-all bg-zinc-50 dark:bg-white/5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110">
                                        <ListPlus size={18} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="font-black text-amazio-primary dark:text-white text-lg uppercase tracking-tight leading-tight mb-2 line-clamp-1">{item.name}</h4>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[9px] font-black uppercase text-zinc-400">{item.type}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-200"></span>
                                <span className="text-[9px] font-black uppercase text-zinc-400">{item.performanceType}</span>
                            </div>
                            <div className="pt-4 border-t border-zinc-50 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${enrolledCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-200'}`}></div>
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{enrolledCount} / {maxPossible} Slots Filled</span>
                                </div>
                                {enrolledCount > 0 && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setItemToClear(item); }}
                                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        title="Remove all enrolled participants (Reset to 0)"
                                    >
                                        <Trash2 size={12}/> Reset to 0
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {selectedItem && <ItemManagementModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} item={selectedItem} />}
            {itemToClear && (
                <ConfirmModal 
                    isOpen={!!itemToClear}
                    title="Remove All Enrolled Participants"
                    message={`Are you sure you want to remove all enrolled delegates from "${itemToClear.name}"? This will unassign everyone and make the enrolled count 0.`}
                    confirmText="Remove All (Reset to 0)"
                    cancelText="Cancel"
                    variant="danger"
                    isLoading={isClearing}
                    onConfirm={handleClearItemEnrollments}
                    onClose={() => { if (!isClearing) setItemToClear(null); }}
                />
            )}
        </Card>
    );
};

const ParticipantEntryView: React.FC<{ onTriggerSelection: () => void }> = ({ onTriggerSelection }) => {
    const { state, globalSearchTerm, globalFilters, updateParticipant } = useFirebase();
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [participantToClear, setParticipantToClear] = useState<Participant | null>(null);
    const [isClearing, setIsClearing] = useState(false);

    const filteredParticipants = useMemo(() => {
        if (!state) return [];
        return (state.participants || []).filter(p => {
            const matchesSearch = (p.name || '').toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
                                 (p.chestNumber || '').toLowerCase().includes(globalSearchTerm.toLowerCase());
            const matchesTeam = (globalFilters?.teamId || []).length > 0 ? (globalFilters?.teamId || []).includes(p.teamId) : true;
            const matchesCategory = (globalFilters?.categoryId || []).length > 0 ? (globalFilters?.categoryId || []).includes(p.categoryId) : true;
            return matchesSearch && matchesTeam && matchesCategory;
        }).sort((a,b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, {numeric: true}));
    }, [state, globalSearchTerm, globalFilters]);

    const handleClearParticipantPrograms = async () => {
        if (!participantToClear) return;
        setIsClearing(true);
        try {
            const cleared: Participant = {
                ...participantToClear,
                itemIds: [],
                itemGroups: {},
                groupLeaderItemIds: [],
                groupChestNumbers: {}
            };
            await updateParticipant(cleared);
            setParticipantToClear(null);
        } catch (e) {
            console.error(e);
            alert("Failed to clear delegate programs.");
        } finally {
            setIsClearing(false);
        }
    };

    if (!state) return null;

    return (
        <Card title="Enrollment by Delegates" action={<button onClick={onTriggerSelection} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all active:scale-95"><UserCheck size={14} strokeWidth={3}/> Add Enrollment</button>}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(filteredParticipants || []).map(p => {
                    const team = (state.teams || []).find(t => t.id === p.teamId);
                    const category = (state.categories || []).find(c => c.id === p.categoryId);
                    const theme = getCategoryTheme(category?.name || '');
                    const enrolledItemCount = (p.itemIds || []).length;

                    return (
                        <div key={p.id} className="relative p-5 rounded-[2rem] border-2 border-zinc-100 dark:border-white/5 bg-white dark:bg-[#151816] transition-all hover:border-emerald-500/20 group cursor-default text-zinc-900 dark:text-zinc-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg ${getTeamColor(team?.name || '')}`}>{(p.name || '').charAt(0)}</div>
                                    <div>
                                        <div className="text-[10px] font-black font-mono text-zinc-400">#{p.chestNumber}</div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500 max-w-[100px] truncate">{team?.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {enrolledItemCount > 0 && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setParticipantToClear(p); }} 
                                            title="Remove all enrolled programmes and make it zero" 
                                            className="p-2 rounded-xl transition-all bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:scale-105 flex items-center gap-1 shadow-sm"
                                        >
                                            <UserMinus size={16} />
                                            <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline-block">Clear (0)</span>
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedParticipant(p)} title="Manage Delegate Programs" className="p-2 rounded-xl transition-all bg-zinc-50 dark:bg-white/5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-110">
                                        <Edit3 size={18} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="font-black text-amazio-primary dark:text-white text-lg uppercase tracking-tight leading-tight mb-2 truncate">{p.name}</h4>
                            <div className={`inline-block px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${theme.border} ${theme.bg} ${theme.text}`}>{category?.name}</div>
                            <div className="pt-4 mt-4 border-t border-zinc-50 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${enrolledItemCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-200'}`}></div>
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{enrolledItemCount} Events Registry</span>
                                </div>
                                {enrolledItemCount > 0 && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setParticipantToClear(p); }}
                                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        title="Remove all enrolled programs for this participant (Reset to 0)"
                                    >
                                        <Trash2 size={12}/> Reset to 0
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {selectedParticipant && <ParticipantManagementModal isOpen={!!selectedParticipant} onClose={() => setSelectedParticipant(null)} participant={selectedParticipant} />}
            {participantToClear && (
                <ConfirmModal 
                    isOpen={!!participantToClear}
                    title="Remove All Enrolled Programmes"
                    message={`Are you sure you want to remove all ${(participantToClear.itemIds || []).length} enrolled programmes for "${participantToClear.name}" (#${participantToClear.chestNumber})? This will make their enrolled count 0.`}
                    confirmText="Remove All (Reset to 0)"
                    cancelText="Cancel"
                    variant="danger"
                    isLoading={isClearing}
                    onConfirm={handleClearParticipantPrograms}
                    onClose={() => { if (!isClearing) setParticipantToClear(null); }}
                />
            )}
        </Card>
    );
};

// --- Page Wrapper ---

const DataEntryPage: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
    const { state, dataEntryView: view, globalSearchTerm, globalFilters } = useFirebase();
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const filteredItemsCount = useMemo(() => {
        if (!state) return 0;
        return state.items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(globalSearchTerm.toLowerCase());
            const matchesCat = globalFilters.categoryId.length > 0 ? globalFilters.categoryId.includes(item.categoryId) : true;
            const matchesPerf = globalFilters.performanceType.length > 0 ? globalFilters.performanceType.includes(item.performanceType) : true;
            return matchesSearch && matchesCat && matchesPerf;
        }).length;
    }, [state, globalSearchTerm, globalFilters]);

    const filteredParticipantsCount = useMemo(() => {
        if (!state) return 0;
        return state.participants.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
                                 p.chestNumber.toLowerCase().includes(globalSearchTerm.toLowerCase());
            const matchesTeam = globalFilters.teamId.length > 0 ? globalFilters.teamId.includes(p.teamId) : true;
            const matchesCategory = globalFilters.categoryId.length > 0 ? globalFilters.categoryId.includes(p.categoryId) : true;
            return matchesSearch && matchesTeam && matchesCategory;
        }).length;
    }, [state, globalSearchTerm, globalFilters]);

    return (
        <div className="space-y-6 sm:space-y-10 pb-24 animate-in fade-in duration-700 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl sm:text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Data Entry</h2>
                    <p className="text-xs sm:text-lg text-zinc-500 dark:text-zinc-400 mt-2 sm:mt-3 font-medium italic">Strategic enrollment and identity management.</p>
                </div>
                <div className="flex items-center gap-3 pb-1">
                    <div className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Registry:</span>
                        <span className="ml-2 text-sm font-black text-amazio-primary dark:text-white tabular-nums">
                            {view === 'ITEMS' ? filteredItemsCount : filteredParticipantsCount}
                        </span>
                        <span className="ml-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Records</span>
                    </div>
                </div>
            </div>

            <div className="space-y-10">
                {view === 'ITEMS' ? (
                    <div className="animate-in slide-in-from-left duration-500">
                        <ItemEntryView onTriggerSelection={() => setIsSelectorOpen(true)} />
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right duration-500">
                        <ParticipantEntryView onTriggerSelection={() => setIsSelectorOpen(true)} />
                    </div>
                )}
            </div>

            <EntitySelectorModal 
                isOpen={isSelectorOpen} 
                onClose={() => setIsSelectorOpen(false)} 
                type={view === 'ITEMS' ? 'ITEM' : 'PARTICIPANT'}
                onSelect={(entity) => {
                    if (view === 'ITEMS') setSelectedItem(entity);
                    else setSelectedParticipant(entity);
                }}
            />

            {selectedItem && <ItemManagementModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} item={selectedItem} />}
            {selectedParticipant && <ParticipantManagementModal isOpen={!!selectedParticipant} onClose={() => setSelectedParticipant(null)} participant={selectedParticipant} />}
        </div>
    );
};

export default DataEntryPage;