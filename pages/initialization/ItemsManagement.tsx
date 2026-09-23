import { AlertTriangle, ArrowRight, CheckCircle, ChevronDown, ChevronUp, ClipboardList, Clock, Edit2, FileDown, Image as ImageIcon, LayoutList, Layers, MapPin, Plus, RefreshCw, Save, Search, ShieldAlert, Sparkles, Tag, Trash2, Upload, UserPlus, Users, User as UserIcon, X, XCircle, BookOpen, Mic, PenTool, Hash, Info, ListTree, PackageSearch, Settings2, CheckSquare, Square, Check, Contact, Crown, ShieldCheck, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Card from '../../components/Card';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useFirebase } from '../../hooks/useFirebase';
import { Category, Item, ItemType, Participant, PerformanceType, User, UserRole, Team, AppState } from '../../types';

// --- Constants & Palette ---

const ART_FEST_PALETTE = {
  OCEAN_BLUE: '#006994',
  SAND_YELLOW: '#d4a574',
  FOREST_GREEN: '#1b5e20',
  SKY_CYAN: '#80deea',
  HEALING_GREEN: '#2d6a4f',
  SOFT_BLUE: '#a8dadc',
  TEAL: '#1d9488',
  WARM_BEIGE: '#f1faee'
};

// --- Types for Sorting ---

type ItemSortKey = 'name' | 'type' | 'performance' | 'category' | 'duration' | 'maxParticipants';
type ParticipantSortKey = 'chestNumber' | 'name' | 'team' | 'category';

// --- Utils ---

const getThemeColor = (str: string) => {
    if (!str) return { bg: 'bg-zinc-500', text: 'text-zinc-600', border: 'border-zinc-200', light: 'bg-zinc-50 dark:bg-zinc-900/30', hex: '#71717a' };
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; 
    }
    const themes = [
        { hex: ART_FEST_PALETTE.OCEAN_BLUE, text: 'text-[#006994]', border: 'border-[#006994]', light: 'bg-[#006994]/10' },
        { hex: ART_FEST_PALETTE.SAND_YELLOW, text: 'text-[#d4a574]', border: 'border-[#d4a574]', light: 'bg-[#d4a574]/10' },
        { hex: ART_FEST_PALETTE.FOREST_GREEN, text: 'text-[#1b5e20]', border: 'border-[#1b5e20]', light: 'bg-[#1b5e20]/10' },
        { hex: ART_FEST_PALETTE.SKY_CYAN, text: 'text-[#80deea]', border: 'border-[#80deea]', light: 'bg-[#80deea]/10' },
        { hex: ART_FEST_PALETTE.TEAL, text: 'text-[#1d9488]', border: 'border-[#1d9488]', light: 'bg-[#1d9488]/10' },
    ];
    return themes[Math.abs(hash) % themes.length];
};

// --- Styled Components ---

const selectClasses = "w-full appearance-none px-4 py-3 sm:py-4 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer";

