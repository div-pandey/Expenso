import type { Group, Expense, Settlement } from '../types';
import { INITIAL_GROUP, INITIAL_EXPENSES, INITIAL_SETTLEMENTS } from './demoData';

const STORAGE_KEY = 'expenso_data_v1';

export interface AppStorageState {
  group: Group;
  expenses: Expense[];
  settlements: Settlement[];
  isUsingDemoData: boolean;
  version: number;
}

export function loadStoredData(): AppStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First time loading - initialize with demo data
      const defaultState: AppStorageState = {
        group: INITIAL_GROUP,
        expenses: INITIAL_EXPENSES,
        settlements: INITIAL_SETTLEMENTS,
        isUsingDemoData: true,
        version: 1,
      };
      saveStoredData(defaultState);
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<AppStorageState>;
    
    // Validate shape
    if (!parsed.group || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.settlements)) {
      throw new Error('Corrupted storage structure');
    }

    return {
      group: parsed.group,
      expenses: parsed.expenses,
      settlements: parsed.settlements,
      isUsingDemoData: !!parsed.isUsingDemoData,
      version: parsed.version || 1,
    };
  } catch (err) {
    console.warn('Failed to read from localStorage, using demo fallback:', err);
    return {
      group: INITIAL_GROUP,
      expenses: INITIAL_EXPENSES,
      settlements: INITIAL_SETTLEMENTS,
      isUsingDemoData: true,
      version: 1,
    };
  }
}

export function saveStoredData(state: AppStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function resetToDemoData(): AppStorageState {
  const defaultState: AppStorageState = {
    group: { ...INITIAL_GROUP },
    expenses: [...INITIAL_EXPENSES],
    settlements: [...INITIAL_SETTLEMENTS],
    isUsingDemoData: true,
    version: 1,
  };
  saveStoredData(defaultState);
  return defaultState;
}

export function clearAllUserData(): AppStorageState {
  const emptyState: AppStorageState = {
    group: { ...INITIAL_GROUP },
    expenses: [],
    settlements: [],
    isUsingDemoData: false,
    version: 1,
  };
  saveStoredData(emptyState);
  return emptyState;
}
