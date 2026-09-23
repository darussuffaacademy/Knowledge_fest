import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, collection } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { AppState, User, UserRole, ItemType, ResultStatus, Result, TabulationEntry, ScheduledEvent, Team, Grade, Judge, CodeLetter, Participant, JudgeAssignment, Category, Item, PerformanceType, FontConfig, GeneralFontConfig, Template, Settings } from '../types';
import { DEFAULT_PAGE_PERMISSIONS, TABS, GUEST_PERMISSIONS } from '../constants';

const defaultState: AppState = {
  settings: {
    organizingTeam: 'Amazio Committee',
    heading: 'Amazio Knowledge Fest 2026',
    description: 'Specifically for orchestrating talent and intelligence in the 2026 Edition.',
    eventDates: [],
    maxItemsPerParticipant: { onStage: 5, offStage: 5 },
    maxTotalItemsPerParticipant: null,
    defaultParticipantsPerItem: 10,
    generalInstructions: 'Welcome to Amazio Knowledge Fest 2026! Adhere to the schedule and rules.',
    rankingStrategy: 'highest_mark',
    autoCodeAssignment: false,
    enableFloatingNav: false,
    mobileSidebarMode: 'floating',
    eventDays: [],
    stages: [],
    timeSlots: [],
    scheduleDisplayPriority: 'TIME_FIRST',
    projector: {
        showResults: true,
        showLeaderboard: true,
        showStats: true,
        showUpcoming: true,
        resultsLimit: 3,
        pointsLimit: 10,
        rotationSpeed: 12000
    },
    defaultPoints: {
      single: { first: 5, second: 3, third: 1 },
      group: { first: 10, second: 7, third: 5 },
    },
    reportSettings: {
      heading: 'Amazio 2026 Report',
      description: 'Official Documentation',
      header: 'Amazio Knowledge Fest Manager',
      footer: 'Amazio 2026 Edition',
      defaultShowHeader: true,
      defaultShowFooter: true,
    },
    institutionDetails: { name: '', address: '', email: '', contactNumber: '', description: '', logoUrl: '' },
    branding: { typographyUrl: '', teamLogoUrl: '' }
  },
  instructions: {},
  lotPool: [],
  customFonts: {},
  generalCustomFonts: [], 
  customTemplates: [], 
  customFooters: [], 
  customBackgrounds: [], 
  categories: [],
  teams: [],
  items: [],
  gradePoints: { single: [], group: [] },
  codeLetters: [],
  participants: [],
  schedule: [],
  judgeAssignments: [],
  tabulation: [],
  results: [],
  judges: [],
  users: [
    { id: 'user_admin_01', username: 'admin', role: UserRole.MANAGER },
    { id: 'user_amazio_01', username: 'Amazio', role: UserRole.MANAGER },
    { id: 'user_gemini_01', username: 'Gemini', role: UserRole.MANAGER }
  ],
  permissions: DEFAULT_PAGE_PERMISSIONS,
};

const SETTINGS_DOC_MAPPING: Record<string, (keyof Settings)[]> = {
  'settings_core': ['organizingTeam', 'heading', 'description', 'eventDates'],
  'settings_constraints': ['maxItemsPerParticipant', 'maxTotalItemsPerParticipant', 'defaultParticipantsPerItem'],
  'settings_logistics': ['eventDays', 'stages', 'timeSlots', 'scheduleDisplayPriority'],
  'settings_scoring': ['defaultPoints', 'rankingStrategy', 'autoCodeAssignment'],
  'settings_projector': ['projector'],
  'settings_institution': ['institutionDetails'],
  'settings_branding': ['branding'],
  'settings_reports': ['reportSettings'],
  'settings_ux': ['generalInstructions', 'enableFloatingNav', 'mobileSidebarMode'],
};

const cleanData = (data: any): any => {
    if (Array.isArray(data)) return data.map(cleanData);
    if (data !== null && typeof data === 'object') {
        return Object.fromEntries(
            Object.entries(data)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => [key, cleanData(value)])
        );
    }
    return data;
};

