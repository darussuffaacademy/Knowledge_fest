
export enum ItemType {
  SINGLE = 'Single',
  GROUP = 'Group',
}

export enum PerformanceType {
  ON_STAGE = 'On Stage',
  OFF_STAGE = 'Off Stage',
}

export enum ResultStatus {
  NOT_UPLOADED = 'Not Uploaded',
  UPLOADED = 'Uploaded',
  UPDATED = 'Updated',
  DECLARED = 'Declared',
}

export enum UserRole {
    MANAGER = 'Manager',
    TEAM_LEADER = 'Team Leader',
    THIRD_PARTY = 'Third Party',
    JUDGE = 'Judge',
}

export interface User {
    id: string; 
    username: string;
    role: UserRole;
    teamId?: string; 
    judgeId?: string; 
}

export interface Judge {
  id: string;
  name: string;
  place?: string;
  profession?: string;
}

export interface FontConfig {
    url: string; 
    name: string; 
    family: string; 
}

export interface GeneralFontConfig extends FontConfig {
    id: string;
}

export interface CanvasElement {
    id: string;
    type: 'text' | 'image' | 'shape';
    content: string; 
    x: number; 
    y: number; 
    width?: number; 
    height?: number; 
    fontSize?: number; 
    color?: string;
    fontWeight?: string; 
    fontStyle?: string; 
    textDecoration?: 'none' | 'underline' | 'line-through'; 
    textTransform?: 'none' | 'uppercase' | 'lowercase'; 
    textAlign?: 'left' | 'center' | 'right';
    fontFamily?: string; 
    backgroundColor?: string; 
    backgroundPadding?: number; 
    textStroke?: { color: string; width: number }; 
    textShadow?: { color: string; blur: number; offsetX: number; offsetY: number }; 
    lineHeight?: number; 
    letterSpacing?: number; 

    borderRadius?: number; 
    borderColor?: string; 
    borderWidth?: number; 

    shapeType?: 'rectangle' | 'circle'; 

    zIndex: number;
    locked?: boolean;
    opacity?: number; 
    rotation?: number; 
}

export interface Template {
    id: string;
    name: string;
    bg: string;
    bgImage?: string; 
    text: string;
    accent: string;
    border: string;
    description: string;
    isCustom?: boolean;
    elements?: CanvasElement[]; 
    canvasConfig?: { 
        width: number; 
        height: number;
        orientation: 'portrait' | 'landscape';
    };
}

export interface ProjectorSettings {
    showResults: boolean;
    showLeaderboard: boolean;
    showStats: boolean;
    showUpcoming: boolean;
    resultsLimit: number;
    pointsLimit: number; 
    rotationSpeed: number; 
}

export interface HomePageSettings {
    badgeText?: string;
    editionText?: string;
    heroTitle?: string;
    heroQuote?: string;
    heroDescription?: string;
    portalTitle?: string;
    portalSubtitle?: string;
    showStats?: boolean;
    showLiveDashboardBtn?: boolean;
    showLiveProjectorBtn?: boolean;
    showCreativeStudioBtn?: boolean;
    customHeroBannerUrl?: string;
}

export interface Settings {
  organizingTeam: string;
  heading: string;
  description: string;
  eventDates?: string[]; 
  homePage?: HomePageSettings;
  maxItemsPerParticipant: {
    onStage: number;
    offStage: number;
  };
  maxTotalItemsPerParticipant?: number | null; 
  defaultParticipantsPerItem: number;
  generalInstructions: string;
  rankingStrategy?: string; 
  autoCodeAssignment?: boolean;
  enableFloatingNav?: boolean; 
  mobileSidebarMode?: 'floating' | 'sticky'; 
  
  eventDays?: string[];
  stages?: string[];
  timeSlots?: string[];
  scheduleDisplayPriority?: 'TIME_FIRST' | 'DATE_FIRST';

  projector?: ProjectorSettings;

  defaultPoints: {
    single: {
      first: number;
      second: number;
      third: number;
    };
    group: {
      first: number;
      second: number;
      third: number;
    };
  };
  reportSettings: {
    heading: string;
    description: string;
    header: string;
    footer: string;
    defaultShowHeader?: boolean;
    defaultShowFooter?: boolean;
  };
  institutionDetails?: {
      name: string;
      address: string;
      email: string;
      contactNumber: string;
      description?: string;
      logoUrl?: string; 
  };
  branding?: {
      eventName?: string;
      description?: string;
      typographyUrl?: string; 
      typographyUrlLight?: string; 
      typographyUrlDark?: string; 
      teamLogoUrl?: string; 
  };
}

export interface Category {
  id: string;
  name: string;
  maxOnStage?: number;
  maxOffStage?: number;
  maxCombined?: number; 
  isGeneralCategory?: boolean;
}

export interface Team {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  code?: string; 
  description: string;
  categoryId: string;
  type: ItemType;
  performanceType: PerformanceType;
  points: {
    first: number;
    second: number;
    third: number;
  };
  gradePointsOverride?: { [gradeId: string]: number }; 
  maxParticipants: number;
  maxGroupsPerTeam?: number; 
  medium: string;
  duration: number; 
}

export interface Grade {
  id: string;
  name: string;
  lowerLimit: number;
  upperLimit: number;
  points: number;
}

export interface GradePointConfig {
  single: Grade[];
  group: Grade[];
}

export interface CodeLetter {
  id: string;
  code: string;
  type?: 'General' | 'On-Stage' | 'Off-Stage';
}

export interface Participant {
  id: string;
  chestNumber: string;
  name: string;
  place?: string; 
  teamId: string;
  categoryId: string;
  itemIds: string[];
  groupLeaderItemIds?: string[]; 
  itemGroups?: { [itemId: string]: number }; 
  groupChestNumbers?: { [itemId: string]: string }; 
  role?: 'leader' | 'assistant';
}

export interface ScheduledEvent {
  id: string;
  itemId: string;
  categoryId: string;
  date: string;
  time: string;
  stage: string;
}

export interface JudgeAssignment {
  id: string; 
  itemId: string;
  categoryId: string;
  judgeIds: string[];
}

export interface TabulationEntry {
  id: string; 
  itemId: string;
  categoryId: string;
  participantId: string;
  codeLetter: string;
  customChestNumber?: string; 
  marks: { [judgeId: string]: number | null };
  finalMark: number | null;
  position: number | null;
  gradeId: string | null;
}

export interface Result {
    itemId: string;
    categoryId: string;
    status: ResultStatus;
    winners: {
        participantId: string;
        position: number;
        mark: number | null;
        gradeId: string | null;
    }[];
}

export interface AppState {
  settings: Settings;
  instructions: { [page: string]: string };
  lotPool: string[];
  // High-volume assets moved to top level for split-document storage
  customFonts: {
      malayalam?: FontConfig;
      arabic?: FontConfig;
      english?: FontConfig;
      englishPrimary?: FontConfig;
      englishSecondary?: FontConfig;
  };
  generalCustomFonts: GeneralFontConfig[];
  customBackgrounds: string[];
  customTemplates: Template[];
  customFooters: string[];
  
  categories: Category[];
  teams: Team[];
  items: Item[];
  gradePoints: GradePointConfig;
  codeLetters: CodeLetter[];
  participants: Participant[];
  schedule: ScheduledEvent[];
  judgeAssignments: JudgeAssignment[];
  tabulation: TabulationEntry[];
  results: Result[];
  judges: Judge[];
  users: User[];
  permissions: { [key in UserRole]: string[] };
}
