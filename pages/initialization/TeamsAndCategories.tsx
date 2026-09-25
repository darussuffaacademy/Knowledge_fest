import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useFirebase } from '../../hooks/useFirebase';
import { 
    Users, Layers, Search, Plus, Trash2, Edit3, Check, X, 
    Shield, LayoutGrid, MoreHorizontal, AlertCircle, 
    UserPlus, User as UserIcon, ShieldCheck, UserCog,
    Filter, ArrowRight
} from 'lucide-react';
import { Category, Team, Participant } from '../../types';
import Card from '../../components/Card';
import { ConfirmModal } from '../../components/ConfirmModal';

// --- Utils ---

const getThemeColor = (str: string) => {
    if (!str) return { bg: 'bg-zinc-500', text: 'text-zinc-600', border: 'border-zinc-200', light: 'bg-zinc-50 dark:bg-zinc-900/30', shadow: 'shadow-zinc-500/10' };
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; 
    }
    const themes = [
        { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', light: 'bg-indigo-50 dark:bg-indigo-900/20', shadow: 'shadow-indigo-500/10' },
        { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', light: 'bg-emerald-50 dark:bg-indigo-900/20', shadow: 'shadow-emerald-500/10' },
        { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', light: 'bg-amber-50 dark:bg-amber-900/10', shadow: 'shadow-amber-500/10' },
        { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', light: 'bg-rose-50 dark:bg-rose-900/20', shadow: 'shadow-rose-500/10' },
        { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', light: 'bg-purple-50 dark:bg-fuchsia-900/20', shadow: 'shadow-purple-500/10' },
        { bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', light: 'bg-sky-50 dark:bg-sky-900/20', shadow: 'shadow-sky-500/10' },
        { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', light: 'bg-teal-50 dark:bg-teal-900/20', shadow: 'shadow-teal-500/10' },
        { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', light: 'bg-orange-50 dark:bg-orange-900/20', shadow: 'shadow-orange-500/10' },
        { bg: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', light: 'bg-cyan-50 dark:bg-cyan-900/20', shadow: 'shadow-cyan-500/10' },
        { bg: 'bg-lime-500', text: 'text-lime-600 dark:text-lime-400', border: 'border-lime-200 dark:border-lime-800', light: 'bg-lime-50 dark:bg-lime-900/20', shadow: 'shadow-lime-500/10' },
        { bg: 'bg-fuchsia-500', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-200 dark:border-fuchsia-800', light: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', shadow: 'shadow-fuchsia-500/10' },
        { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', light: 'bg-violet-50 dark:bg-violet-900/20', shadow: 'shadow-violet-500/10' },
    ];
    return themes[Math.abs(hash) % themes.length];
};

// --- Components ---

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
    <div className="relative overflow-hidden bg-white dark:bg-zinc-900/50 rounded-3xl p-6 shadow-sm group hover:shadow-md transition-all">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform ${color}`}></div>
        <div className="relative z-10 flex items-center justify-between">
            <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</p>
                <p className="text-4xl font-black text-zinc-800 dark:text-white mt-1 font-serif tracking-tight">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${color}`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
        </div>
    </div>
);

// --- Entity Manager Component ---

interface EntityManagerProps<T extends { id: string; name: string }> {
    items: T[];
    onAdd: () => void;
    onUpdate: (item: T) => void;
    onDelete: (ids: string[]) => void;
    type: 'TEAM' | 'CATEGORY';
    globalSettings?: any;
    participants: Participant[];
}

const EntityManager = <T extends { id: string; name: string }>({
    items, onAdd, onUpdate, onDelete, type, globalSettings, participants
}: EntityManagerProps<T>) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        action?: () => Promise<void> | void;
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
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        let res = [...items];
        if (searchQuery) res = res.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        res.sort((a, b) => a.name.localeCompare(b.name));
        return res;
    }, [items, searchQuery]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const LimitBadge = ({ label, val, globalVal }: { label: string, val?: number, globalVal?: number | null }) => {
        if (val === undefined) return null;
        const isCapped = globalVal !== undefined && globalVal !== null && val > globalVal;
        return (
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-[10px] font-mono leading-none ${isCapped ? 'bg-rose-50 text-rose-600 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-sm'}`}>
                <span className="font-bold text-xs">{val}</span>
                <span className="text-[8px] uppercase opacity-60 mt-0.5 font-sans">{label}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 sm:px-0">
                <div className="relative flex-grow max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${type.toLowerCase()}s...`} 
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-sm font-medium focus:ring-2 focus:ring-amazio-primary/20 outline-none transition-all shadow-inner border-none"
                    />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {selectedIds.size > 0 && (
                        <button 
                            onClick={() => {
                                setConfirmDialog({
                                    isOpen: true,
                                    title: `Delete Selected ${type === 'TEAM' ? 'Teams' : 'Categories'}`,
                                    message: `Confirm deletion of ${selectedIds.size} selected record(s)? This cannot be undone.`,
                                    confirmText: `Delete (${selectedIds.size})`,
                                    action: () => {
                                        onDelete(Array.from(selectedIds));
                                        setSelectedIds(new Set());
                                    }
                                });
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-lg active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            <Trash2 size={16} /> Delete ({selectedIds.size})
                        </button>
                    )}
                    <button 
                        onClick={onAdd}
                        className="flex items-center gap-2 px-6 py-3 bg-amazio-primary text-white rounded-2xl hover:bg-amazio-secondary transition-all shadow-lg shadow-amazio-primary/20 active:scale-95 text-xs font-black uppercase tracking-widest"
                    >
                        <Plus size={18} strokeWidth={3} /> New {type === 'TEAM' ? 'Team' : 'Category'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const category = type === 'CATEGORY' ? item as unknown as Category : null;
                    const teamParticipants = type === 'TEAM' ? participants.filter(p => p.teamId === item.id) : [];
                    
                    // Color selection based on name
                    const theme = getThemeColor(item.name);
                    
                    // Logic to find leaders: use explicit role property
                    const leaders = teamParticipants.filter(p => p.role === 'leader');
                    const assistants = teamParticipants.filter(p => p.role === 'assistant');

                    return (
                        <div 
                            key={item.id}
                            onClick={() => toggleSelect(item.id)}
                            className={`group relative bg-white dark:bg-zinc-900/40 transition-all duration-300 rounded-[2.5rem] p-6 flex flex-col justify-between h-full cursor-pointer border-none ${isSelected ? `bg-amazio-secondary/10 ring-4 ring-amazio-secondary/5 scale-[1.02] shadow-xl` : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-sm'}`}
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? theme.bg + ' text-white shadow-lg' : theme.light + ' ' + theme.text + ' shadow-sm'}`}>
                                        {type === 'TEAM' ? <Users size={24} /> : <Layers size={24} />}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onUpdate(item); }}
                                            className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isSelected ? 'text-amazio-secondary hover:bg-amazio-secondary/10' : 'text-zinc-300 hover:text-amazio-primary hover:bg-zinc-100 dark:hover:bg-white/5'}`}
                                            title="Edit"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: `Delete ${type === 'TEAM' ? 'Team' : 'Category'}`,
                                                    message: `Are you sure you want to delete "${item.name}"? This will permanently remove it from the competition.`,
                                                    confirmText: 'Delete',
                                                    action: () => {
                                                        onDelete([item.id]);
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(item.id);
                                                            return next;
                                                        });
                                                    }
                                                });
                                            }}
                                            className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isSelected ? 'text-rose-600 hover:bg-rose-50' : 'text-zinc-300 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        {isSelected && <div className="p-2 bg-amazio-secondary rounded-xl text-white shadow-inner"><Check size={18} strokeWidth={3} /></div>}
                                    </div>
                                </div>

                                <div>
                                    <h4 className={`text-xl font-black uppercase tracking-tight leading-tight mb-1 truncate ${isSelected ? 'text-amazio-primary dark:text-white' : 'text-zinc-800 dark:text-zinc-100'}`}>
                                        {item.name}
                                    </h4>
                                    
                                    {type === 'CATEGORY' && category && (
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${category.isGeneralCategory ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                {category.isGeneralCategory ? 'General Scope' : 'Standard Level'}
                                            </span>
                                        </div>
                                    )}

                                    {type === 'TEAM' && (
                                        <div className="space-y-2 mt-4">
                                            <div className={`flex items-center gap-2 ${isSelected ? 'text-amazio-primary/60' : 'text-zinc-400'}`}>
                                                <ShieldCheck size={14} className="shrink-0" />
                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                                    Lead: {leaders.length > 0 ? leaders[0].name : 'Not Assigned'}
                                                </span>
                                            </div>
                                            <div className={`flex items-center gap-2 ${isSelected ? 'text-amazio-primary/60' : 'text-zinc-400'}`}>
                                                <UserCog size={14} className="shrink-0" />
                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                                    Asst: {assistants.length > 0 ? assistants[0].name : 'Not Assigned'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`mt-6 pt-5 flex flex-col gap-4`}>
                                <div className={`h-px w-full ${isSelected ? 'bg-amazio-secondary/10' : 'bg-zinc-100 dark:bg-zinc-800/50'}`}></div>
                                <div className="flex items-center justify-between">
                                    {type === 'CATEGORY' && category ? (
                                        <div className="flex gap-2">
                                            <LimitBadge label="On" val={category.maxOnStage} globalVal={globalSettings?.maxItemsPerParticipant?.onStage} />
                                            <LimitBadge label="Off" val={category.maxOffStage} globalVal={globalSettings?.maxItemsPerParticipant?.offStage} />
                                            <LimitBadge label="Tot" val={category.maxCombined} globalVal={globalSettings?.maxTotalItemsPerParticipant} />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${theme.bg} shadow-glow`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-amazio-primary/60' : 'text-zinc-400'}`}>{teamParticipants.length} Participants</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredItems.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-900/30 rounded-[3rem]">
                        <MoreHorizontal size={48} className="mb-2 opacity-30" />
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Awaiting records</p>
                    </div>
                )}
            </div>

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

// --- Team Form Modal ---

interface TeamFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (teamName: string, leader?: { name: string, id?: string }, assistant?: { name: string, id?: string }) => void;
    editingTeam?: Team;
    existingParticipants: Participant[];
}

const TeamFormModal: React.FC<TeamFormModalProps> = ({ isOpen, onClose, onSave, editingTeam, existingParticipants }) => {
    const [name, setName] = useState('');
    const [leaderMode, setLeaderMode] = useState<'NEW' | 'EXISTING'>('NEW');
    const [newLeaderName, setNewLeaderName] = useState('');
    const [newAssistantName, setNewAssistantName] = useState('');
    const [selectedLeaderId, setSelectedLeaderId] = useState('');
    const [selectedAssistantId, setSelectedAssistantId] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingTeam) {
                setName(editingTeam.name);
                setLeaderMode(existingParticipants.length > 0 ? 'EXISTING' : 'NEW');
            } else {
                setName('');
                setLeaderMode('NEW');
            }
            setNewLeaderName(''); setNewAssistantName(''); setSelectedLeaderId(''); setSelectedAssistantId('');
        }
    }, [isOpen, editingTeam, existingParticipants]);

    const handleSave = () => {
        if (!name.trim()) return alert("Team name is required");
        let leaderData; let assistantData;
        if (leaderMode === 'NEW') {
            if (newLeaderName.trim()) leaderData = { name: newLeaderName.trim() };
            if (newAssistantName.trim()) assistantData = { name: newAssistantName.trim() };
        } else {
            if (selectedLeaderId) {
                const p = existingParticipants.find(p => p.id === selectedLeaderId);
                if (p) leaderData = { name: p.name, id: p.id };
            }
            if (selectedAssistantId) {
                const p = existingParticipants.find(p => p.id === selectedAssistantId);
                if (p) assistantData = { name: p.name, id: p.id };
            }
        }
        onSave(name.trim(), leaderData, assistantData);
        onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-none" onClick={e => e.stopPropagation()}>
                <div className="p-7 bg-zinc-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                    <h3 className="text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">{editingTeam ? 'Edit Team' : 'Create Team'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"><X size={20} className="text-zinc-500" /></button>
                </div>
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Identity Title</label>
                        <input type="text" value={name || ''} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sapphire House" className="w-full p-4 bg-zinc-100 dark:bg-black/20 rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border-none shadow-inner" autoFocus />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 flex items-center gap-2"><Shield size={12} /> Registry Leadership</label>
                            <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg shadow-inner">
                                <button onClick={() => setLeaderMode('NEW')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${leaderMode === 'NEW' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>New</button>
                                <button onClick={() => setLeaderMode('EXISTING')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${leaderMode === 'EXISTING' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Link</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-6 rounded-[2rem] bg-zinc-50/50 dark:bg-white/[0.02]">
                            {leaderMode === 'NEW' ? (
                                <>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Official Team Leader</label>
                                        <input type="text" value={newLeaderName || ''} onChange={(e) => setNewLeaderName(e.target.value)} placeholder="Full Name..." className="w-full px-4 py-3 bg-white dark:bg-zinc-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors shadow-sm border-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Assistant Coordinator</label>
                                        <input type="text" value={newAssistantName || ''} onChange={(e) => setNewAssistantName(e.target.value)} placeholder="Full Name..." className="w-full px-4 py-3 bg-white dark:bg-zinc-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors shadow-sm border-none" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Assign Leader</label>
                                        <select value={selectedLeaderId || ''} onChange={(e) => setSelectedLeaderId(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer border-none shadow-sm"><option value="">-- No Selection --</option>{(existingParticipants || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Assign Assistant</label>
                                        <select value={selectedAssistantId || ''} onChange={(e) => setSelectedAssistantId(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer border-none shadow-sm"><option value="">-- No Selection --</option>{(existingParticipants || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-7 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amazio-primary transition-colors">Discard</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95">Save Team</button>
                </div>
            </div>
        </div>, document.body
    );
};

// --- Category Form Modal ---

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    editingCategory?: Category;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave, editingCategory }) => {
    const [name, setName] = useState('');
    const [maxOnStage, setMaxOnStage] = useState('');
    const [maxOffStage, setMaxOffStage] = useState('');
    const [maxCombined, setMaxCombined] = useState('');
    const [isGeneralCategory, setIsGeneralCategory] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingCategory) {
                setName(editingCategory.name);
                setMaxOnStage(editingCategory.maxOnStage?.toString() || '');
                setMaxOffStage(editingCategory.maxOffStage?.toString() || '');
                setMaxCombined(editingCategory.maxCombined?.toString() || '');
                setIsGeneralCategory(editingCategory.isGeneralCategory || false);
            } else {
                setName(''); setMaxOnStage(''); setMaxOffStage(''); setMaxCombined(''); setIsGeneralCategory(false);
            }
        }
    }, [isOpen, editingCategory]);

    const handleSave = () => {
        if (!name.trim()) return alert("Category name is required");
        onSave({ 
            name: name.trim(),
            isGeneralCategory,
            maxOnStage: maxOnStage ? parseInt(maxOnStage) : undefined,
            maxOffStage: maxOffStage ? parseInt(maxOffStage) : undefined,
            maxCombined: maxCombined ? parseInt(maxCombined) : undefined,
            id: editingCategory?.id
        });
        onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-none" onClick={e => e.stopPropagation()}>
                <div className="p-7 bg-zinc-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                    <h3 className="text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">{editingCategory ? 'Edit Scope' : 'Add Scope'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"><X size={20} className="text-zinc-500" /></button>
                </div>
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Scope Title</label>
                        <input type="text" value={name || ''} onChange={(e) => setName(e.target.value)} placeholder="e.g. Intermediates" className="w-full p-4 bg-zinc-100 dark:bg-black/20 rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all border-none shadow-inner" autoFocus />
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Threshold Constraints</label>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 text-center">On Stage</label><input type="number" value={maxOnStage || ''} onChange={(e) => setMaxOnStage(e.target.value)} placeholder="∞" className="w-full p-3 text-center bg-zinc-100 dark:bg-black/20 rounded-xl text-sm font-bold outline-none border-none shadow-sm focus:ring-2 focus:ring-amber-500/20 transition-all" /></div>
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 text-center">Off Stage</label><input type="number" value={maxOffStage || ''} onChange={(e) => setMaxOffStage(e.target.value)} placeholder="∞" className="w-full p-3 text-center bg-zinc-100 dark:bg-black/20 rounded-xl text-sm font-bold outline-none border-none shadow-sm focus:ring-2 focus:ring-amber-500/20 transition-all" /></div>
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 text-center">Combined</label><input type="number" value={maxCombined || ''} onChange={(e) => setMaxCombined(e.target.value)} placeholder="∞" className="w-full p-3 text-center bg-zinc-100 dark:bg-black/20 rounded-xl text-sm font-bold outline-none border-none shadow-sm focus:ring-2 focus:ring-amber-500/20 transition-all" /></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-zinc-100 dark:bg-white/[0.02] cursor-pointer shadow-sm" onClick={() => setIsGeneralCategory(!isGeneralCategory)}>
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${isGeneralCategory ? 'bg-amber-500 shadow-lg' : 'bg-zinc-200 dark:bg-zinc-700'}`}>{isGeneralCategory && <Check size={16} className="text-white" strokeWidth={4} />}</div>
                        <div><span className="text-sm font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-200 block leading-none mb-1">General Category</span><span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Global scope open to all participants</span></div>
                    </div>
                </div>
                <div className="p-7 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amazio-primary transition-colors">Discard</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all active:scale-95">Save Scope</button>
                </div>
            </div>
        </div>, document.body
    );
};

// --- Main Page Component ---

const TeamsAndCategories: React.FC = () => {
    const { 
        state, 
        addMultipleTeams, updateTeam, deleteMultipleTeams, 
        addCategory, updateCategory, deleteMultipleCategories,
        addMultipleParticipants, updateMultipleParticipants,
        teamsSubView: activeTab
    } = useFirebase();

    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

    const handleSaveTeam = async (name: string, leader?: { name: string, id?: string }, assistant?: { name: string, id?: string }) => {
        if (!state) return;
        let teamId = editingTeam ? editingTeam.id : `team_${Date.now()}`;
        const newTeam: Team = { id: teamId, name: name };
        
        // 1. Update/Add Team
        if (editingTeam) await updateTeam(newTeam);
        else await addMultipleTeams([newTeam]);

        // 2. Clear existing roles for this team (Omit the role property entirely)
        const teamParticipants = (state.participants || []).filter(p => p.teamId === teamId);
        const updates: Participant[] = teamParticipants.map(p => {
            const { role, ...rest } = p;
            return rest;
        });
        
        const newParticipants: Participant[] = [];
        
        // 3. Process Leader
        if (leader) {
            if (leader.id) {
                const idx = updates.findIndex(u => u.id === leader.id);
                if (idx !== -1) updates[idx].role = 'leader';
                else {
                    const p = (state.participants || []).find(part => part.id === leader.id);
                    if (p) updates.push({ ...p, role: 'leader' });
                }
            } else {
                newParticipants.push({ 
                    id: `p_ldr_${Date.now()}_1`, 
                    name: leader.name, 
                    chestNumber: '', 
                    teamId: teamId, 
                    categoryId: '', 
                    itemIds: [], 
                    role: 'leader' 
                });
            }
        }
        
        // 4. Process Assistant
        if (assistant) {
            if (assistant.id) {
                const idx = updates.findIndex(u => u.id === assistant.id);
                if (idx !== -1) updates[idx].role = 'assistant';
                else {
                    const p = state.participants.find(part => part.id === assistant.id);
                    if (p) updates.push({ ...p, role: 'assistant' });
                }
            } else {
                newParticipants.push({ 
                    id: `p_asst_${Date.now()}_2`, 
                    name: assistant.name, 
                    chestNumber: '', 
                    teamId: teamId, 
                    categoryId: '', 
                    itemIds: [], 
                    role: 'assistant' 
                });
            }
        }

        if (updates.length > 0) await updateMultipleParticipants(updates);
        if (newParticipants.length > 0) await addMultipleParticipants(newParticipants);
    };

    const handleSaveCategory = async (data: any) => {
        if (editingCategory || data.id) await updateCategory(data);
        else await addCategory(data);
    };

    if (!state) return <div className="p-8 text-center text-zinc-500">Loading modules...</div>;

    return (
        <div className="space-y-6 sm:space-y-10 pb-24 animate-in fade-in duration-700 relative">
            <div className="hidden md:flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h2 className="text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">
                        {activeTab === 'TEAMS' ? 'Organizational Units' : 'Participation Scopes'}
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-medium text-lg italic">
                        {activeTab === 'TEAMS' ? 'Management of house teams and leadership.' : 'Configuration of participation levels and limits.'}
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <StatCard label="Live Teams" value={state.teams.length} icon={Users} color="bg-emerald-500" />
                    <StatCard label="Active Levels" value={state.categories.length} icon={Layers} color="bg-amber-500" />
                </div>

                {activeTab === 'TEAMS' ? (
                    <div className="animate-in slide-in-from-left duration-500">
                        <EntityManager
                            type="TEAM"
                            items={state.teams}
                            onAdd={() => { setEditingTeam(undefined); setIsTeamModalOpen(true); }}
                            onUpdate={(item) => { setEditingTeam(item as Team); setIsTeamModalOpen(true); }}
                            onDelete={(ids) => deleteMultipleTeams(ids)}
                            participants={state.participants}
                        />
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right duration-500">
                        <EntityManager
                            type="CATEGORY"
                            items={state.categories}
                            onAdd={() => { setEditingCategory(undefined); setIsCategoryModalOpen(true); }}
                            onUpdate={(cat) => { setEditingCategory(cat as Category); setIsCategoryModalOpen(true); }}
                            onDelete={(ids) => deleteMultipleCategories(ids)}
                            globalSettings={state.settings}
                            participants={state.participants}
                        />
                    </div>
                )}
            </div>

            <TeamFormModal 
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                onSave={handleSaveTeam}
                editingTeam={editingTeam}
                existingParticipants={editingTeam ? state.participants.filter(p => p.teamId === editingTeam.id) : []}
            />

            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSave={handleSaveCategory}
                editingCategory={editingCategory}
            />
        </div>
    );
};

export default TeamsAndCategories;