interface FirebaseContextType {
  state: AppState | null;
  currentUser: User | null;
  firebaseUser: FirebaseUser | null; 
  loading: boolean;
  isOnline: boolean;
  globalFilters: { teamId: string[]; categoryId: string[]; performanceType: string[]; itemType: string[]; itemId: string[]; status: ResultStatus[]; date: string[]; stage: string[]; assignmentStatus: string[]; };
  setGlobalFilters: React.Dispatch<React.SetStateAction<{ teamId: string[]; categoryId: string[]; performanceType: string[]; itemType: string[]; itemId: string[]; status: ResultStatus[]; date: string[]; stage: string[]; assignmentStatus: string[]; }>>;
  globalSearchTerm: string;
  setGlobalSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  dataEntryView: 'ITEMS' | 'PARTICIPANTS';
  setDataEntryView: (view: 'ITEMS' | 'PARTICIPANTS') => void;
  itemsSubView: 'ITEMS' | 'PARTICIPANTS';
  setItemsSubView: (v: 'ITEMS' | 'PARTICIPANTS') => void;
  teamsSubView: 'TEAMS' | 'CATEGORIES';
  setTeamsSubView: (v: 'TEAMS' | 'CATEGORIES') => void;
  gradeSubView: 'CODES' | 'GRADES';
  setGradeSubView: (v: 'CODES' | 'GRADES') => void;
  scoringSubView: 'QUEUE' | 'LEDGER';
  setScoringSubView: (v: 'QUEUE' | 'LEDGER') => void;
  judgesSubView: 'ASSIGNMENTS' | 'REGISTRY' | 'OVERVIEW';
  setJudgesSubView: (v: 'ASSIGNMENTS' | 'REGISTRY' | 'OVERVIEW') => void;
  settingsSubView: string;
  setSettingsSubView: (v: string) => void;
  login: (username: string, pass: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (payload: Partial<AppState['settings']>) => Promise<void>;
  updateLotPool: (payload: string[]) => Promise<void>;
  updateCustomFonts: (payload: AppState['customFonts']) => Promise<void>;
  updateGeneralCustomFonts: (payload: GeneralFontConfig[]) => Promise<void>;
  updateCustomBackgrounds: (payload: string[]) => Promise<void>;
  addCategory: (payload: Omit<Category, 'id'>) => Promise<void>;
  addMultipleCategories: (payload: Category[]) => Promise<void>;
  updateCategory: (payload: Category) => Promise<void>;
  reorderCategories: (payload: Category[]) => Promise<void>;
  deleteMultipleCategories: (ids: string[]) => Promise<void>;
  addTeam: (payload: Omit<Team, 'id'>) => Promise<void>;
  addMultipleTeams: (payload: Team[]) => Promise<void>;
  updateTeam: (payload: Team) => Promise<void>;
  reorderTeams: (payload: Team[]) => Promise<void>;
  deleteMultipleTeams: (ids: string[]) => Promise<void>;
  addItem: (payload: Omit<Item, 'id'>) => Promise<void>;
  addMultipleItems: (payload: Item[]) => Promise<void>;
  updateItem: (payload: Item) => Promise<void>;
  deleteMultipleItems: (ids: string[]) => Promise<void>;
  addGrade: (payload: { itemType: 'single' | 'group', grade: Omit<Grade, 'id'> }) => Promise<void>;
  updateGrade: (payload: { itemType: 'single' | 'group', grade: Grade }) => Promise<void>;
  deleteGrade: (payload: { itemType: 'single' | 'group', gradeId: string }) => Promise<void>;
  addCodeLetter: (payload: Omit<CodeLetter, 'id'>) => Promise<void>;
  addMultipleCodeLetters: (payloads: CodeLetter[]) => Promise<void>;
  updateCodeLetter: (payload: CodeLetter) => Promise<void>;
  reorderCodeLetters: (payload: CodeLetter[]) => Promise<void>;
  deleteCodeLetter: (id: string) => Promise<void>;
  deleteMultipleCodeLetters: (ids: string[]) => Promise<void>;
  addJudge: (payload: { name: string; place?: string; profession?: string; }) => Promise<void>;
  updateJudge: (payload: Judge) => Promise<void>;
  reorderJudges: (payload: Judge[]) => Promise<void>;
  deleteMultipleJudges: (ids: string[]) => Promise<void>;
  updateItemJudges: (payload: { itemId: string, categoryId: string, judgeIds: string[] }) => Promise<void>;
  setJudgeAssignments: (payload: JudgeAssignment[]) => Promise<void>;
  addParticipant: (payload: Omit<Participant, 'id'>) => Promise<void>;
  addMultipleParticipants: (payload: Participant[]) => Promise<void>;
  updateParticipant: (payload: Participant) => Promise<void>;
  updateMultipleParticipants: (payload: Participant[]) => Promise<void>;
  deleteMultipleParticipants: (ids: string[]) => Promise<void>;
  setSchedule: (payload: ScheduledEvent[]) => Promise<void>;
  addScheduleEvent: (payload: ScheduledEvent) => Promise<void>; 
  updateTabulationEntry: (payload: TabulationEntry) => Promise<void>;
  updateMultipleTabulationEntries: (payload: TabulationEntry[]) => Promise<void>;
  deleteEventTabulation: (itemId: string) => Promise<void>;
  saveResult: (payload: Result) => Promise<void>;
  addUser: (payload: Omit<User, 'id'>) => Promise<void>;
  updateUser: (payload: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updatePermissions: (payload: { role: UserRole, pages: string[] }) => Promise<void>;
  updateInstruction: (payload: { page: string, text: string }) => Promise<void>;
  hasPermission: (tab: string) => boolean;
  backupData: () => void;
  restoreData: (file: File) => Promise<void>;
  resetSystem: () => Promise<void>;
}

export const FirebaseContext = createContext<FirebaseContextType | null>(null);

const BASE_COLLECTION = 'artfest_v2';

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [globalFilters, setGlobalFilters] = useState({ 
    teamId: [] as string[], 
    categoryId: [] as string[], 
    performanceType: [] as string[], 
    itemType: [] as string[],
    itemId: [] as string[], 
    status: [] as ResultStatus[], 
    date: [] as string[], 
    stage: [] as string[],
    assignmentStatus: [] as string[]
  });
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  const [dataEntryView, setDataEntryView] = useState<'ITEMS' | 'PARTICIPANTS'>('ITEMS');
  const [itemsSubView, setItemsSubView] = useState<'ITEMS' | 'PARTICIPANTS'>('ITEMS');
  const [teamsSubView, setTeamsSubView] = useState<'TEAMS' | 'CATEGORIES'>('TEAMS');
  const [gradeSubView, setGradeSubView] = useState<'CODES' | 'GRADES'>('CODES');
  const [scoringSubView, setScoringSubView] = useState<'QUEUE' | 'LEDGER'>('QUEUE');
  const [judgesSubView, setJudgesSubView] = useState<'ASSIGNMENTS' | 'REGISTRY' | 'OVERVIEW'>('ASSIGNMENTS');
  const [settingsSubView, setSettingsSubView] = useState('details');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
        window.removeEventListener('online', handleStatusChange);
        window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        setAuthLoading(false); 
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const dataKeys = Object.keys(defaultState).filter(k => k !== 'settings');
    const settingsDocIds = Object.keys(SETTINGS_DOC_MAPPING);
    const allKeys = [...dataKeys, ...settingsDocIds];
    
    const initialLoading: Record<string, boolean> = {};
    allKeys.forEach(k => initialLoading[k] = true);
    setLoadingMap(initialLoading);

    const unsubscribers = allKeys.map(key => {
      return onSnapshot(doc(db, BASE_COLLECTION, key), (snapshot) => {
        const data = snapshot.data();
        const value = data ? data.value : null;

        setState(prev => {
          const current = prev || defaultState;
          
          if (key.startsWith('settings_')) {
              return {
                ...current,
                settings: {
                  ...current.settings,
                  ...(value || {})
                }
              };
          }

          return { ...current, [key]: value !== null ? value : (defaultState as any)[key] };
        });
        setLoadingMap(prev => ({ ...prev, [key]: false }));
      }, (e) => {
        console.warn(`Listener failed for ${key}`);
        setLoadingMap(prev => ({ ...prev, [key]: false }));
      });
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  useEffect(() => {
    if (state && firebaseUser) {
        const email = firebaseUser.email || '';
        const username = email.split('@')[0].trim().toLowerCase();
        const appUser = state.users.find(u => u.username.toLowerCase() === username);
        if (appUser) setCurrentUser(appUser);
    } else {
        setCurrentUser(null);
    }
  }, [state, firebaseUser]);

  const login = async (username: string, pass: string) => {
    const email = `${username}@artfest.com`;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  const writeDoc = async (key: string, value: any) => {
    try {
        const docRef = doc(db, BASE_COLLECTION, key);
        const sanitizedValue = cleanData(value);
        const sizeEstimate = JSON.stringify(sanitizedValue).length;
        if (sizeEstimate > 980000) {
            throw new Error(`Data block '${key}' is nearing 1MB Firestore limit. Please remove old assets.`);
        }
        await setDoc(docRef, { value: sanitizedValue }, { merge: false });
    } catch (err: any) {
        console.error(`Error writing document ${key}:`, err);
        throw err;
    }
  };

  const genericOps = (listName: keyof AppState) => ({
      add: async (payload: any) => {
          if (!state) return;
          const newList = [...(state[listName] as any[]), { ...payload, id: `${listName}_${Date.now()}` }];
          await writeDoc(listName as string, newList);
      },
      update: async (payload: any) => {
          if (!state) return;
          const newList = (state[listName] as any[]).map(item => item.id === payload.id ? payload : item);
          await writeDoc(listName as string, newList);
      },
      deleteMultiple: async (ids: string[]) => {
          if (!state) return;
          const newList = (state[listName] as any[]).filter(item => !ids.includes(item.id));
          await writeDoc(listName as string, newList);
      }
  });

  const catOps = genericOps('categories');
  const teamOps = genericOps('teams');
  const itemOps = genericOps('items');
  const partOps = genericOps('participants');

  const isLoading = authLoading || Object.values(loadingMap).some(v => v);

  const contextValue: FirebaseContextType = {
    state, currentUser, firebaseUser, loading: isLoading, isOnline,
    login, logout, globalFilters, setGlobalFilters, globalSearchTerm, setGlobalSearchTerm,
    dataEntryView, setDataEntryView, itemsSubView, setItemsSubView, teamsSubView, setTeamsSubView, gradeSubView, setGradeSubView,
    scoringSubView, setScoringSubView, judgesSubView, setJudgesSubView, settingsSubView, setSettingsSubView,
    
    updateSettings: async (p) => {
        if (!state) return;
        const affectedDocs = new Set<string>();
        Object.keys(p).forEach(key => {
            for (const [docId, keys] of Object.entries(SETTINGS_DOC_MAPPING)) {
                if ((keys as string[]).includes(key)) {
                    affectedDocs.add(docId);
                }
            }
        });

        const promises = Array.from(affectedDocs).map(docId => {
            const keysForThisDoc = SETTINGS_DOC_MAPPING[docId];
            const updatedDataForDoc: any = {};
            keysForThisDoc.forEach(k => {
                updatedDataForDoc[k] = (p as any)[k] !== undefined ? (p as any)[k] : (state.settings as any)[k];
            });
            return writeDoc(docId, updatedDataForDoc);
        });

        await Promise.all(promises);
    },

    updateLotPool: (p) => writeDoc('lotPool', p),
    updateCustomFonts: (p) => writeDoc('customFonts', p),
    updateGeneralCustomFonts: (p) => writeDoc('generalCustomFonts', p),
    updateCustomBackgrounds: (p) => writeDoc('customBackgrounds', p),
    addCategory: catOps.add, addMultipleCategories: async (p) => writeDoc('categories', [...(state?.categories || []), ...p]),
    updateCategory: catOps.update, reorderCategories: (p) => writeDoc('categories', p), deleteMultipleCategories: catOps.deleteMultiple,
    addTeam: teamOps.add, addMultipleTeams: async (p) => writeDoc('teams', [...(state?.teams || []), ...p]),
    updateTeam: teamOps.update, reorderTeams: (p) => writeDoc('teams', p), deleteMultipleTeams: teamOps.deleteMultiple,
    addItem: itemOps.add, addMultipleItems: async (p) => writeDoc('items', [...(state?.items || []), ...p]),
    updateItem: itemOps.update, 
    deleteMultipleItems: async (ids: string[]) => {
        if (!state) return;
        const newItems = state.items.filter(item => !ids.includes(item.id));
        const promises: Promise<any>[] = [writeDoc('items', newItems)];

        let participantsChanged = false;
        const newParticipants = state.participants.map(p => {
            const hasItem = p.itemIds.some(id => ids.includes(id));
            if (!hasItem) return p;
            participantsChanged = true;
            const nextItemIds = p.itemIds.filter(id => !ids.includes(id));
            const nextItemGroups = { ...(p.itemGroups || {}) };
            const nextLeaders = (p.groupLeaderItemIds || []).filter(id => !ids.includes(id));
            const nextChests = { ...(p.groupChestNumbers || {}) };
            ids.forEach(id => {
                delete nextItemGroups[id];
                delete nextChests[id];
            });
            return {
                ...p,
                itemIds: nextItemIds,
                itemGroups: nextItemGroups,
                groupLeaderItemIds: nextLeaders,
                groupChestNumbers: nextChests
            };
        });
        if (participantsChanged) {
            promises.push(writeDoc('participants', newParticipants));
        }

        if (state.schedule.some(s => ids.includes(s.itemId))) {
            const newSchedule = state.schedule.filter(s => !ids.includes(s.itemId));
            promises.push(writeDoc('schedule', newSchedule));
        }

        if (state.judgeAssignments.some(j => ids.includes(j.itemId))) {
            const newJudgeAssignments = state.judgeAssignments.filter(j => !ids.includes(j.itemId));
            promises.push(writeDoc('judgeAssignments', newJudgeAssignments));
        }

        if (state.tabulation.some(t => ids.includes(t.itemId))) {
            const newTabulation = state.tabulation.filter(t => !ids.includes(t.itemId));
            promises.push(writeDoc('tabulation', newTabulation));
        }

        if (state.results.some(r => ids.includes(r.itemId))) {
            const newResults = state.results.filter(r => !ids.includes(r.itemId));
            promises.push(writeDoc('results', newResults));
        }

        await Promise.all(promises);
    },
    addGrade: async ({ itemType, grade }) => {
        const list = [...state!.gradePoints[itemType], { ...grade, id: `g_${Date.now()}` }];
        await writeDoc('gradePoints', { ...state!.gradePoints, [itemType]: list });
    },
    updateGrade: async ({ itemType, grade }) => {
        const list = state!.gradePoints[itemType].map(g => g.id === grade.id ? grade : g);
        await writeDoc('gradePoints', { ...state!.gradePoints, [itemType]: list });
    },
    deleteGrade: async ({ itemType, gradeId }) => {
        const list = state!.gradePoints[itemType].filter(g => g.id !== gradeId);
        await writeDoc('gradePoints', { ...state!.gradePoints, [itemType]: list });
    },
    addCodeLetter: async (p) => writeDoc('codeLetters', [...state!.codeLetters, { ...p, id: `c_${Date.now()}` }]),
    addMultipleCodeLetters: async (p) => writeDoc('codeLetters', [...state!.codeLetters, ...p]),
    updateCodeLetter: async (p) => writeDoc('codeLetters', state!.codeLetters.map(c => c.id === p.id ? p : c)),
    reorderCodeLetters: (p) => writeDoc('codeLetters', p),
    deleteCodeLetter: async (id) => writeDoc('codeLetters', state!.codeLetters.filter(c => c.id !== id)),
    deleteMultipleCodeLetters: async (ids) => writeDoc('codeLetters', state!.codeLetters.filter(c => !ids.includes(c.id))),
    addJudge: async (p) => writeDoc('judges', [...state!.judges, { ...p, id: `j_${Date.now()}` }]),
    updateJudge: async (p) => writeDoc('judges', state!.judges.map(j => j.id === p.id ? p : j)),
    reorderJudges: (p) => writeDoc('judges', p),
    deleteMultipleJudges: async (ids) => writeDoc('judges', state!.judges.filter(j => !ids.includes(j.id))),
    updateItemJudges: async (p) => {
        const assignments = state!.judgeAssignments.filter(a => a.itemId !== p.itemId);
        assignments.push({ ...p, id: `${p.itemId}-${p.categoryId}` });
        await writeDoc('judgeAssignments', assignments);
    },
    setJudgeAssignments: (p) => writeDoc('judgeAssignments', p),
    addParticipant: partOps.add, addMultipleParticipants: async (p) => writeDoc('participants', [...state!.participants, ...p]),
    updateParticipant: partOps.update, updateMultipleParticipants: async (p) => {
        const map = new Map(p.map(x => [x.id, x]));
        const next = state!.participants.map(x => map.has(x.id) ? map.get(x.id)! : x);
        await writeDoc('participants', next);
    },
    deleteMultipleParticipants: async (ids: string[]) => {
        if (!state) return;
        const newParticipants = state.participants.filter(p => !ids.includes(p.id));
        const promises: Promise<any>[] = [writeDoc('participants', newParticipants)];
        if (state.tabulation.some(t => ids.includes(t.participantId))) {
            const newTabulation = state.tabulation.filter(t => !ids.includes(t.participantId));
            promises.push(writeDoc('tabulation', newTabulation));
        }
        await Promise.all(promises);
    },
    setSchedule: (p) => writeDoc('schedule', p),
    addScheduleEvent: async (p) => writeDoc('schedule', [...state!.schedule, p]),
    updateTabulationEntry: async (p) => {
        const next = state!.tabulation.filter(t => t.id !== p.id);
        next.push(p);
        await writeDoc('tabulation', next);
    },
    updateMultipleTabulationEntries: async (p) => {
        const map = new Map(p.map(x => [x.id, x]));
        const next = state!.tabulation.map(x => map.has(x.id) ? map.get(x.id)! : x);
        p.forEach(x => { if(!state!.tabulation.find(t=>t.id===x.id)) next.push(x); });
        await writeDoc('tabulation', next);
    },
    deleteEventTabulation: async (itemId) => writeDoc('tabulation', state!.tabulation.filter(t => t.itemId !== itemId)),
    saveResult: async (payload: Result) => {
        if (!state) return;
        const nextResults = state.results.filter(r => r.itemId !== payload.itemId);
        nextResults.push(payload);
        await writeDoc('results', nextResults);
    },
    addUser: async (p) => writeDoc('users', [...state!.users, { ...p, id: `u_${Date.now()}` }]),
    updateUser: async (p) => writeDoc('users', state!.users.map(u => u.id === p.id ? p : u)),
    deleteUser: async (id) => writeDoc('users', state!.users.filter(u => u.id !== id)),
    updatePermissions: async ({ role, pages }) => writeDoc('permissions', { ...state?.permissions, [role]: pages }),
    updateInstruction: async ({ page, text }) => writeDoc('instructions', { ...state?.instructions, [page]: text }),
    hasPermission: (tab) => {
        if (GUEST_PERMISSIONS.includes(tab)) return true;
        if (!currentUser) return false;
        return state?.permissions[currentUser.role]?.includes(tab) || false;
    },
    backupData: () => {
        const blob = new Blob([JSON.stringify(state)], {type: 'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='artfest.json'; a.click();
    },
    restoreData: async (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = JSON.parse(e.target?.result as string);
            for (const key of Object.keys(data)) {
                await writeDoc(key, data[key]);
            }
        };
        reader.readAsText(file);
    },
    resetSystem: async () => {
        if (!confirm("CRITICAL: This will PERMANENTLY DELETE all festival data and reset all settings to defaults. Are you absolutely sure?")) return;
        if (!confirm("FINAL WARNING: This action cannot be undone. All participants, results, and custom configurations will be wiped. Proceed?")) return;
        
        try {
            // Reset non-settings docs
            const dataKeys = Object.keys(defaultState).filter(k => k !== 'settings');
            for (const key of dataKeys) {
                await writeDoc(key, (defaultState as any)[key]);
            }
            
            // Reset settings docs using documented mapping
            for (const docId of Object.keys(SETTINGS_DOC_MAPPING)) {
                const keysForThisDoc = SETTINGS_DOC_MAPPING[docId];
                const defaultDataForDoc: any = {};
                keysForThisDoc.forEach(k => {
                    defaultDataForDoc[k] = (defaultState.settings as any)[k];
                });
                await writeDoc(docId, defaultDataForDoc);
            }
            
            alert("System has been reset to factory defaults.");
            window.location.reload();
        } catch (err) {
            console.error("Reset failed:", err);
            alert("Failed to reset system.");
        }
    }
  };

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
