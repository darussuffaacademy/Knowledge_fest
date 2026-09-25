import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Card from '../../components/Card';
import { useFirebase } from '../../hooks/useFirebase';
import { 
    X, Users, Trash2, BookText, Database, Info, FileDown, Upload, ArrowRight, 
    Building2, Briefcase, Image as ImageIcon, Check, LayoutTemplate, RotateCcw, 
    ShieldAlert, Award, Edit2, Save, Type, CheckCircle, CheckCircle2, ClipboardList, Plus, FileText, 
    MoreHorizontal, Settings, Palette, Calendar, SlidersHorizontal, MousePointer2, 
    UserCheck, Shield, LayoutDashboard, UserPlus, Medal, Gavel, Timer, Monitor,
    BarChart2, Home, Search, AlertTriangle, ShieldCheck, Download, Sparkles, RefreshCw, Layers, Printer, Trophy,
    Archive, History, ExternalLink, ChevronRight
} from 'lucide-react';
import { User, UserRole, AppState, FontConfig, GeneralFontConfig, ProjectorSettings, Edition, ResultStatus } from '../../types';
import { TABS, TAB_DISPLAY_NAMES } from '../../constants';

// Roman numeral helper for prestige festival edition numbering
const toRoman = (num: number): string => {
    const lookup: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (const i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman || `${num}`;
};

// --- Helper Component: Image Upload ---
interface ImageUploadProps {
    label: string;
    description: string;
    currentValue: string | undefined;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, description, currentValue, onChange, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 800 * 1024) {
                alert("File size too large! Please upload an image smaller than 800KB for system stability.");
                return;
            }
            setIsProcessing(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(reader.result as string);
                setIsProcessing(false);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className={`h-full flex flex-col justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-zinc-50/50 dark:bg-black/20 ${disabled ? 'opacity-60 pointer-events-none' : 'hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-300'}`}>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">{label}</label>
            <div className="flex-grow flex flex-col items-center justify-center gap-4">
                {currentValue ? (
                    <div className="relative w-full aspect-video bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden p-2 group shadow-sm">
                        <img src={currentValue} alt={label} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105 duration-500" />
                        {!disabled && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={20} className="text-white mb-2" />
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">Replace Asset</span>
                            </div>
                        )}
                        {!disabled && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); onChange(''); }} 
                                className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-95"
                                title="Remove Image"
                            >
                                <Trash2 size={14}/>
                            </button>
                        )}
                    </div>
                ) : (
                    <div 
                        onClick={() => !disabled && fileInputRef.current?.click()}
                        className={`w-full aspect-video bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 transition-all ${!disabled ? 'cursor-pointer hover:border-indigo-500/50 hover:shadow-md' : ''} group`}
                    >
                        {isProcessing ? (
                            <RefreshCw className="animate-spin text-indigo-500" size={24} />
                        ) : (
                            <>
                                <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 dark:group-hover:bg-indigo-900/20 transition-colors">
                                    <ImageIcon size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">Choose Graphic</span>
                            </>
                        )}
                    </div>
                )}
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 text-center max-w-[180px] leading-relaxed opacity-60">{description}</p>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/svg+xml"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled || isProcessing}
                />
            </div>
        </div>
    );
};