const SortButton = <T extends string>({ label, sortKey, currentSortKey, currentSortDir, onSort }: { 
    label: string, 
    sortKey: T, 
    currentSortKey: string,
    currentSortDir: 'asc' | 'desc',
    onSort: (key: T) => void 
}) => (
  <button 
    onClick={() => onSort(sortKey)}
    className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${
      currentSortKey === sortKey 
      ? 'bg-amazio-primary text-white border-amazio-primary shadow-md' 
      : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-amazio-primary'
    }`}
  >
    {label}
    <div className="flex flex-col space-y-[1px]">
        <ChevronUp size={6} className={`${currentSortKey === sortKey && currentSortDir === 'asc' ? 'text-white' : 'text-zinc-400'}`} />
        <ChevronDown size={6} className={`${currentSortKey === sortKey && currentSortDir === 'desc' ? 'text-white' : 'text-zinc-400'} -mt-[2px]`} />
    </div>
  </button>
);

const TypeBadge = ({ type }: { type: ItemType }) => {
    const isGroup = type === ItemType.GROUP;
    const color = isGroup ? ART_FEST_PALETTE.FOREST_GREEN : ART_FEST_PALETTE.SAND_YELLOW;
    return (
        <span 
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest border transition-colors"
          style={{ backgroundColor: `${color}10`, color: color, borderColor: `${color}30` }}
        >
            {isGroup ? <Users size={9} className="mr-1"/> : <UserIcon size={9} className="mr-1"/>}
            {type}
        </span>
    );
};

const PerformanceBadge = ({ type }: { type: PerformanceType }) => {
    const isOnStage = type === PerformanceType.ON_STAGE;
    const color = isOnStage ? ART_FEST_PALETTE.OCEAN_BLUE : ART_FEST_PALETTE.SKY_CYAN;
    return (
        <span 
          className="px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest border transition-all"
          style={{ backgroundColor: `${color}10`, color: color, borderColor: `${color}30` }}
        >
          {type}
        </span>
    );
};

// --- MODALS ---

export const GroupEntryModal: React.FC<{ isOpen: boolean; onClose: () => void; entry: any }> = ({ isOpen, onClose, entry }) => {
    const { state, updateMultipleParticipants } = useFirebase();
    const [chestNo, setChestNo] = useState('');
    const [leaderId, setLeaderId] = useState('');
    const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
    const [isDisbanding, setIsDisbanding] = useState(false);

    useEffect(() => {
        if (entry) {
            setChestNo(entry.chestNumber || '');
            setLeaderId(entry.leaderId || '');
        } else {
            setChestNo('');
            setLeaderId('');
        }
    }, [entry, isOpen]);

    if (!isOpen || !state || !entry) return null;

    const members = state.participants.filter(p => 
        p.teamId === entry.teamId && p.itemIds.includes(entry.itemId) && (p.itemGroups?.[entry.itemId] || 1) === entry.groupIndex
    );

    const handleSave = async () => {
        if (members.length === 0) return alert("No members in group.");
        const leader = members.find(m => m.id === leaderId);
        if (!leader) return alert("Select a leader.");
        
        const updates: Participant[] = members.map(m => {
            const isLeader = m.id === leaderId;
            const currentLeaders = m.groupLeaderItemIds || [];
            const nextLeaders = isLeader 
                ? Array.from(new Set([...currentLeaders, entry.itemId]))
                : currentLeaders.filter(id => id !== entry.itemId);
            
            const currentChests = m.groupChestNumbers || {};
            const nextChests = isLeader 
                ? { ...currentChests, [entry.itemId]: chestNo }
                : { ...currentChests };
            if (!isLeader) delete nextChests[entry.itemId];

            return { ...m, groupLeaderItemIds: nextLeaders, groupChestNumbers: nextChests };
        });

        await updateMultipleParticipants(updates);
        onClose();
    };

    const handleDisbandConfirm = async () => {
        setIsDisbanding(true);
        try {
            if (members.length > 0) {
                const updates: Participant[] = members.map(m => {
                    const nextItemIds = m.itemIds.filter(id => id !== entry.itemId);
                    const nextItemGroups = { ...(m.itemGroups || {}) };
                    delete nextItemGroups[entry.itemId];
                    const nextLeaders = (m.groupLeaderItemIds || []).filter(id => id !== entry.itemId);
                    const nextChests = { ...(m.groupChestNumbers || {}) };
                    delete nextChests[entry.itemId];
                    return {
                        ...m,
                        itemIds: nextItemIds,
                        itemGroups: nextItemGroups,
                        groupLeaderItemIds: nextLeaders,
                        groupChestNumbers: nextChests
                    };
                });
                await updateMultipleParticipants(updates);
            }
            setShowDisbandConfirm(false);
            onClose();
        } finally {
            setIsDisbanding(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">Manage Group</h3>
                        <p className="text-[10px] font-black uppercase text-zinc-400 mt-1.5 tracking-widest">{entry.displayName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Group Chest Number</label>
                        <input type="text" value={chestNo || ''} onChange={e => setChestNo(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. G101" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Group Leader</label>
                        <div className="relative">
                            <select value={leaderId || ''} onChange={e => setLeaderId(e.target.value)} className={selectClasses}>
                                <option value="">-- Select Leader --</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Members ({members.length})</label>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {members.map(m => (
                                <div key={m.id} className="text-xs font-bold p-2 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                    <span className="dark:text-zinc-200">{m.name}</span>
                                    <span className="text-[10px] text-zinc-400">#{m.chestNumber}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-7 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01] flex justify-between items-center gap-4">
                    <button type="button" onClick={() => setShowDisbandConfirm(true)} className="px-4 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5">
                        <Trash2 size={14}/> Disband Group
                    </button>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amazio-primary transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-8 sm:px-10 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Save Changes</button>
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={showDisbandConfirm}
                title="Disband Group"
                message={`Are you sure you want to disband group "${entry.displayName}"? All ${members.length} enrolled members will be unassigned from this item.`}
                confirmText="Disband Group"
                isLoading={isDisbanding}
                onConfirm={handleDisbandConfirm}
                onClose={() => { if (!isDisbanding) setShowDisbandConfirm(false); }}
            />
        </div>,
        document.body
    );
};

export const ItemFormModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    editingItem: Item | null; 
}> = ({ isOpen, onClose, editingItem }) => {
    const { state, addItem, updateItem, deleteMultipleItems } = useFirebase();
    const [formData, setFormData] = useState<Partial<Item>>({
        name: '', description: '', categoryId: '', type: ItemType.SINGLE,
        performanceType: PerformanceType.ON_STAGE, maxParticipants: 1, maxGroupsPerTeam: 1, duration: 5,
        medium: 'Any', points: { first: 5, second: 3, third: 1 }
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (editingItem) {
            setFormData({
                ...editingItem,
                name: editingItem.name || '',
                description: editingItem.description || '',
                categoryId: editingItem.categoryId || '',
                type: editingItem.type || ItemType.SINGLE,
                performanceType: editingItem.performanceType || PerformanceType.ON_STAGE,
                maxParticipants: editingItem.maxParticipants ?? 1,
                maxGroupsPerTeam: editingItem.maxGroupsPerTeam ?? 1,
                duration: editingItem.duration ?? 5,
                medium: editingItem.medium || 'Any',
                points: {
                    first: editingItem.points?.first ?? 5,
                    second: editingItem.points?.second ?? 3,
                    third: editingItem.points?.third ?? 1
                }
            });
        } else {
            setFormData({
                name: '', description: '', categoryId: '', type: ItemType.SINGLE,
                performanceType: PerformanceType.ON_STAGE, maxParticipants: 1, maxGroupsPerTeam: 1, duration: 5,
                medium: 'Any', points: { first: 5, second: 3, third: 1 }
            });
        }
    }, [editingItem, isOpen]);

    if (!isOpen || !state) return null;

    const handleSave = async () => {
        if (!formData.name || !formData.categoryId) return alert("Please fill Title and Category.");
        if (editingItem) await updateItem(formData as Item);
        else await addItem(formData as Omit<Item, 'id'>);
        onClose();
    };

    const handleDeleteConfirm = async () => {
        if (!editingItem) return;
        setIsDeleting(true);
        try {
            await deleteMultipleItems([editingItem.id]);
            setShowDeleteConfirm(false);
            onClose();
        } finally {
            setIsDeleting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden border border-zinc-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div>
                        <h3 className="font-serif font-black text-lg sm:text-2xl text-amazio-primary dark:text-white uppercase tracking-tighter leading-none">{editingItem ? 'Edit Entry' : 'Add New Item'}</h3>
                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Configure competition scope</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X size={20} sm:size={24} className="text-zinc-400" /></button>
                </div>

                <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Item Title</label>
                            <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 sm:p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. English Elocution" />
                        </div>

                        <div>
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Category</label>
                            <div className="relative">
                                <select value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})} className={selectClasses}>
                                    <option value="">Select Level</option>
                                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Medium</label>
                            <input value={formData.medium || ''} onChange={e => setFormData({...formData, medium: e.target.value})} className="w-full p-3 sm:p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold outline-none" placeholder="e.g. English" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Type</label>
                                <div className="relative">
                                    <select value={formData.type || ItemType.SINGLE} onChange={e => setFormData({...formData, type: e.target.value as ItemType, maxParticipants: e.target.value === ItemType.SINGLE ? 1 : 7})} className={selectClasses}>
                                        <option value={ItemType.SINGLE}>Single</option>
                                        <option value={ItemType.GROUP}>Group</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Venue</label>
                                <div className="relative">
                                    <select value={formData.performanceType || PerformanceType.ON_STAGE} onChange={e => setFormData({...formData, performanceType: e.target.value as PerformanceType})} className={selectClasses}>
                                        <option value={PerformanceType.ON_STAGE}>On-Stage</option>
                                        <option value={PerformanceType.OFF_STAGE}>Off-Stage</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] border border-zinc-100 dark:border-white/5 space-y-3 sm:space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400">Duration (Min)</label>
                                <input type="number" value={formData.duration ?? 5} onChange={e => setFormData({...formData, duration: +e.target.value})} className="w-16 sm:w-20 p-2 bg-white dark:bg-zinc-900 border rounded-lg sm:rounded-xl text-center font-black text-xs sm:text-base" />
                            </div>
                            {formData.type === ItemType.SINGLE ? (
                                <div className="flex justify-between items-center animate-in slide-in-from-top-2">
                                    <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#d4a574]">Limit / Team</label>
                                    <input type="number" value={formData.maxParticipants ?? 1} onChange={e => setFormData({...formData, maxParticipants: +e.target.value})} className="w-16 sm:w-20 p-2 bg-white dark:bg-zinc-900 border border-[#d4a574]/20 rounded-lg sm:rounded-xl text-center font-black text-[#d4a574] text-xs sm:text-base" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center animate-in slide-in-from-top-2">
                                        <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400">Max Teams Slots</label>
                                        <input type="number" value={formData.maxGroupsPerTeam ?? 1} onChange={e => setFormData({...formData, maxGroupsPerTeam: +e.target.value})} className="w-16 sm:w-20 p-2 bg-white dark:bg-zinc-900 border rounded-lg sm:rounded-xl text-center font-black text-xs sm:text-base" />
                                    </div>
                                    <div className="flex justify-between items-center animate-in slide-in-from-top-2">
                                        <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#1b5e20]">Group Size</label>
                                        <input type="number" value={formData.maxParticipants ?? 7} onChange={e => setFormData({...formData, maxParticipants: +e.target.value})} className="w-16 sm:w-20 p-2 bg-white dark:bg-zinc-900 border border-[#1b5e20]/20 rounded-lg sm:rounded-xl text-center font-black text-[#1b5e20] text-xs sm:text-base" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] border border-zinc-100 dark:border-white/5">
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 sm:mb-4">Point Weightage</label>
                            <div className="flex gap-2 sm:gap-4">
                                <div className="flex-1">
                                    <span className="block text-[7px] sm:text-[8px] font-black uppercase text-[#d4a574] mb-1 text-center">1st</span>
                                    <input type="number" value={formData.points?.first ?? 5} onChange={e => setFormData({...formData, points: {...(formData.points || { first: 5, second: 3, third: 1 }), first: +e.target.value}})} className="w-full p-2.5 rounded-lg sm:rounded-xl bg-white dark:bg-zinc-800 border text-center font-bold text-xs sm:text-base" />
                                </div>
                                <div className="flex-1">
                                    <span className="block text-[7px] sm:text-[8px] font-black uppercase text-slate-500 mb-1 text-center">2nd</span>
                                    <input type="number" value={formData.points?.second ?? 3} onChange={e => setFormData({...formData, points: {...(formData.points || { first: 5, second: 3, third: 1 }), second: +e.target.value}})} className="w-full p-2.5 rounded-lg sm:rounded-xl bg-white dark:bg-zinc-800 border text-center font-bold text-xs sm:text-base" />
                                </div>
                                <div className="flex-1">
                                    <span className="block text-[7px] sm:text-[8px] font-black uppercase text-orange-600 mb-1 text-center">3rd</span>
                                    <input type="number" value={formData.points?.third ?? 1} onChange={e => setFormData({...formData, points: {...(formData.points || { first: 5, second: 3, third: 1 }), third: +e.target.value}})} className="w-full p-2.5 rounded-lg sm:rounded-xl bg-white dark:bg-zinc-800 border text-center font-bold text-xs sm:text-base" />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Description</label>
                            <textarea rows={2} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 sm:p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium outline-none" placeholder="Detailed rules..." />
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-7 border-t border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    {editingItem ? (
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-3 py-2 sm:px-5 sm:py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5">
                            <Trash2 size={13} sm:size={15} /> Delete Item
                        </button>
                    ) : <div />}
                    <div className="flex justify-end gap-2 sm:gap-4">
                        <button onClick={onClose} className="px-4 py-3 sm:px-6 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amazio-primary transition-colors">Discard</button>
                        <button onClick={handleSave} className="px-6 py-3 sm:px-10 sm:py-4 bg-amazio-primary text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amazio-primary/20 hover:scale-105 active:scale-95 transition-all">Save Registry</button>
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Item"
                message={`Are you sure you want to delete "${editingItem?.name}"? This will permanently remove the item and all related registrations.`}
                confirmText="Delete Item"
                isLoading={isDeleting}
                onConfirm={handleDeleteConfirm}
                onClose={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
            />
        </div>,
        document.body
    );
};

export const ParticipantFormModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    editingParticipant: Participant | null;
    currentUser: User | null;
}> = ({ isOpen, onClose, editingParticipant, currentUser }) => {
    const { state, addParticipant, updateParticipant, deleteMultipleParticipants } = useFirebase();
    const [formData, setFormData] = useState<Partial<Participant>>({
        name: '', chestNumber: '', teamId: '', categoryId: '', itemIds: [], role: undefined
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (editingParticipant) {
            setFormData({
                ...editingParticipant,
                name: editingParticipant.name || '',
                chestNumber: editingParticipant.chestNumber || '',
                place: editingParticipant.place || '',
                teamId: editingParticipant.teamId || '',
                categoryId: editingParticipant.categoryId || '',
                itemIds: editingParticipant.itemIds || [],
                role: editingParticipant.role || undefined
            });
        } else {
            setFormData({
                name: '', chestNumber: '', place: '', teamId: '', categoryId: '', itemIds: [], role: undefined
            });
        }
    }, [editingParticipant, isOpen]);

    if (!isOpen || !state) return null;

    const handleSave = async () => {
        if (!formData.name || !formData.teamId || !formData.categoryId) return alert("Please fill Name, Team and Category.");
        if (editingParticipant) await updateParticipant(formData as Participant);
        else await addParticipant(formData as Omit<Participant, 'id'>);
        onClose();
    };

    const handleDeleteConfirm = async () => {
        if (!editingParticipant) return;
        setIsDeleting(true);
        try {
            await deleteMultipleParticipants([editingParticipant.id]);
            setShowDeleteConfirm(false);
            onClose();
        } finally {
            setIsDeleting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] overflow-hidden border border-zinc-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div>
                        <h3 className="font-serif font-black text-lg sm:text-2xl text-amazio-primary dark:text-white uppercase tracking-tighter leading-none">{editingParticipant ? 'Edit Profile' : 'Register Delegate'}</h3>
                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Manage individual identity</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X size={20} sm:size={24} className="text-zinc-400" /></button>
                </div>

                <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-6">
                    <div className="space-y-3 sm:space-y-4">
                        <div>
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Full Name</label>
                            <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 sm:p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. John Doe" />
                        </div>

                        <div>
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Chest Number / ID</label>
                            <input value={formData.chestNumber || ''} onChange={e => setFormData({...formData, chestNumber: e.target.value})} className="w-full p-3 sm:p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. 101" />
                        </div>

                        <div>
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Place / Location</label>
                            <input value={formData.place || ''} onChange={e => setFormData({...formData, place: e.target.value})} className="w-full p-3 sm:p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Malappuram" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Team / House</label>
                                <div className="relative">
                                    <select value={formData.teamId || ''} onChange={e => setFormData({...formData, teamId: e.target.value})} className={selectClasses}>
                                        <option value="">Select Team</option>
                                        {state.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Level / Category</label>
                                <div className="relative">
                                    <select value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})} className={selectClasses}>
                                        <option value="">Select Level</option>
                                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 sm:mb-2 ml-1">Registry Role</label>
                            <div className="relative">
                                <select value={formData.role || ''} onChange={e => setFormData({...formData, role: (e.target.value || undefined) as any})} className={selectClasses}>
                                    <option value="">Standard Delegate</option>
                                    <option value="leader">Team Leader</option>
                                    <option value="assistant">Assistant Leader</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-7 border-t border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    {editingParticipant ? (
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-3 py-2 sm:px-5 sm:py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5">
                            <Trash2 size={13} sm:size={15} /> Delete Delegate
                        </button>
                    ) : <div />}
                    <div className="flex justify-end gap-2 sm:gap-4">
                        <button onClick={onClose} className="px-4 py-3 sm:px-6 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amazio-primary transition-colors">Discard</button>
                        <button onClick={handleSave} className="px-6 py-3 sm:px-10 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amazio-primary/20 hover:scale-105 active:scale-95 transition-all">Save Profile</button>
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Delegate"
                message={`Are you sure you want to delete delegate "${editingParticipant?.name}"? This will permanently remove their profile and all event registrations.`}
                confirmText="Delete Delegate"
                isLoading={isDeleting}
                onConfirm={handleDeleteConfirm}
                onClose={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
            />
        </div>,
        document.body
    );
};

// --- Main Components ---

const ItemsManagement: React.FC = () => {
    const { state, currentUser, deleteMultipleItems, deleteMultipleParticipants, updateMultipleParticipants, globalFilters, globalSearchTerm, itemsSubView: activeTab } = useFirebase();
    
    // Items State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    
    // In-UI Confirmation Modal State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        action?: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

    const executeConfirm = async () => {
        if (!confirmDialog.action) return;
        setIsActionLoading(true);
        try {
            await confirmDialog.action();
            setConfirmDialog(prev => ({ ...prev, isOpen: false, action: undefined }));
        } catch (err) {
            console.error("Deletion failed:", err);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const [itemSort, setItemSort] = useState<{ 
        sortKey: ItemSortKey;
        dir: 'asc' | 'desc';
    }>({ sortKey: 'name', dir: 'asc' });
    
    // Unified Registry State (Individuals + Groups)
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroupEntry, setEditingGroupEntry] = useState<any>(null);
    const [selectedRegistryIds, setSelectedRegistryIds] = useState<Set<string>>(new Set());
    
    const [participantSort, setParticipantSort] = useState<{ 
        sortKey: ParticipantSortKey;
        dir: 'asc' | 'desc';
    }>({ sortKey: 'chestNumber', dir: 'asc' });

    // Touch & Long Press Logic
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressActive = useRef(false);
    const touchStartPos = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);

    const handleTouchStart = useCallback((id: string, type: 'ITEM' | 'REGISTRY', e: React.TouchEvent) => {
        if (window.innerWidth >= 768) return;
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        hasMoved.current = false;
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            if (hasMoved.current) return;
            isLongPressActive.current = true;
            const updateSet = type === 'ITEM' ? setSelectedItems : setSelectedRegistryIds;
            updateSet(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10) {
            hasMoved.current = true;
            if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        }
    }, []);

    const handleTouchEnd = useCallback((id: string, type: 'ITEM' | 'REGISTRY') => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (window.innerWidth < 768 && !isLongPressActive.current && !hasMoved.current) {
            const updateSet = type === 'ITEM' ? setSelectedItems : setSelectedRegistryIds;
            updateSet(prev => {
                if (prev.size === 0) return prev; 
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
            });
        }
    }, []);

    const handleRegistryClick = useCallback((id: string, type: 'ITEM' | 'REGISTRY') => {
        if (window.innerWidth >= 768) {
            const updateSet = type === 'ITEM' ? setSelectedItems : setSelectedRegistryIds;
            updateSet(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
            });
        }
    }, []);

    // --- Items Logic ---
    const filteredAndSortedItems = useMemo<Item[]>(() => {
        if (!state) return [];
        const { sortKey, dir } = itemSort;
        const multiplier = dir === 'asc' ? 1 : -1;
        const { items, categories } = state;
        return items.filter((item: Item) => {
            const searchMatch = item.name.toLowerCase().includes(globalSearchTerm.toLowerCase());
            const categoryMatch = globalFilters.categoryId.length > 0 ? globalFilters.categoryId.includes(item.categoryId) : true;
            const pt = String(item.performanceType);
            const performanceTypeMatch = globalFilters.performanceType.length > 0 ? globalFilters.performanceType.includes(pt) : true;
            return searchMatch && categoryMatch && performanceTypeMatch;
        }).sort((a: Item, b: Item) => {
            switch (sortKey) {
                case 'category': {
                    const catA = categories.find(c => c.id === a.categoryId)?.name || '';
                    const catB = categories.find(c => c.id === b.categoryId)?.name || '';
                    return catA.localeCompare(catB) * multiplier;
                }
                case 'type': return String(a.type).localeCompare(String(b.type)) * multiplier;
                case 'performance': return String(a.performanceType).localeCompare(String(b.performanceType)) * multiplier;
                case 'name': return a.name.localeCompare(b.name) * multiplier;
                case 'duration': return (a.duration - b.duration) * multiplier;
                case 'maxParticipants': return (a.maxParticipants - b.maxParticipants) * multiplier;
                default: return 0;
            }
        });
    }, [state, globalSearchTerm, globalFilters, itemSort]);

    const handleItemSort = (newKey: ItemSortKey) => { setItemSort(prev => ({ sortKey: newKey, dir: prev.sortKey === newKey && prev.dir === 'asc' ? 'desc' : 'asc' })); };
    const isAllItemsVisibleSelected = useMemo(() => filteredAndSortedItems.length > 0 && filteredAndSortedItems.every(i => selectedItems.has(i.id)), [filteredAndSortedItems, selectedItems]);
    const toggleAllItemsSelect = () => setSelectedItems(isAllItemsVisibleSelected ? new Set() : new Set(filteredAndSortedItems.map(i => i.id)));

    // --- Unified Registry Logic (Individuals + Groups) ---
    const registryEntries = useMemo(() => {
        if (!state) return [];
        const { participants, items, teams, categories } = state;
        const entries: any[] = participants.map(p => ({
            ...p, entryType: 'INDIVIDUAL', displayName: p.name,
            displayCategory: categories.find(c => c.id === p.categoryId)?.name || 'N/A',
            displayTeam: teams.find(t => t.id === p.teamId)?.name || 'N/A',
            sortName: p.name, sortChest: p.chestNumber,
            role: p.role // leader or assistant
        }));

        items.filter(i => i.type === ItemType.GROUP).forEach(item => {
            teams.forEach(team => {
                const maxGroups = item.maxGroupsPerTeam || 1;
                const activeGroupsIndices: number[] = [];
                for (let gIdx = 1; gIdx <= maxGroups; gIdx++) {
                    const hasMembers = participants.some(p => p.teamId === team.id && p.itemIds.includes(item.id) && (p.itemGroups?.[item.id] || 1) === gIdx);
                    if (hasMembers) activeGroupsIndices.push(gIdx);
                }
                activeGroupsIndices.forEach(gIdx => {
                    const members = participants.filter(p => p.teamId === team.id && p.itemIds.includes(item.id) && (p.itemGroups?.[item.id] || 1) === gIdx);
                    const leader = members.find(p => p.groupLeaderItemIds?.includes(item.id)) || members[0];
                    const groupChest = leader.groupChestNumbers?.[item.id] || '';
                    const suffix = activeGroupsIndices.length > 1 ? ` (G${gIdx})` : '';
                    const groupDisplayName = `${item.name}${suffix}`;
                    entries.push({
                        id: `group_${item.id}_${team.id}_${gIdx}`, itemId: item.id, teamId: team.id, groupIndex: gIdx,
                        entryType: 'GROUP', chestNumber: groupChest, name: groupDisplayName,
                        displayName: groupDisplayName,
                        displayCategory: categories.find(c => c.id === item.categoryId)?.name || 'N/A',
                        displayTeam: team.name, categoryId: item.categoryId, sortName: groupDisplayName,
                        sortChest: groupChest, leaderId: leader.id
                    });
                });
            });
        });

        const filtered = entries.filter(e => {
            const matchesSearch = e.displayName.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
                                 e.chestNumber.toLowerCase().includes(globalSearchTerm.toLowerCase());
            const matchesTeam = globalFilters.teamId.length > 0 ? globalFilters.teamId.includes(e.teamId) : true;
            const matchesCategory = globalFilters.categoryId.length > 0 ? globalFilters.categoryId.includes(e.categoryId) : true;
            return matchesSearch && matchesTeam && matchesCategory;
        });

        const { sortKey, dir } = participantSort;
        const multiplier = dir === 'asc' ? 1 : -1;
        return filtered.sort((a, b) => {
            if (sortKey === 'chestNumber') return a.sortChest.localeCompare(b.sortChest, undefined, { numeric: true }) * multiplier;
            if (sortKey === 'name') return a.sortName.localeCompare(b.sortName) * multiplier;
            if (sortKey === 'team') return a.displayTeam.localeCompare(b.displayTeam) * multiplier;
            if (sortKey === 'category') return a.displayCategory.localeCompare(b.displayCategory) * multiplier;
            return 0;
        });
    }, [state, globalSearchTerm, globalFilters, participantSort]);

    const handleParticipantSort = (newKey: ParticipantSortKey) => { setParticipantSort(prev => ({ sortKey: newKey, dir: prev.sortKey === newKey && prev.dir === 'asc' ? 'desc' : 'asc' })); };
    const isAllRegistryVisibleSelected = useMemo(() => registryEntries.length > 0 && registryEntries.every(r => selectedRegistryIds.has(r.id)), [registryEntries, selectedRegistryIds]);
    const toggleAllRegistrySelect = () => setSelectedRegistryIds(isAllRegistryVisibleSelected ? new Set() : new Set(registryEntries.map(r => r.id)));

    const handleDeleteSingleItem = (item: Item) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Item',
            message: `Are you sure you want to delete "${item.name}"? This will permanently remove the item and all related registrations.`,
            confirmText: 'Delete Item',
            action: async () => {
                await deleteMultipleItems([item.id]);
                setSelectedItems(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
            }
        });
    };

    const handleDeleteSelectedItems = () => {
        if (selectedItems.size === 0) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Selected Items',
            message: `Confirm deletion of ${selectedItems.size} selected item(s)? This will permanently remove them and all related registrations.`,
            confirmText: `Delete (${selectedItems.size})`,
            action: async () => {
                await deleteMultipleItems(Array.from(selectedItems));
                setSelectedItems(new Set());
            }
        });
    };

    const handleDeleteSingleRegistry = (entry: any) => {
        if (entry.entryType === 'GROUP') {
            setConfirmDialog({
                isOpen: true,
                title: 'Disband Group',
                message: `Are you sure you want to disband group "${entry.displayName}"? All enrolled members will be unassigned from this item.`,
                confirmText: 'Disband Group',
                action: async () => {
                    const members = state?.participants.filter(p => 
                        p.teamId === entry.teamId && p.itemIds.includes(entry.itemId) && (p.itemGroups?.[entry.itemId] || 1) === entry.groupIndex
                    ) || [];
                    if (members.length > 0) {
                        const updates = members.map(m => {
                            const nextItemIds = m.itemIds.filter(id => id !== entry.itemId);
                            const nextItemGroups = { ...(m.itemGroups || {}) };
                            delete nextItemGroups[entry.itemId];
                            const nextLeaders = (m.groupLeaderItemIds || []).filter(id => id !== entry.itemId);
                            const nextChests = { ...(m.groupChestNumbers || {}) };
                            delete nextChests[entry.itemId];
                            return {
                                ...m,
                                itemIds: nextItemIds,
                                itemGroups: nextItemGroups,
                                groupLeaderItemIds: nextLeaders,
                                groupChestNumbers: nextChests
                            };
                        });
                        await updateMultipleParticipants(updates);
                    }
                    setSelectedRegistryIds(prev => {
                        const next = new Set(prev);
                        next.delete(entry.id);
                        return next;
                    });
                }
            });
        } else {
            setConfirmDialog({
                isOpen: true,
                title: 'Delete Delegate',
                message: `Are you sure you want to delete delegate "${entry.displayName}"? This will permanently remove their profile and all event registrations.`,
                confirmText: 'Delete Delegate',
                action: async () => {
                    await deleteMultipleParticipants([entry.id]);
                    setSelectedRegistryIds(prev => {
                        const next = new Set(prev);
                        next.delete(entry.id);
                        return next;
                    });
                }
            });
        }
    };

    const handleRegistryDelete = () => {
        if (!state) return;
        const selected = Array.from(selectedRegistryIds);
        if (selected.length === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Delete Selected Records',
            message: `Confirm deletion of ${selected.length} selected registry record(s)? Group entries will be disbanded and delegate profiles will be removed.`,
            confirmText: `Delete (${selected.length})`,
            action: async () => {
                const participantIds = selected.filter((id: string) => !id.startsWith('group_'));
                const groupEntryIds = selected.filter((id: string) => id.startsWith('group_'));

                const promises: Promise<any>[] = [];

                if (participantIds.length > 0) {
                    promises.push(deleteMultipleParticipants(participantIds));
                }

                if (groupEntryIds.length > 0) {
                    const updatedParticipantsMap = new Map<string, Participant>();
                    groupEntryIds.forEach(groupId => {
                        const parts = groupId.split('_');
                        if (parts.length >= 4) {
                            const itemId = parts[1];
                            const teamId = parts[2];
                            const gIdx = parseInt(parts[3], 10) || 1;

                            state.participants.forEach(p => {
                                const currentP = updatedParticipantsMap.get(p.id) || p;
                                if (currentP.teamId === teamId && currentP.itemIds.includes(itemId) && (currentP.itemGroups?.[itemId] || 1) === gIdx) {
                                    const nextItemIds = currentP.itemIds.filter(id => id !== itemId);
                                    const nextItemGroups = { ...(currentP.itemGroups || {}) };
                                    delete nextItemGroups[itemId];
                                    const nextLeaders = (currentP.groupLeaderItemIds || []).filter(id => id !== itemId);
                                    const nextChests = { ...(currentP.groupChestNumbers || {}) };
                                    delete nextChests[itemId];
                                    updatedParticipantsMap.set(p.id, {
                                        ...currentP,
                                        itemIds: nextItemIds,
                                        itemGroups: nextItemGroups,
                                        groupLeaderItemIds: nextLeaders,
                                        groupChestNumbers: nextChests
                                    });
                                }
                            });
                        }
                    });

                    if (updatedParticipantsMap.size > 0) {
                        promises.push(updateMultipleParticipants(Array.from(updatedParticipantsMap.values())));
                    }
                }

                await Promise.all(promises);
                setSelectedRegistryIds(new Set());
            }
        });
    };

    if (!state) return null;

    return (
        <div className="space-y-4 sm:space-y-10 pb-10 animate-in fade-in duration-700 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl sm:text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Items & Participants</h2>
                    <p className="text-xs sm:text-lg text-zinc-500 dark:text-zinc-400 mt-2 sm:mt-3 font-medium italic">System configuration for events and delegacy.</p>
                </div>
                <div className="flex items-center gap-3 pb-1">
                    <div className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Registry:</span>
                        <span className="ml-2 text-sm font-black text-amazio-primary dark:text-white tabular-nums">
                            {activeTab === 'ITEMS' ? filteredAndSortedItems.length : registryEntries.length}
                        </span>
                        <span className="ml-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Records</span>
                    </div>
                </div>
            </div>

            {activeTab === 'ITEMS' && (
                <div className="animate-in slide-in-from-left duration-500">
                    <Card title="Item Registry" action={<span className="text-[8px] sm:text-[10px] font-black text-zinc-500 dark:text-zinc-300 uppercase tracking-widest">{filteredAndSortedItems.length} Records</span>}>
                        <div className="space-y-4 sm:space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center">
                                    <SortButton label="Name" sortKey="name" currentSortKey={itemSort.sortKey} currentSortDir={itemSort.dir} onSort={handleItemSort} />
                                    <SortButton label="Type" sortKey="type" currentSortKey={itemSort.sortKey} currentSortDir={itemSort.dir} onSort={handleItemSort} />
                                    <SortButton label="Perf." sortKey="performance" currentSortKey={itemSort.sortKey} currentSortDir={itemSort.dir} onSort={handleItemSort} />
                                </div>
                                <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-amazio-primary text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amazio-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={14} sm:size={16}/> New Record</button>
                            </div>

                            {selectedItems.size > 0 && ReactDOM.createPortal(
                                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-4xl animate-in slide-in-from-bottom-8 duration-500">
                                    <div className="p-1.5 sm:p-2 bg-[#090A0C]/95 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-between shadow-2xl border border-white/10">
                                        <button onClick={toggleAllItemsSelect} className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all flex items-center gap-2 ${isAllItemsVisibleSelected ? 'bg-[#006994] text-white' : 'text-zinc-500 hover:text-white'}`}>{isAllItemsVisibleSelected ? <CheckSquare size={16} sm:size={20} strokeWidth={3} /> : <Square size={16} sm:size={20} strokeWidth={3} />} <span className="hidden sm:inline text-[9px] sm:text-[11px] font-black uppercase tracking-widest">{isAllItemsVisibleSelected ? 'Release' : 'All'}</span></button>
                                        <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2">
                                            {selectedItems.size === 1 && <button onClick={() => { const id = Array.from(selectedItems)[0]; setEditingItem(state.items.find(i=>i.id===id)||null); setIsModalOpen(true); }} className="px-3 py-2 sm:px-6 sm:py-3.5 bg-white text-black rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5"><Edit2 size={10} sm:size={12} strokeWidth={3}/> Edit</button>}
                                            <button onClick={handleDeleteSelectedItems} className="px-3 py-2 sm:px-6 sm:py-3.5 bg-rose-600 text-white rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5"><Trash2 size={12} sm:size={14} strokeWidth={3}/> <span>Delete ({selectedItems.size})</span></button>
                                            <button onClick={() => setSelectedItems(new Set())} className="p-2 sm:p-3 text-zinc-500 hover:text-white rounded-lg sm:rounded-2xl transition-all"><X size={16} sm:size={20} strokeWidth={3} /></button>
                                        </div>
                                    </div>
                                </div>, document.body
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                {filteredAndSortedItems.map(item => {
                                    const isSelected = selectedItems.has(item.id);
                                    const cat = state.categories.find(c => c.id === item.categoryId);
                                    const theme = getThemeColor(cat?.name || 'N/A');
                                    return (
                                        <div key={item.id} onClick={() => handleRegistryClick(item.id, 'ITEM')} onTouchStart={(e) => handleTouchStart(item.id, 'ITEM', e)} onTouchMove={handleTouchMove} onTouchEnd={() => handleTouchEnd(item.id, 'ITEM')} className={`relative p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group ${isSelected ? `border-[#d4a574] bg-zinc-50 dark:bg-zinc-800/50 shadow-lg scale-[1.01] z-10` : 'bg-white dark:bg-[#121412] border-zinc-100 dark:border-white/5 hover:border-zinc-200 shadow-sm'}`}>
                                            <div className="space-y-3 sm:space-y-4 relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest border transition-all" style={{ backgroundColor: `${theme.hex}15`, color: theme.hex, borderColor: `${theme.hex}30` }}>{cat?.name || 'N/A'}</div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsModalOpen(true); }} className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isSelected ? 'text-zinc-600 dark:text-zinc-300 bg-white/50 opacity-100' : 'text-zinc-400 group-hover:text-amazio-primary hover:bg-zinc-100 dark:hover:bg-white/5'}`} title="Edit Item"><Edit2 size={16} sm:size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSingleItem(item); }} className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isSelected ? 'text-rose-600 bg-white/50 opacity-100' : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`} title="Delete Item"><Trash2 size={16} sm:size={18} /></button>
                                                    </div>
                                                </div>
                                                <div><h3 className={`text-base sm:text-xl font-black uppercase tracking-tight leading-tight mb-1 sm:mb-2 transition-colors ${isSelected ? 'text-amazio-primary dark:text-white' : 'text-amazio-primary dark:text-zinc-100'}`}>{item.name}</h3></div>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2"><TypeBadge type={item.type} /><PerformanceBadge type={item.performanceType} /></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'PARTICIPANTS' && (
                <div className="animate-in slide-in-from-right duration-500">
                    <Card title="Registry Content" action={<span className="text-[8px] sm:text-[10px] font-black text-zinc-500 dark:text-zinc-300 uppercase tracking-widest">{registryEntries.length} Records</span>}>
                        <div className="space-y-4 sm:space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center">
                                    <SortButton label="Reg#" sortKey="chestNumber" currentSortKey={participantSort.sortKey} currentSortDir={participantSort.dir} onSort={handleParticipantSort} />
                                    <SortButton label="Name" sortKey="name" currentSortKey={participantSort.sortKey} currentSortDir={participantSort.dir} onSort={handleParticipantSort} />
                                    <SortButton label="Team" sortKey="team" currentSortKey={participantSort.sortKey} currentSortDir={participantSort.dir} onSort={handleParticipantSort} />
                                </div>
                                <button onClick={() => { setEditingParticipant(null); setIsParticipantModalOpen(true); }} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-[#1b5e20] text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#1b5e20]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"><UserPlus size={14} sm:size={16}/> Register Delegate</button>
                            </div>

                            {selectedRegistryIds.size > 0 && ReactDOM.createPortal(
                                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-4xl animate-in slide-in-from-bottom-8 duration-500">
                                    <div className="p-1.5 sm:p-2 bg-[#090A0C]/95 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-between shadow-2xl border border-white/10">
                                        <button onClick={toggleAllRegistrySelect} className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all flex items-center gap-2 ${isAllRegistryVisibleSelected ? 'bg-[#1b5e20] text-white' : 'text-zinc-500 hover:text-white'}`}>{isAllRegistryVisibleSelected ? <CheckSquare size={16} sm:size={20} strokeWidth={3} /> : <Square size={16} sm:size={20} strokeWidth={3} />} <span className="hidden sm:inline text-[9px] sm:text-[11px] font-black uppercase tracking-widest">{isAllRegistryVisibleSelected ? 'Release' : 'All'}</span></button>
                                        <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2">
                                            <button onClick={handleRegistryDelete} className="px-3 py-2 sm:px-6 sm:py-3.5 bg-rose-600 text-white rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5"><Trash2 size={12} sm:size={14} strokeWidth={3}/> <span>Delete ({selectedRegistryIds.size})</span></button>
                                            <button onClick={() => setSelectedRegistryIds(new Set())} className="p-2 sm:p-3 text-zinc-500 hover:text-white rounded-lg sm:rounded-2xl transition-all"><X size={16} sm:size={20} strokeWidth={3} /></button>
                                        </div>
                                    </div>
                                </div>, document.body
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 items-start">
                                {registryEntries.map(entry => {
                                    const isSelected = selectedRegistryIds.has(entry.id);
                                    const isGroup = entry.entryType === 'GROUP';
                                    const chestColor = isGroup ? ART_FEST_PALETTE.FOREST_GREEN : ART_FEST_PALETTE.OCEAN_BLUE;
                                    
                                    return (
                                        <div key={entry.id} onClick={() => handleRegistryClick(entry.id, 'REGISTRY')} onTouchStart={(e) => handleTouchStart(entry.id, 'REGISTRY', e)} onTouchMove={handleTouchMove} onTouchEnd={() => handleTouchEnd(entry.id, 'REGISTRY')} className={`relative p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer group flex flex-col ${isSelected ? 'border-amber-600 bg-zinc-50 dark:bg-zinc-800/50 shadow-lg scale-[1.01] z-10' : 'bg-white dark:bg-[#121412] border-[#a8dadc]/40 dark:border-white/5 hover:border-[#a8dadc]'}`}>
                                            <div className="space-y-2 relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col gap-1 sm:gap-1.5">
                                                        <div 
                                                            className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest border transition-all ${entry.chestNumber ? 'text-white shadow-md' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 border-zinc-200'}`}
                                                            style={entry.chestNumber ? { backgroundColor: chestColor, borderColor: chestColor } : {}}
                                                        >
                                                            {entry.chestNumber ? `ID# ${entry.chestNumber}` : 'No ID'}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            <div className={`px-1.5 py-0.5 rounded-md text-[7px] sm:text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 ${isGroup ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>{isGroup ? <Users size={8} sm:size={10} strokeWidth={3}/> : <UserIcon size={8} sm:size={10} strokeWidth={3}/>} {isGroup ? 'Group' : 'Delegate'}</div>
                                                            {entry.role === 'leader' && (
                                                                <div className="px-1.5 py-0.5 rounded-md text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-1 bg-gradient-to-r from-[#2d6a4f] to-[#1d9488] text-white shadow-md border border-white/20"><Crown size={8} sm:size={10} strokeWidth={3}/> Leader</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); if(isGroup) { setEditingGroupEntry(entry); setIsGroupModalOpen(true); } else { setEditingParticipant(entry); setIsParticipantModalOpen(true); } }} className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isSelected ? 'text-zinc-600 dark:text-zinc-300 bg-white/50 opacity-100' : 'text-zinc-400 group-hover:text-amazio-primary hover:bg-zinc-100 dark:hover:bg-white/5'}`} title="Edit"><Edit2 size={16} sm:size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSingleRegistry(entry); }} className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isSelected ? 'text-rose-600 bg-white/50 opacity-100' : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`} title="Delete"><Trash2 size={16} sm:size={18} /></button>
                                                    </div>
                                                </div>
                                                <div><h3 className={`text-sm sm:text-lg font-black uppercase tracking-tight leading-tight mb-0.5 sm:mb-1 transition-colors ${isSelected ? 'text-amazio-primary dark:text-white' : 'text-amazio-primary dark:text-zinc-100'}`}>{entry.displayName}</h3>{entry.place && !isGroup && <div className="text-[8px] sm:text-[10px] font-bold text-zinc-500 italic flex items-center gap-1"><MapPin size={8} sm:size={10}/> {entry.place}</div>}</div>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                                                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] border" style={{ backgroundColor: `${ART_FEST_PALETTE.SAND_YELLOW}10`, color: ART_FEST_PALETTE.SAND_YELLOW, borderColor: `${ART_FEST_PALETTE.SAND_YELLOW}30` }}>{entry.displayTeam}</span>
                                                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] border" style={{ backgroundColor: `${ART_FEST_PALETTE.SOFT_BLUE}10`, color: ART_FEST_PALETTE.OCEAN_BLUE, borderColor: `${ART_FEST_PALETTE.SOFT_BLUE}30` }}>{entry.displayCategory}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <ItemFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingItem={editingItem} />
            <ParticipantFormModal isOpen={isParticipantModalOpen} onClose={() => setIsParticipantModalOpen(false)} editingParticipant={editingParticipant} currentUser={currentUser} />
            <GroupEntryModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} entry={editingGroupEntry} />

            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText || 'Delete'}
                isLoading={isActionLoading}
                onConfirm={executeConfirm}
                onClose={() => { if (!isActionLoading) setConfirmDialog(prev => ({ ...prev, isOpen: false })); }}
            />
        </div>
    );
};

export default ItemsManagement;