// --- Helper Component: Language Font Card ---
const LanguageFontCard = ({
    title,
    subtitle,
    language,
    currentFont,
    previewText,
    onSave,
    fontFamilyName
}: {
    title: string;
    subtitle: string;
    language: string;
    currentFont?: FontConfig;
    previewText: string;
    onSave: (font: FontConfig | undefined) => Promise<void>;
    fontFamilyName?: string;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tempFont, setTempFont] = useState<FontConfig | undefined>(currentFont);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (!isDirty && !isSaving) {
            setTempFont(currentFont);
        }
    }, [currentFont, isDirty, isSaving]);

    // Inject styles for preview
    useEffect(() => {
        const fontToRender = tempFont || currentFont;
        if (fontToRender?.url && fontToRender.family) {
            const styleId = `preview-font-${language}`;
            let style = document.getElementById(styleId) as HTMLStyleElement;
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            style.textContent = `
                @font-face {
                    font-family: '${fontToRender.family}_Preview';
                    src: url('${fontToRender.url}');
                    font-display: swap;
                }
            `;
        }
    }, [tempFont, currentFont, language]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 800 * 1024) { 
                alert("Font file too large! Please upload a file smaller than 800KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                const newFont = {
                    name: file.name,
                    url: base64,
                    family: fontFamilyName || `Custom${language.charAt(0).toUpperCase() + language.slice(1)}`
                };
                setTempFont(newFont);
                setIsDirty(true);
                setSaveSuccess(false);
            };
            reader.readAsDataURL(file);
            e.target.value = ''; 
        }
    };

    const handleApply = async () => {
        setIsSaving(true);
        try {
            await onSave(tempFont);
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            alert("Failed to save font configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm(`Are you sure you want to delete the custom ${title} and revert to system default?`)) return;
        setIsSaving(true);
        try {
            await onSave(undefined);
            setTempFont(undefined);
            setIsDirty(false);
        } catch (err) {
            alert("Failed to remove font.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#121412] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 flex flex-col gap-6 relative overflow-hidden group shadow-sm md:shadow-xl">
             <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-900/20 shadow-inner">
                    <Type size={24} />
                </div>
                <div className="flex-grow">
                    <h3 className="text-amazio-primary dark:text-white font-serif text-xl font-bold tracking-tight">{title}</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>
                </div>
                {currentFont && (
                    <button 
                        onClick={handleRemove}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
                        title="Remove Custom Font"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
             </div>

             <div className="flex items-center justify-between gap-4">
                <div className="flex-grow min-w-0">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</div>
                    <div className="flex items-center gap-2">
                        {currentFont ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 truncate">{currentFont.name}</span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                                <span className="text-[11px] font-bold text-zinc-400">System Default</span>
                            </>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => (fileInputRef.current as any)?.click()} 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-amazio-primary dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-sm"
                >
                    <Upload size={14} /> {tempFont ? 'Change File' : 'Upload File'}
                </button>
                <input type="file" ref={fileInputRef as any} className="hidden" accept=".ttf,.otf,.woff,.woff2" onChange={handleFileChange} />
             </div>

             <div className="bg-zinc-100/50 dark:bg-[#050605] rounded-3xl p-8 border border-zinc-200 dark:border-zinc-700/50 min-h-[140px] flex flex-col justify-center relative group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-colors">
                <span className="absolute top-5 left-6 text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Live Rendering</span>
                <p className="text-3xl text-amazio-primary dark:text-white text-center leading-relaxed" style={{ fontFamily: (tempFont || currentFont) ? `'${(tempFont || currentFont)?.family}_Preview', sans-serif` : 'inherit', direction: language === 'arabic' ? 'rtl' : 'ltr' }}>
                    {previewText}
                </p>
             </div>

             <button
                onClick={handleApply}
                disabled={!isDirty || isSaving}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${saveSuccess ? 'bg-emerald-600 text-white' : isDirty ? 'bg-emerald-700 text-white hover:bg-emerald-600 shadow-emerald-900/20 transform hover:-translate-y-0.5' : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800'}`}
             >
                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : saveSuccess ? <CheckCircle2 size={16} /> : <CheckCircle size={16} />} 
                {isSaving ? 'Uploading...' : saveSuccess ? 'Registry Applied' : 'Apply Registry'}
             </button>
        </div>
    );
};

// --- Helper Component: User Form Modal ---
const UserFormModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (user: Partial<User>) => void; 
    editingUser?: User;
    teams: any[];
    judges: any[];
}> = ({ isOpen, onClose, onSave, editingUser, teams, judges }) => {
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
    const [assignedEntity, setAssignedEntity] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingUser) {
                setUsername(editingUser.username);
                setRole(editingUser.role);
                if (editingUser.role === UserRole.TEAM_LEADER) setAssignedEntity(editingUser.teamId || '');
                else if (editingUser.role === UserRole.JUDGE) setAssignedEntity(editingUser.judgeId || '');
                else setAssignedEntity('');
            } else {
                setUsername('');
                setRole(UserRole.MANAGER);
                setAssignedEntity('');
            }
        }
    }, [isOpen, editingUser]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!username) return alert('Username is required');
        
        const payload: any = { username, role };
        if (role === UserRole.TEAM_LEADER) payload.teamId = assignedEntity;
        if (role === UserRole.JUDGE) payload.judgeId = assignedEntity;
        if (editingUser) payload.id = editingUser.id;
        
        onSave(payload);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">{editingUser ? 'Edit Operator' : 'New Operator'}</h3>
                        <p className="text-[10px] font-black uppercase text-zinc-400 mt-1.5 tracking-widest">Access Control</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Account Handle</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Username" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Role Priority</label>
                        <select value={role} onChange={e => { setRole(e.target.value as UserRole); setAssignedEntity(''); }} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-sm font-bold outline-none appearance-none cursor-pointer">
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    {(role === UserRole.TEAM_LEADER || role === UserRole.JUDGE) && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Assigned Entity</label>
                            <select value={assignedEntity} onChange={e => setAssignedEntity(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-sm font-bold outline-none appearance-none cursor-pointer">
                                <option value="">-- Select Entity --</option>
                                {role === UserRole.TEAM_LEADER && (teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                {role === UserRole.JUDGE && (judges || []).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="p-7 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01] flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amazio-primary transition-colors">Discard</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">Save Access</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Utils ---
const SectionTitle = ({ title, icon: Icon, color = 'indigo' }: { title: string, icon?: any, color?: string }) => {
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]',
        emerald: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        purple: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]',
        rose: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
    };
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className={`h-5 w-1.5 rounded-full ${colors[color] || colors.indigo}`}></div>
            <h3 className="text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">{title}</h3>
            {Icon && <Icon className="text-zinc-400 ml-1" size={18} />}
        </div>
    );
};

const ScopeItem: React.FC<{ label: string, isChecked: boolean, onChange: () => void }> = ({ label, isChecked, onChange }) => (
    <div className="flex items-center justify-between p-3.5 bg-zinc-50/50 dark:bg-black/20 rounded-xl border border-zinc-100 dark:border-white/5 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
        <button onClick={onChange} className={`w-5 h-5 rounded flex items-center justify-center transition-all shadow-sm ${isChecked ? 'bg-lime-500 text-black shadow-lime-500/20' : 'bg-white dark:bg-zinc-800 text-transparent border border-zinc-200 dark:border-zinc-700'}`}>
            {isChecked && <Check size={14} strokeWidth={4} />}
        </button>
    </div>
);

const ToggleItem: React.FC<{ label: string, isChecked: boolean, onChange: (v: boolean) => void }> = ({ label, isChecked, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-zinc-800/80">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">{label}</span>
        <button 
            onClick={() => onChange(!isChecked)} 
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isChecked ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md ${isChecked ? 'left-7' : 'left-1'}`}></div>
        </button>
    </div>
);

// Tab icon map for instructions
const TAB_ICON_MAP: Record<string, React.ElementType> = {
    [TABS.DASHBOARD]: LayoutDashboard,
    [TABS.DATA_ENTRY]: UserPlus,
    [TABS.ITEMS]: ClipboardList,
    [TABS.TEAMS_CATEGORIES]: Users,
    [TABS.GRADE_POINTS]: Medal,
    [TABS.JUDGES_MANAGEMENT]: Gavel,
    [TABS.SCHEDULE]: Calendar,
    [TABS.ITEM_TIMER]: Timer,
    [TABS.SCORING_RESULTS]: Edit2,
    [TABS.POINTS]: BarChart2,
    [TABS.REPORTS]: FileText,
    [TABS.CREATIVE_STUDIO]: Palette,
    [TABS.PROJECTOR]: Monitor,
    [TABS.GENERAL_SETTINGS]: Settings,
};

const GeneralSettings: React.FC = () => {
    const { 
        state, updateSettings, updateCustomFonts, updateGeneralCustomFonts, 
        addUser, updateUser, deleteUser, updatePermissions, updateInstruction, 
        backupData, restoreData, resetSystem, settingsSubView: activeTab,
        activeEditionId, activeEdition, editions, switchEdition, createEdition, updateEdition, deleteEdition, currentUser
    } = useFirebase();
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [isEditingInst, setIsEditingInst] = useState(false);
    const [instData, setInstData] = useState(state?.settings.institutionDetails || { name: '', address: '', email: '', contactNumber: '', description: '', logoUrl: '' });
    const [isEditingOrg, setIsEditingOrg] = useState(false);
    
    const [isAddEditionModalOpen, setIsAddEditionModalOpen] = useState(false);
    const [isEditEditionModalOpen, setIsEditEditionModalOpen] = useState(false);
    const [editingEditionTarget, setEditingEditionTarget] = useState<Edition | null>(null);
    const [isCreatingEdition, setIsCreatingEdition] = useState(false);
    const [isUpdatingEdition, setIsUpdatingEdition] = useState(false);
    const [isSwitchingEdition, setIsSwitchingEdition] = useState<string | null>(null);
    const [editionSearchQuery, setEditionSearchQuery] = useState('');
    const [editionFilterTab, setEditionFilterTab] = useState<'all' | 'active' | 'archived'>('all');
    const [newEditionForm, setNewEditionForm] = useState({
        name: '',
        editionNumber: 2,
        year: '2027',
        copyStructure: true
    });
    const [editEditionForm, setEditEditionForm] = useState({
        name: '',
        year: '2026',
        isArchived: false
    });
    
    const [orgData, setOrgData] = useState({ 
        organizingTeam: state?.settings.organizingTeam || '', 
        heading: state?.settings.heading || '', 
        description: state?.settings.description || '', 
        eventDates: state?.settings.eventDates || [], 
        branding: state?.settings.branding || { eventName: '', description: '', typographyUrl: '', typographyUrlLight: '', typographyUrlDark: '', teamLogoUrl: '' } 
    });

    const [isEditingHome, setIsEditingHome] = useState(false);
    const [homeData, setHomeData] = useState({
        badgeText: state?.settings.homePage?.badgeText ?? 'The Rooted Tree',
        editionText: state?.settings.homePage?.editionText ?? '2026 EDITION',
        heroTitle: state?.settings.homePage?.heroTitle ?? 'AMAZIO',
        heroQuote: state?.settings.homePage?.heroQuote ?? '"Where Art Meets Orchestration"',
        heroDescription: state?.settings.homePage?.heroDescription ?? 'Welcome to the official management terminal for the Art Fest. Explore live results, schedules, and the creative studio through our public channels.',
        portalTitle: state?.settings.homePage?.portalTitle ?? 'Operator Access',
        portalSubtitle: state?.settings.homePage?.portalSubtitle ?? 'Secure Core Authentication',
        showStats: state?.settings.homePage?.showStats !== false,
        showLiveDashboardBtn: state?.settings.homePage?.showLiveDashboardBtn !== false,
        showLiveProjectorBtn: state?.settings.homePage?.showLiveProjectorBtn !== false,
        showCreativeStudioBtn: state?.settings.homePage?.showCreativeStudioBtn !== false,
        customHeroBannerUrl: state?.settings.homePage?.customHeroBannerUrl ?? ''
    });
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

    const [newFontName, setNewFontName] = useState('');
    const fontUploadInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (!isEditingInst && state?.settings.institutionDetails) setInstData(state.settings.institutionDetails); }, [state?.settings.institutionDetails, isEditingInst]);
    useEffect(() => { 
        if (!isEditingOrg && state?.settings) {
            setOrgData({ 
                organizingTeam: state.settings.organizingTeam, 
                heading: state.settings.heading, 
                description: state.settings.description, 
                eventDates: state.settings.eventDates || [], 
                branding: state.settings.branding || { eventName: '', description: '', typographyUrl: '', typographyUrlLight: '', typographyUrlDark: '', teamLogoUrl: '' } 
            }); 
        }
    }, [state?.settings, isEditingOrg]);

    useEffect(() => {
        if (!isEditingHome && state?.settings) {
            setHomeData({
                badgeText: state.settings.homePage?.badgeText ?? 'The Rooted Tree',
                editionText: state.settings.homePage?.editionText ?? '2026 EDITION',
                heroTitle: state.settings.homePage?.heroTitle ?? 'AMAZIO',
                heroQuote: state.settings.homePage?.heroQuote ?? '"Where Art Meets Orchestration"',
                heroDescription: state.settings.homePage?.heroDescription ?? 'Welcome to the official management terminal for the Art Fest. Explore live results, schedules, and the creative studio through our public channels.',
                portalTitle: state.settings.homePage?.portalTitle ?? 'Operator Access',
                portalSubtitle: state.settings.homePage?.portalSubtitle ?? 'Secure Core Authentication',
                showStats: state.settings.homePage?.showStats !== false,
                showLiveDashboardBtn: state.settings.homePage?.showLiveDashboardBtn !== false,
                showLiveProjectorBtn: state.settings.homePage?.showLiveProjectorBtn !== false,
                showCreativeStudioBtn: state.settings.homePage?.showCreativeStudioBtn !== false,
                customHeroBannerUrl: state.settings.homePage?.customHeroBannerUrl ?? ''
            });
        }
    }, [state?.settings, isEditingHome]);

    if (!state) return <div>Loading...</div>;

    const handleSaveInst = async () => { await updateSettings({ institutionDetails: instData }); setIsEditingInst(false); };
    
    const handleSaveOrg = async () => { 
        await updateSettings({ 
            organizingTeam: orgData.organizingTeam, 
            heading: orgData.heading, 
            description: orgData.description, 
            eventDates: orgData.eventDates, 
            branding: {
                ...orgData.branding,
                eventName: orgData.branding?.eventName || '',
                description: orgData.branding?.description || '',
                typographyUrlLight: orgData.branding?.typographyUrlLight || '',
                typographyUrlDark: orgData.branding?.typographyUrlDark || ''
            } 
        }); 
        setIsEditingOrg(false); 
    };

    const handleSaveHome = async () => {
        await updateSettings({
            homePage: homeData
        });
        setIsEditingHome(false);
    };

    const handlePermissionChange = (role: UserRole, tab: string, checked: boolean) => {
        const pages = checked ? Array.from(new Set([...(state.permissions[role] || []), tab])) : (state.permissions[role] || []).filter(p => p !== tab);
        updatePermissions({ role, pages });
    };

    const handleSaveUser = async (userData: Partial<User>) => {
        if (userData.id) {
            await updateUser(userData as User);
        } else {
            await addUser(userData as Omit<User, 'id'>);
        }
        setIsUserModalOpen(false);
        setEditingUser(undefined);
    };

    const handleUpdateCustomFont = async (lang: string, font: FontConfig | undefined) => {
        const currentFonts = state.customFonts || {};
        await updateCustomFonts({
            ...currentFonts,
            [lang]: font
        });
    };

    const handleAddGenericFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !newFontName.trim()) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const newFont: GeneralFontConfig = {
                id: `font_${Date.now()}`,
                name: file.name,
                url: base64,
                family: newFontName.trim()
            };
            const existing = state.generalCustomFonts || [];
            await updateGeneralCustomFonts([...existing, newFont]);
            setNewFontName('');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDeleteGenericFont = async (id: string) => {
        const filtered = (state.generalCustomFonts || []).filter(f => f.id !== id);
        await updateGeneralCustomFonts(filtered);
    };

    const handleAddEventDate = (date: string) => {
        if (!date) return;
        if (!orgData.eventDates.includes(date)) {
            setOrgData(prev => ({ ...prev, eventDates: [...prev.eventDates, date] }));
        }
    };

    const handleRemoveEventDate = (date: string) => {
        setOrgData(prev => ({ ...prev, eventDates: prev.eventDates.filter(d => d !== date) }));
    };

    const handleProjectorUpdate = (payload: Partial<ProjectorSettings>) => {
        updateSettings({
            projector: {
                ...(state.settings.projector || {
                    showResults: true,
                    showLeaderboard: true,
                    showStats: true,
                    showUpcoming: true,
                    resultsLimit: 3,
                    pointsLimit: 10,
                    rotationSpeed: 12000
                }),
                ...payload
            }
        });
    };

    const handleReportDefaultUpdate = (payload: Partial<{ defaultShowHeader: boolean, defaultShowFooter: boolean }>) => {
        updateSettings({
            reportSettings: {
                ...(state.settings.reportSettings),
                ...payload
            }
        });
    };

    const handleOpenAddEditionModal = () => {
        const nextNumber = (editions || []).length > 0 ? Math.max(...(editions || []).map(e => e.editionNumber)) + 1 : 2;
        const currentYear = new Date().getFullYear();
        setNewEditionForm({
            name: `Amazio Arts Fest ${currentYear + 1}`,
            editionNumber: nextNumber,
            year: `${currentYear + 1}`,
            copyStructure: true
        });
        setIsAddEditionModalOpen(true);
    };

    const handleCreateEditionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEditionForm.name.trim()) {
            alert("Please enter a valid edition name.");
            return;
        }
        if (!newEditionForm.editionNumber || newEditionForm.editionNumber < 1) {
            alert("Please enter a valid edition number.");
            return;
        }
        if (editions.some(ed => ed.editionNumber === Number(newEditionForm.editionNumber))) {
            alert(`Edition ${newEditionForm.editionNumber} already exists. Please choose a different edition number.`);
            return;
        }

        setIsCreatingEdition(true);
        try {
            await createEdition({
                name: newEditionForm.name.trim(),
                editionNumber: Number(newEditionForm.editionNumber),
                year: newEditionForm.year,
                copyStructure: newEditionForm.copyStructure
            });
            setIsAddEditionModalOpen(false);
            alert(`Successfully created and switched to Edition ${newEditionForm.editionNumber}: "${newEditionForm.name}"!`);
        } catch (err: any) {
            console.error(err);
            alert("Failed to create new edition: " + (err?.message || "Unknown error"));
        } finally {
            setIsCreatingEdition(false);
        }
    };

    const handleSwitchEditionAction = async (editionId: string) => {
        if (editionId === activeEditionId) return;
        const target = editions.find(e => e.id === editionId);
        if (!target) return;
        
        setIsSwitchingEdition(editionId);
        try {
            await switchEdition(editionId);
        } catch (err) {
            console.error(err);
            alert("Failed to switch edition.");
        } finally {
            setIsSwitchingEdition(null);
        }
    };

    const handleDeleteEditionAction = async (editionId: string, editionName: string) => {
        if (editionId === 'edition_1') {
            alert("Edition 1 represents the historical baseline and cannot be deleted.");
            return;
        }
        if (!confirm(`Are you sure you want to remove edition "${editionName}"? All data within this edition will be removed.`)) {
            return;
        }
        try {
            await deleteEdition(editionId);
        } catch (err) {
            console.error(err);
            alert("Failed to delete edition.");
        }
    };

    const handleOpenEditEditionModal = (ed: Edition) => {
        setEditingEditionTarget(ed);
        setEditEditionForm({
            name: ed.name,
            year: String(ed.year || '2026'),
            isArchived: !!ed.isArchived
        });
        setIsEditEditionModalOpen(true);
    };

    const handleUpdateEditionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEditionTarget) return;
        if (!editEditionForm.name.trim()) {
            alert("Please enter a valid edition name.");
            return;
        }

        setIsUpdatingEdition(true);
        try {
            await updateEdition({
                ...editingEditionTarget,
                name: editEditionForm.name.trim(),
                year: editEditionForm.year.trim(),
                isArchived: editEditionForm.isArchived
            });
            setIsEditEditionModalOpen(false);
            setEditingEditionTarget(null);
        } catch (err: any) {
            console.error(err);
            alert("Failed to update edition: " + (err?.message || "Unknown error"));
        } finally {
            setIsUpdatingEdition(false);
        }
    };

    const handleToggleArchiveEdition = async (ed: Edition) => {
        if (ed.id === activeEditionId && !ed.isArchived) {
            if (!confirm(`Edition ${ed.editionNumber} is currently active. Archiving it marks it as historical. Are you sure?`)) {
                return;
            }
        }
        try {
            await updateEdition({
                ...ed,
                isArchived: !ed.isArchived
            });
        } catch (err: any) {
            console.error(err);
            alert("Failed to update archive status.");
        }
    };

    const renderFestivalEditionsCard = () => {
        const isManager = !currentUser || currentUser.role === UserRole.MANAGER;
        const allEditions = editions || [];
        const activeCount = allEditions.filter(e => !e.isArchived).length;
        const archivedCount = allEditions.filter(e => e.isArchived).length;

        // Filter editions based on search query and active tab
        const filteredEditions = allEditions.filter(ed => {
            const q = editionSearchQuery.trim().toLowerCase();
            const matchesQuery = !q || 
                ed.name.toLowerCase().includes(q) || 
                String(ed.editionNumber).includes(q) || 
                toRoman(ed.editionNumber).toLowerCase().includes(q) ||
                String(ed.year).toLowerCase().includes(q);

            if (!matchesQuery) return false;

            if (editionFilterTab === 'active') return !ed.isArchived;
            if (editionFilterTab === 'archived') return !!ed.isArchived;
            return true;
        }).sort((a, b) => b.editionNumber - a.editionNumber);

        return (
            <Card 
                title="Festival Editions & Multi-Year Seasons" 
                action={
                    isManager ? (
                        <div className="flex items-center gap-2.5">
                            <button 
                                onClick={handleOpenAddEditionModal}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus size={15} strokeWidth={3} />
                                <span>Add New Edition</span>
                            </button>
                        </div>
                    ) : null
                }
            >
                <div className="space-y-6">
                    {/* Active Edition Hero Card */}
                    <div className="relative overflow-hidden rounded-3xl border border-indigo-200/90 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-[#121614] dark:to-purple-950/30 p-6 md:p-8 shadow-sm">
                        {/* Subtle background luxury watermark */}
                        <div className="absolute -right-6 -bottom-10 text-[110px] font-black font-serif text-indigo-900/[0.04] dark:text-white/[0.03] select-none pointer-events-none tracking-tighter">
                            {toRoman(activeEdition?.editionNumber || 1)}
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                            <div className="space-y-3.5 max-w-2xl">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                                        <Layers size={13} />
                                        <span>Edition {toRoman(activeEdition?.editionNumber || 1)} ({activeEdition?.editionNumber || 1})</span>
                                    </div>
                                    <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Active Live Workspace</span>
                                    </div>
                                    <span className="px-3 py-1.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-bold">
                                        Festival Year {activeEdition?.year || '2026'}
                                    </span>
                                    {activeEdition?.isArchived && (
                                        <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-bold flex items-center gap-1">
                                            <Archive size={11} />
                                            Archived Season
                                        </span>
                                    )}
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl md:text-2xl font-black font-serif text-amazio-primary dark:text-white tracking-tight">
                                            {activeEdition?.name || 'Amazio Knowledge Fest 2026'}
                                        </h3>
                                        {isManager && activeEdition && (
                                            <button 
                                                onClick={() => handleOpenEditEditionModal(activeEdition)}
                                                className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-zinc-800 rounded-xl transition-all"
                                                title="Edit Season Details"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 font-medium leading-relaxed">
                                        All entries, scores, jury evaluations, tabulation, results, schedules, and analytics in the application are currently scoped exclusively to this edition.
                                    </p>
                                </div>
                            </div>

                            {/* Fast Switch & Management Controls */}
                            <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-2xl border border-indigo-100 dark:border-zinc-800 shadow-sm">
                                <div className="px-3 py-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Switch Workspace</span>
                                    <span className="text-xs font-bold text-amazio-primary dark:text-zinc-200 truncate max-w-[160px] block">
                                        Edition {activeEdition?.editionNumber} · {activeEdition?.year}
                                    </span>
                                </div>
                                <select 
                                    value={activeEditionId} 
                                    onChange={(e) => handleSwitchEditionAction(e.target.value)}
                                    disabled={!isManager || isSwitchingEdition !== null}
                                    className="px-4 py-2.5 bg-indigo-50/80 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider outline-none cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {allEditions.map(ed => (
                                        <option key={ed.id} value={ed.id}>
                                            Edition {ed.editionNumber} ({toRoman(ed.editionNumber)}) — {ed.name} [{ed.year}] {ed.id === activeEditionId ? '✓ Active' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Live Scoped Metrics Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-indigo-100/80 dark:border-zinc-800/80">
                            <div className="bg-white/85 dark:bg-zinc-900/60 p-4 rounded-2xl border border-indigo-100/70 dark:border-zinc-800 flex items-center gap-3.5 transition-all hover:border-indigo-200 dark:hover:border-zinc-700">
                                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                    <Users size={17} />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Enrolled Teams</span>
                                    <span className="text-lg font-black text-amazio-primary dark:text-white">{state?.teams?.length || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white/85 dark:bg-zinc-900/60 p-4 rounded-2xl border border-indigo-100/70 dark:border-zinc-800 flex items-center gap-3.5 transition-all hover:border-indigo-200 dark:hover:border-zinc-700">
                                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                                    <UserCheck size={17} />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Delegates Rostered</span>
                                    <span className="text-lg font-black text-amazio-primary dark:text-white">{state?.participants?.length || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white/85 dark:bg-zinc-900/60 p-4 rounded-2xl border border-indigo-100/70 dark:border-zinc-800 flex items-center gap-3.5 transition-all hover:border-indigo-200 dark:hover:border-zinc-700">
                                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                    <LayoutDashboard size={17} />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Fest Programmes</span>
                                    <span className="text-lg font-black text-amazio-primary dark:text-white">{state?.items?.length || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white/85 dark:bg-zinc-900/60 p-4 rounded-2xl border border-indigo-100/70 dark:border-zinc-800 flex items-center gap-3.5 transition-all hover:border-indigo-200 dark:hover:border-zinc-700">
                                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                    <Trophy size={17} />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Results Declared</span>
                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                        {(state?.results || []).filter(r => r.status === ResultStatus.DECLARED).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Directory & Management Controls Toolbar */}
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
                            <div className="flex items-center gap-2.5">
                                <Sparkles size={16} className="text-indigo-500" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                    All Registered Editions ({allEditions.length})
                                </h4>
                                <span className="text-zinc-300 dark:text-zinc-700 font-bold">·</span>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                                    {activeCount} active · {archivedCount} archived
                                </span>
                            </div>

                            {/* Search & Segmented Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Filter Tabs Segmented Control */}
                                <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs">
                                    <button 
                                        type="button"
                                        onClick={() => setEditionFilterTab('all')}
                                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                                            editionFilterTab === 'all' 
                                                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                        }`}
                                    >
                                        All ({allEditions.length})
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditionFilterTab('active')}
                                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                                            editionFilterTab === 'active' 
                                                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                        }`}
                                    >
                                        Active ({activeCount})
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditionFilterTab('archived')}
                                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                                            editionFilterTab === 'archived' 
                                                ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                        }`}
                                    >
                                        Archived ({archivedCount})
                                    </button>
                                </div>

                                {/* Real-time Search Input */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input 
                                        type="text" 
                                        value={editionSearchQuery}
                                        onChange={(e) => setEditionSearchQuery(e.target.value)}
                                        placeholder="Search editions..."
                                        className="pl-8.5 pr-8 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-44 sm:w-56"
                                    />
                                    {editionSearchQuery && (
                                        <button 
                                            onClick={() => setEditionSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Available Editions Grid */}
                        {filteredEditions.length === 0 ? (
                            <div className="p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                <Layers size={28} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">No festival editions match your filters.</p>
                                <button 
                                    onClick={() => { setEditionSearchQuery(''); setEditionFilterTab('all'); }}
                                    className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Reset search filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredEditions.map((ed) => {
                                    const isActive = ed.id === activeEditionId;
                                    const isSwitchingThis = isSwitchingEdition === ed.id;

                                    return (
                                        <div 
                                            key={ed.id}
                                            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4.5 ${
                                                isActive 
                                                    ? 'bg-white dark:bg-[#141815] border-indigo-500/70 dark:border-indigo-500/60 shadow-md ring-1 ring-indigo-500/20' 
                                                    : 'bg-zinc-50/80 dark:bg-[#111412]/80 border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-200 dark:hover:border-zinc-700 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="space-y-2.5">
                                                {/* Header row with badges */}
                                                <div className="flex items-start justify-between gap-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-serif font-black text-xs ${
                                                            isActive 
                                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                                        }`}>
                                                            {toRoman(ed.editionNumber)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                                    Edition {ed.editionNumber}
                                                                </span>
                                                                <span className="text-zinc-300 dark:text-zinc-700 font-bold">·</span>
                                                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                                                    Year {ed.year}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {isActive && (
                                                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                <Check size={11} strokeWidth={3} />
                                                                <span>Current</span>
                                                            </span>
                                                        )}
                                                        {ed.isArchived && (
                                                            <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                                <Archive size={10} />
                                                                <span>Archived</span>
                                                            </span>
                                                        )}
                                                        {ed.id === 'edition_1' && (
                                                            <span className="px-2 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider border border-blue-200/60 dark:border-blue-900/40">
                                                                Historical Base
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Title & info */}
                                                <div>
                                                    <h4 className="text-base font-bold text-amazio-primary dark:text-white tracking-tight">
                                                        {ed.name}
                                                    </h4>
                                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                                        {isActive 
                                                            ? 'Active live workspace for tabulation and scoring' 
                                                            : ed.isArchived 
                                                                ? 'Preserved historical dataset archive' 
                                                                : 'Independent multi-year season ready for activation'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action bar */}
                                            <div className="flex items-center justify-between pt-3.5 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto text-[10px]">
                                                <div>
                                                    {isActive ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Active Workspace
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400 font-medium">
                                                            {ed.isArchived ? 'Historical Archive' : 'Standalone Season'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Switch Button */}
                                                    {!isActive && isManager && (
                                                        <button 
                                                            onClick={() => handleSwitchEditionAction(ed.id)}
                                                            disabled={isSwitchingThis}
                                                            className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-amazio-primary dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {isSwitchingThis ? (
                                                                <RefreshCw size={11} className="animate-spin" />
                                                            ) : (
                                                                <RotateCcw size={11} />
                                                            )}
                                                            <span>Switch Season</span>
                                                        </button>
                                                    )}

                                                    {/* Edit Button */}
                                                    {isManager && (
                                                        <button 
                                                            onClick={() => handleOpenEditEditionModal(ed)}
                                                            className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-all"
                                                            title="Edit Edition Information"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}

                                                    {/* Archive Toggle Button */}
                                                    {isManager && (
                                                        <button 
                                                            onClick={() => handleToggleArchiveEdition(ed)}
                                                            className={`p-1.5 rounded-xl transition-all ${
                                                                ed.isArchived 
                                                                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                                                                    : 'text-zinc-400 hover:text-amber-600 hover:bg-zinc-100 dark:hover:bg-white/5'
                                                            }`}
                                                            title={ed.isArchived ? "Unarchive Season" : "Archive Season"}
                                                        >
                                                            <Archive size={13} />
                                                        </button>
                                                    )}

                                                    {/* Delete Button */}
                                                    {!isActive && ed.id !== 'edition_1' && isManager && (
                                                        <button 
                                                            onClick={() => handleDeleteEditionAction(ed.id, ed.name)}
                                                            className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                                                            title="Delete Edition"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'details':
                return (
                    <div className="space-y-10 animate-in slide-in-from-left duration-500">
                        {/* Festival Editions Management */}
                        {renderFestivalEditionsCard()}

                        {/* Institution Core */}
                        <Card title="Institution Core" action={isEditingInst ? <button onClick={handleSaveInst} className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"><Check size={20}/></button> : <button onClick={() => setIsEditingInst(true)} className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"><Edit2 size={18}/></button>}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Legal Name</label>
                                        <input 
                                            type="text" 
                                            value={instData.name} 
                                            onChange={e => setInstData({...instData, name: e.target.value})} 
                                            disabled={!isEditingInst} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                            placeholder="Official Institution Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Postal Address</label>
                                        <textarea 
                                            rows={2}
                                            value={instData.address} 
                                            onChange={e => setInstData({...instData, address: e.target.value})} 
                                            disabled={!isEditingInst} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 resize-none"
                                            placeholder="Full Postal Address"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Email</label>
                                            <input 
                                                type="email" 
                                                value={instData.email} 
                                                onChange={e => setInstData({...instData, email: e.target.value})} 
                                                disabled={!isEditingInst} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="contact@institution.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Contact No</label>
                                            <input 
                                                type="tel" 
                                                value={instData.contactNumber} 
                                                onChange={e => setInstData({...instData, contactNumber: e.target.value})} 
                                                disabled={!isEditingInst} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="+91 XXXXXXXXXX"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-1 h-full">
                                    <div className="h-full flex flex-col">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Institutional Emblem</label>
                                        <div className="flex-grow">
                                            <ImageUpload 
                                                label="" 
                                                description="Primary watermark for reports and certificates." 
                                                currentValue={instData.logoUrl} 
                                                onChange={v => setInstData({...instData, logoUrl: v})} 
                                                disabled={!isEditingInst}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Event Branding */}
                        <Card title="Event Branding" action={isEditingOrg ? <button onClick={handleSaveOrg} className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"><Check size={20}/></button> : <button onClick={() => setIsEditingOrg(true)} className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"><Edit2 size={18}/></button>}>
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Main Branding Title</label>
                                        <input 
                                            type="text" 
                                            value={orgData.branding?.eventName || ''} 
                                            onChange={e => setOrgData(prev => ({...prev, branding: {...(prev.branding || {}), eventName: e.target.value}}))} 
                                            disabled={!isEditingOrg} 
                                            className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                                            placeholder="Primary heading for reports"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Festival Theme Title</label>
                                        <input 
                                            type="text" 
                                            value={orgData.heading} 
                                            onChange={e => setOrgData({...orgData, heading: e.target.value})} 
                                            disabled={!isEditingOrg} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                            placeholder="e.g. AMAZIO 2026"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Branding Subtitle / Description</label>
                                        <input 
                                            type="text" 
                                            value={orgData.branding?.description || ''} 
                                            onChange={e => setOrgData(prev => ({...prev, branding: {...(prev.branding || {}), description: e.target.value}}))} 
                                            disabled={!isEditingOrg} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                            placeholder="Secondary subtitle for reports"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Organizing Body</label>
                                        <input 
                                            type="text" 
                                            value={orgData.organizingTeam} 
                                            onChange={e => setOrgData({...orgData, organizingTeam: e.target.value})} 
                                            disabled={!isEditingOrg} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                            placeholder="e.g. Student's Union 2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1 flex items-center gap-2">Main Event Dates <Calendar size={12}/></label>
                                        <div className={`w-full p-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl ${!isEditingOrg ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {(orgData.eventDates || []).map((date, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                                                        {date}
                                                        {isEditingOrg && (
                                                            <button onClick={() => handleRemoveEventDate(date)} className="p-0.5 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {isEditingOrg && (
                                                    <input 
                                                        type="date" 
                                                        className="bg-transparent border-none text-xs font-bold text-zinc-500 focus:ring-0 outline-none h-8"
                                                        onChange={(e) => { handleAddEventDate(e.target.value); e.target.value = ''; }} 
                                                    />
                                                )}
                                            </div>
                                            {orgData.eventDates.length === 0 && <p className="text-[10px] text-zinc-400 italic px-2 pb-1">Add all main festival days to highlight them on generated posters.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Dashboard Tagline</label>
                                        <textarea 
                                            rows={2}
                                            value={orgData.description} 
                                            onChange={e => setOrgData({...orgData, description: e.target.value})} 
                                            disabled={!isEditingOrg} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 resize-none"
                                            placeholder="Short tagline or motto..."
                                        />
                                    </div>
                                </div>
                                <div className="lg:col-span-1 h-full">
                                    <div className="h-full flex flex-col">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Logo (Light Theme / Watermark)</label>
                                        <div className="flex-grow">
                                            <ImageUpload 
                                                label="" 
                                                description="Logo used as a subtle watermark in reports." 
                                                currentValue={orgData.branding?.typographyUrlLight || ''} 
                                                onChange={v => setOrgData(prev => ({...prev, branding: {...(prev.branding || {}), typographyUrlLight: v}}))} 
                                                disabled={!isEditingOrg}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-1 h-full">
                                    <div className="h-full flex flex-col">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Logo (Dark Theme)</label>
                                        <div className="flex-grow">
                                            <ImageUpload 
                                                label="" 
                                                description="Logo displayed during Dark Theme mode." 
                                                currentValue={orgData.branding?.typographyUrlDark || ''} 
                                                onChange={v => setOrgData(prev => ({...prev, branding: {...(prev.branding || {}), typographyUrlDark: v}}))} 
                                                disabled={!isEditingOrg}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Home Page (Landing View) */}
                        <Card title="Home Page (Landing View)" action={isEditingHome ? <button onClick={handleSaveHome} className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"><Check size={20}/></button> : <button onClick={() => setIsEditingHome(true)} className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"><Edit2 size={18}/></button>}>
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                <div className="lg:col-span-3 space-y-6">
                                    {/* Top Badges and Titles */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Theme Tagline / Badge</label>
                                            <input 
                                                type="text" 
                                                value={homeData.badgeText} 
                                                onChange={e => setHomeData({...homeData, badgeText: e.target.value})} 
                                                disabled={!isEditingHome} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="e.g. The Rooted Tree"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Edition Tag</label>
                                            <input 
                                                type="text" 
                                                value={homeData.editionText} 
                                                onChange={e => setHomeData({...homeData, editionText: e.target.value})} 
                                                disabled={!isEditingHome} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="e.g. 2026 EDITION"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Hero Title (Fallback)</label>
                                            <input 
                                                type="text" 
                                                value={homeData.heroTitle} 
                                                onChange={e => setHomeData({...homeData, heroTitle: e.target.value})} 
                                                disabled={!isEditingHome} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="e.g. AMAZIO"
                                            />
                                        </div>
                                    </div>

                                    {/* Slogan and Description */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Hero Quote / Slogan</label>
                                        <input 
                                            type="text" 
                                            value={homeData.heroQuote} 
                                            onChange={e => setHomeData({...homeData, heroQuote: e.target.value})} 
                                            disabled={!isEditingHome} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                            placeholder='e.g. "Where Art Meets Orchestration"'
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Welcome Text / Description</label>
                                        <textarea 
                                            rows={2}
                                            value={homeData.heroDescription} 
                                            onChange={e => setHomeData({...homeData, heroDescription: e.target.value})} 
                                            disabled={!isEditingHome} 
                                            className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 resize-none"
                                            placeholder="Welcome message paragraph for visitors..."
                                        />
                                    </div>

                                    {/* Portal Titles */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Operator Portal Title</label>
                                            <input 
                                                type="text" 
                                                value={homeData.portalTitle} 
                                                onChange={e => setHomeData({...homeData, portalTitle: e.target.value})} 
                                                disabled={!isEditingHome} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="e.g. Operator Access"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Portal Subtitle</label>
                                            <input 
                                                type="text" 
                                                value={homeData.portalSubtitle} 
                                                onChange={e => setHomeData({...homeData, portalSubtitle: e.target.value})} 
                                                disabled={!isEditingHome} 
                                                className="w-full p-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                                placeholder="e.g. Secure Core Authentication"
                                            />
                                        </div>
                                    </div>

                                    {/* Visibility Toggles */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 ml-1">Display Components & Quick Links</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ToggleItem 
                                                label="Show Statistics Counter Cards" 
                                                isChecked={homeData.showStats} 
                                                onChange={v => isEditingHome && setHomeData({...homeData, showStats: v})} 
                                            />
                                            <ToggleItem 
                                                label="Show Live Dashboard CTA" 
                                                isChecked={homeData.showLiveDashboardBtn} 
                                                onChange={v => isEditingHome && setHomeData({...homeData, showLiveDashboardBtn: v})} 
                                            />
                                            <ToggleItem 
                                                label="Show Live Projector CTA" 
                                                isChecked={homeData.showLiveProjectorBtn} 
                                                onChange={v => isEditingHome && setHomeData({...homeData, showLiveProjectorBtn: v})} 
                                            />
                                            <ToggleItem 
                                                label="Show Creative Studio CTA" 
                                                isChecked={homeData.showCreativeStudioBtn} 
                                                onChange={v => isEditingHome && setHomeData({...homeData, showCreativeStudioBtn: v})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Hero Graphic */}
                                <div className="lg:col-span-1 h-full">
                                    <div className="h-full flex flex-col">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Custom Hero Banner</label>
                                        <div className="flex-grow">
                                            <ImageUpload 
                                                label="" 
                                                description="Optional hero graphic override for the landing page header." 
                                                currentValue={homeData.customHeroBannerUrl} 
                                                onChange={v => setHomeData({...homeData, customHeroBannerUrl: v})} 
                                                disabled={!isEditingHome}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                );
            case 'display': 
                return (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        {/* 1. Brand Identity & Typography */}
                        <div className="grid grid-cols-1 gap-8">
                            <Card title="Identity & Typography">
                                <div className="space-y-10">
                                    {/* Language Fonts */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <LanguageFontCard 
                                            title="English Primary"
                                            subtitle="Main Brand Font"
                                            language="englishPrimary"
                                            fontFamilyName="EnglishPrimary"
                                            previewText="Brand Identity Title"
                                            currentFont={state.customFonts?.englishPrimary}
                                            onSave={(f) => handleUpdateCustomFont('englishPrimary', f)}
                                        />
                                        <LanguageFontCard 
                                            title="English Secondary"
                                            subtitle="UI & Body Font"
                                            language="englishSecondary"
                                            fontFamilyName="EnglishSecondary"
                                            previewText="Secondary System Text"
                                            currentFont={state.customFonts?.englishSecondary}
                                            onSave={(f) => handleUpdateCustomFont('englishSecondary', f)}
                                        />
                                        <LanguageFontCard 
                                            title="Malayalam Global"
                                            subtitle="Native Script Font"
                                            language="malayalam"
                                            previewText="മലയാളം ഫോണ്ട് പ്രിവ്യൂ"
                                            currentFont={state.customFonts?.malayalam}
                                            onSave={(f) => handleUpdateCustomFont('malayalam', f)}
                                        />
                                        <LanguageFontCard 
                                            title="Arabic Global"
                                            subtitle="Directional Script Font"
                                            language="arabic"
                                            previewText="معاينة خط اللغة العربية"
                                            currentFont={state.customFonts?.arabic}
                                            onSave={(f) => handleUpdateCustomFont('arabic', f)}
                                        />
                                    </div>

                                    {/* Extended Type Library */}
                                    <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-widest text-amazio-primary dark:text-zinc-100">Extended Type Library</h4>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Supplementary fonts for Creative Studio and Reports.</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="text" 
                                                    value={newFontName} 
                                                    onChange={e => setNewFontName(e.target.value)} 
                                                    placeholder="New Font Name..."
                                                    className="px-4 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none"
                                                />
                                                <button 
                                                    onClick={() => fontUploadInputRef.current?.click()}
                                                    disabled={!newFontName.trim()}
                                                    className={`p-2.5 rounded-xl transition-all ${newFontName.trim() ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-100 text-zinc-300'}`}
                                                >
                                                    <Upload size={18}/>
                                                </button>
                                                <input type="file" ref={fontUploadInputRef} className="hidden" accept=".ttf,.otf,.woff,.woff2" onChange={handleAddGenericFont} />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {(state.generalCustomFonts || []).map(font => (
                                                <div key={font.id} className="p-4 bg-zinc-50/50 dark:bg-black/20 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 group relative">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest truncate max-w-[120px]">{font.family}</span>
                                                        <button onClick={() => handleDeleteGenericFont(font.id)} className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                                    </div>
                                                    <p className="text-center py-2 text-xl truncate" style={{ fontFamily: `'${font.family}', sans-serif` }}>{font.family}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* 2. Presentation & Live Data */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card title="Live Presentation (Projector)">
                                <div className="space-y-4">
                                    <ToggleItem 
                                        label="Enable Leaderboard Slide" 
                                        isChecked={state.settings.projector?.showLeaderboard !== false} 
                                        onChange={(v) => handleProjectorUpdate({ showLeaderboard: v })} 
                                    />
                                    <ToggleItem 
                                        label="Enable Results Slide" 
                                        isChecked={state.settings.projector?.showResults !== false} 
                                        onChange={(v) => handleProjectorUpdate({ showResults: v })} 
                                    />
                                    <ToggleItem 
                                        label="Enable Timeline Slide" 
                                        isChecked={state.settings.projector?.showUpcoming !== false} 
                                        onChange={(v) => handleProjectorUpdate({ showUpcoming: v })} 
                                    />
                                    <div className="pt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Rotation speed (ms)</label>
                                            <input 
                                                type="number" 
                                                step="1000"
                                                value={state.settings.projector?.rotationSpeed || 12000}
                                                onChange={e => handleProjectorUpdate({ rotationSpeed: +e.target.value })}
                                                className="w-full p-3 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-black tabular-nums"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">History limit</label>
                                            <input 
                                                type="number" 
                                                value={state.settings.projector?.resultsLimit || 3}
                                                onChange={e => handleProjectorUpdate({ resultsLimit: +e.target.value })}
                                                className="w-full p-3 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-black tabular-nums"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Document Print Defaults">
                                <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl mb-4">
                                        <div className="flex items-center gap-3">
                                            <Printer size={20} className="text-indigo-500" />
                                            <p className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">Default reporting state</p>
                                        </div>
                                    </div>
                                    <ToggleItem 
                                        label="Show Branding Header by Default" 
                                        isChecked={state.settings.reportSettings?.defaultShowHeader !== false} 
                                        onChange={(v) => handleReportDefaultUpdate({ defaultShowHeader: v })} 
                                    />
                                    <ToggleItem 
                                        label="Show System Footer by Default" 
                                        isChecked={state.settings.reportSettings?.defaultShowFooter !== false} 
                                        onChange={(v) => handleReportDefaultUpdate({ defaultShowFooter: v })} 
                                    />
                                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-2 px-1">These settings affect the initial state of the Reports page toggles.</p>
                                </div>
                            </Card>
                        </div>

                        {/* 3. Global Interface & Experience */}
                        <div className="grid grid-cols-1">
                            <Card title="Interface UX & Navigation">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <SectionTitle title="Mobile Navigation" color="emerald" />
                                        <div className="p-6 bg-zinc-50 dark:bg-black/20 border border-zinc-100 dark:border-zinc-800 rounded-[2rem]">
                                            <ToggleItem 
                                                label="Floating Quick-Access Rail" 
                                                isChecked={state.settings.enableFloatingNav === true} 
                                                onChange={e => updateSettings({ enableFloatingNav: e })} 
                                            />
                                            <div className="mt-4 flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                                <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Sidebar anchor mode</span>
                                                <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-xl">
                                                    <button onClick={() => updateSettings({ mobileSidebarMode: 'floating' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${state.settings.mobileSidebarMode === 'floating' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-400'}`}>Overlay</button>
                                                    <button onClick={() => updateSettings({ mobileSidebarMode: 'sticky' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${state.settings.mobileSidebarMode === 'sticky' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-400'}`}>Pinned</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <SectionTitle title="Schedule Density" color="purple" />
                                        <div className="p-6 bg-zinc-50 dark:bg-black/20 border border-zinc-100 dark:border-zinc-800 rounded-[2rem]">
                                            <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                                <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Display Priority</span>
                                                <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-xl">
                                                    <button onClick={() => updateSettings({ scheduleDisplayPriority: 'TIME_FIRST' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${state.settings.scheduleDisplayPriority === 'TIME_FIRST' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-400'}`}>Clock</button>
                                                    <button onClick={() => updateSettings({ scheduleDisplayPriority: 'DATE_FIRST' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${state.settings.scheduleDisplayPriority === 'DATE_FIRST' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-400'}`}>Calendar</button>
                                                </div>
                                            </div>
                                            <p className="mt-4 text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">Adjust which temporal element takes visual precedence on the Stage Timeline cards.</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="space-y-10 animate-in slide-in-from-bottom duration-500">
                        {/* Registry Card */}
                        <Card title="Authorized Access Registry" action={
                            <button 
                                onClick={() => { setEditingUser(undefined); setIsUserModalOpen(true); }}
                                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Plus size={14} strokeWidth={3}/> Add Operator
                            </button>
                        }>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-border text-[9px] font-black uppercase text-zinc-400 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Account Handle</th>
                                            <th className="px-6 py-4">Role Priority</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50 dark:divide-white/5">
                                        {(state.users || []).map(u => {
                                            const roleStyle = u.role === UserRole.MANAGER 
                                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
                                                : u.role === UserRole.JUDGE
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                : u.role === UserRole.TEAM_LEADER
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';

                                            return (
                                                <tr key={u.id} className="group hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4 font-black text-xs uppercase text-zinc-700 dark:text-zinc-200">{u.username}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${roleStyle}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors"><Edit2 size={16}/></button>
                                                            <button onClick={() => deleteUser(u.id)} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {state.users.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-[10px] uppercase font-bold text-zinc-400">No operators configured</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Scope Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[UserRole.TEAM_LEADER, UserRole.THIRD_PARTY, UserRole.JUDGE].map(role => {
                                const permissions = state.permissions[role] || [];
                                const allTabs = Object.values(TABS);
                                
                                return (
                                    <div key={role} className="bg-white dark:bg-[#121412] border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm md:shadow-xl flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-border">
                                            <div className="h-4 w-1 bg-emerald-500 rounded-full"></div>
                                            <h4 className="text-amazio-primary dark:text-white font-black font-serif text-lg tracking-tight capitalize">{role.replace('_', ' ')} Scopes</h4>
                                        </div>
                                        
                                        <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar max-h-[400px] pr-1">
                                            {allTabs.map(tab => {
                                                const isChecked = permissions.includes(tab);
                                                return (
                                                    <ScopeItem 
                                                        key={tab} 
                                                        label={tab} 
                                                        isChecked={isChecked} 
                                                        onChange={() => handlePermissionChange(role, tab, !isChecked)} 
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'instructions':
                return (
                    <div className="space-y-10 animate-in slide-in-from-top-4 duration-500 pb-12">
                        {/* General Master Instructions Section */}
                        <div className="group relative flex flex-col h-full bg-white dark:bg-[#121412] rounded-[2.5rem] border border-emerald-500/20 dark:border-white/5 shadow-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/40">
                            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-900/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Sparkles size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-amazio-primary dark:text-white">General Festival Instructions</h4>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Global System Broadcast</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-emerald-600/70 dark:text-emerald-500/60 hidden sm:inline">Active Registry</span>
                                    <CheckCircle2 className="text-emerald-500" size={18} />
                                </div>
                            </div>
                            <div className="p-6">
                                <textarea 
                                    rows={6} 
                                    value={state.settings.generalInstructions || ''} 
                                    onChange={e => updateSettings({ generalInstructions: e.target.value })} 
                                    className="w-full p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-sm font-bold text-amazio-primary dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-400 resize-none shadow-inner"
                                    placeholder="Enter global rules, welcome messages, and master announcements here..."
                                />
                            </div>
                            <div className="px-6 py-4 bg-zinc-50/30 dark:bg-black/10 flex items-center justify-between border-t border-zinc-50 dark:border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><Shield size={10}/> Persistent Global Meta</span>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Live Sync</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <SectionTitle title="Page-Specific Instructions" icon={BookText} color="indigo" />
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                                {Object.values(TABS).map(tab => {
                                    const Icon = TAB_ICON_MAP[tab] || Info;
                                    return (
                                        <div key={tab} className="group flex flex-col h-full bg-white dark:bg-[#121412] rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-glass-light dark:shadow-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
                                            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center gap-4 bg-zinc-50/50 dark:bg-white/[0.01]">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                    <Icon size={20} strokeWidth={2.5} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-amazio-primary dark:text-white truncate">
                                                        {TAB_DISPLAY_NAMES[tab] || tab}
                                                    </h4>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Contextual Guide</p>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <textarea 
                                                    rows={4} 
                                                    value={state.instructions[tab] || ''} 
                                                    onChange={e => updateInstruction({page: tab, text: e.target.value})} 
                                                    className="w-full p-4 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-amazio-primary dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400 resize-none"
                                                    placeholder={`Type directions for the ${TAB_DISPLAY_NAMES[tab] || tab} page here...`}
                                                />
                                            </div>
                                            <div className="px-6 py-4 bg-zinc-50/30 dark:bg-black/10 flex items-center justify-between border-t border-zinc-50 dark:border-white/5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><Shield size={10}/> Local Scope</span>
                                                <CheckCircle2 size={14} className="text-emerald-500 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 'data':
                return (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500 pb-12">
                        {/* Information Header */}
                        <div className="p-6 rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 flex items-start gap-4">
                            <ShieldCheck size={24} className="text-indigo-500 shrink-0" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Operational Continuity</h4>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 leading-relaxed">Manage system states and portability. These operations affect the entire dataset including users, scores, and media registry.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Export Section */}
                            <div className="group relative flex flex-col h-full bg-white dark:bg-[#121412] rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1">
                                <div className="p-8 pb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                        <FileDown size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">Snapshot State</h3>
                                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Generate a comprehensive JSON archive containing all current configurations, participants, and scoring data.</p>
                                </div>
                                <div className="p-8 mt-auto">
                                    <button 
                                        onClick={backupData}
                                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} strokeWidth={3}/> Export Production Data
                                    </button>
                                </div>
                            </div>

                            {/* Restore Section */}
                            <div className="group relative flex flex-col h-full bg-white dark:bg-[#121412] rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 hover:-translate-y-1">
                                <div className="p-8 pb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                        <RefreshCw className="animate-spin" size={16} />
                                    </div>
                                    <h3 className="text-2xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">System Restore</h3>
                                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Overwrite the existing database with data from a previously generated snapshot. <span className="text-indigo-500 font-bold uppercase">This action is irreversible.</span></p>
                                </div>
                                <div className="p-8 mt-auto">
                                    <input 
                                        type="file" 
                                        ref={restoreInputRef} 
                                        className="hidden" 
                                        accept=".json" 
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                if (confirm("CRITICAL WARNING: This will DELETE all current data and replace it with the selected backup. Proceed?")) {
                                                    restoreData(e.target.files[0]);
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => (restoreInputRef.current as any)?.click()}
                                        className="w-full py-4 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Upload size={16} strokeWidth={3}/> Upload Snapshot
                                    </button>
                                </div>
                            </div>

                            {/* Reset Section */}
                            <div className="group relative flex flex-col h-full bg-white dark:bg-[#121412] rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-2xl overflow-hidden transition-all duration-300 hover:border-rose-600/30 hover:-translate-y-1">
                                <div className="p-8 pb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-500 mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                        <Trash2 size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">Factory Reset</h3>
                                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Wipe all competition data, user accounts, and media assets. Revert the terminal to its initial empty state.</p>
                                </div>
                                <div className="p-8 mt-auto">
                                    <button 
                                        onClick={resetSystem}
                                        className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-500/20 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShieldAlert size={16} strokeWidth={3}/> Purge All Data
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Safety Disclaimer */}
                        <div className="flex items-center justify-center gap-2 py-4 opacity-50">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-50">Security: This operation requires manager authorization</span>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-700">
            <div className="flex flex-col gap-6">
                <div className="hidden md:flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Settings</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-medium text-lg italic">System orchestration console.</p>
                    </div>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {renderTabContent()}
            </div>

            <UserFormModal 
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSave={handleSaveUser}
                editingUser={editingUser}
                teams={state.teams}
                judges={state.judges}
            />

            {/* Add New Festival Edition Modal */}
            {isAddEditionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#151816] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                                    <Layers size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tight">
                                        Add New Festival Edition
                                    </h3>
                                    <p className="text-xs text-zinc-400">Initialize a new, isolated year/season environment.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAddEditionModalOpen(false)}
                                disabled={isCreatingEdition}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEditionSubmit} className="p-6 space-y-5">
                            {/* Live Badge Preview Card */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Preview</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        Edition {toRoman(newEditionForm.editionNumber || 1)} ({newEditionForm.editionNumber || 1})
                                    </span>
                                    <span className="text-xs font-bold text-zinc-400">· {newEditionForm.year || '2027'}</span>
                                </div>
                                <h4 className="text-sm font-bold text-amazio-primary dark:text-white truncate">
                                    {newEditionForm.name || 'Untitled Festival Edition'}
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                                        Edition Number *
                                    </label>
                                    <input 
                                        type="number"
                                        min="1"
                                        required
                                        value={newEditionForm.editionNumber}
                                        onChange={e => setNewEditionForm({...newEditionForm, editionNumber: parseInt(e.target.value) || 1})}
                                        placeholder="e.g. 2"
                                        className="w-full p-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                                        Festival Year *
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        value={newEditionForm.year}
                                        onChange={e => setNewEditionForm({...newEditionForm, year: e.target.value})}
                                        placeholder="e.g. 2027"
                                        className="w-full p-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                                    />
                                    {/* Quick Year Presets */}
                                    <div className="flex items-center gap-1.5 mt-2">
                                        {['2026', '2027', '2028', '2029'].map(yr => (
                                            <button
                                                key={yr}
                                                type="button"
                                                onClick={() => setNewEditionForm({...newEditionForm, year: yr})}
                                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                                    newEditionForm.year === yr 
                                                        ? 'bg-indigo-600 text-white' 
                                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                                }`}
                                            >
                                                {yr}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                                    Edition Name *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    value={newEditionForm.name}
                                    onChange={e => setNewEditionForm({...newEditionForm, name: e.target.value})}
                                    placeholder="e.g. Amazio Arts Fest 2027"
                                    className="w-full p-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                                />
                            </div>

                            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={newEditionForm.copyStructure}
                                        onChange={e => setNewEditionForm({...newEditionForm, copyStructure: e.target.checked})}
                                        className="mt-1 w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 block">
                                            Pre-load Structural Master Data
                                        </span>
                                        <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/70 block leading-relaxed mt-0.5">
                                            Copies categories, teams, programme items, and grade points from current workspace to save initial setup time.
                                        </span>
                                    </div>
                                </label>
                                
                                <div className="p-3 bg-white/80 dark:bg-black/40 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                    <strong className="text-indigo-600 dark:text-indigo-400">Data Isolation Guarantee:</strong> Individual participant entries, marks, scores, tabulation ledger, and final results will ALWAYS start clean (0 points) for complete season isolation.
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button 
                                    type="button"
                                    disabled={isCreatingEdition}
                                    onClick={() => setIsAddEditionModalOpen(false)}
                                    className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreatingEdition}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isCreatingEdition ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Creating Edition...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={14} strokeWidth={3} />
                                            <span>Create Edition & Activate</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Festival Edition Modal */}
            {isEditEditionModalOpen && editingEditionTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#151816] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tight">
                                        Edit Festival Edition
                                    </h3>
                                    <p className="text-xs text-zinc-400">Update naming, festival year, or archive status.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setIsEditEditionModalOpen(false); setEditingEditionTarget(null); }}
                                disabled={isUpdatingEdition}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateEditionSubmit} className="p-6 space-y-5">
                            {/* Live Badge Preview Card */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Preview</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        Edition {toRoman(editingEditionTarget.editionNumber)} ({editingEditionTarget.editionNumber})
                                    </span>
                                    <span className="text-xs font-bold text-zinc-400">· {editEditionForm.year}</span>
                                    {editEditionForm.isArchived && (
                                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold border border-amber-500/20">
                                            Archived
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-sm font-bold text-amazio-primary dark:text-white truncate">
                                    {editEditionForm.name || 'Untitled Edition'}
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                                        Edition Number
                                    </label>
                                    <input 
                                        type="text"
                                        disabled
                                        value={`Edition ${editingEditionTarget.editionNumber} (${toRoman(editingEditionTarget.editionNumber)})`}
                                        className="w-full p-3.5 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-400 outline-none cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                                        Festival Year *
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        value={editEditionForm.year}
                                        onChange={e => setEditEditionForm({...editEditionForm, year: e.target.value})}
                                        placeholder="e.g. 2026"
                                        className="w-full p-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                                    Edition Official Name *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    value={editEditionForm.name}
                                    onChange={e => setEditEditionForm({...editEditionForm, name: e.target.value})}
                                    placeholder="e.g. Amazio Knowledge Fest 2026"
                                    className="w-full p-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                                />
                            </div>

                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={editEditionForm.isArchived}
                                        onChange={e => setEditEditionForm({...editEditionForm, isArchived: e.target.checked})}
                                        className="mt-1 w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-amazio-primary dark:text-zinc-200 block">
                                            Mark as Archived Historical Season
                                        </span>
                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-relaxed mt-0.5">
                                            Indicates that this festival edition is concluded and preserved for recordkeeping and historical comparison.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button 
                                    type="button"
                                    disabled={isUpdatingEdition}
                                    onClick={() => { setIsEditEditionModalOpen(false); setEditingEditionTarget(null); }}
                                    className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isUpdatingEdition}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isUpdatingEdition ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Saving Changes...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} strokeWidth={3} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralSettings;