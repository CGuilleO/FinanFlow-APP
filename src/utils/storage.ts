import { Account, BillReminder, Category, FinancialHealthAnalysis, SavingsGoal, Transaction, UserSettings } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_BILLS, DEFAULT_CATEGORIES, DEFAULT_GOALS, DEFAULT_SETTINGS, generateStarterTransactions } from './constants';
import { getCurrentSession } from './authStorage';
import { pushUserCloudData, CloudUserData } from '../lib/firebase';

export function getEffectiveUserId(): string {
  const session = getCurrentSession();
  if (session && session.email) {
    return session.email.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
  return 'cguilleo_gmail_com'; // Default to user's main account
}

function getUserStorageKey(baseKey: string): string {
  const userId = getEffectiveUserId();
  return `finanflow_${userId}_${baseKey}`;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'transactions_v1',
  CATEGORIES: 'categories_v1',
  ACCOUNTS: 'accounts_v1',
  BILLS: 'bills_v1',
  GOALS: 'goals_v1',
  SETTINGS: 'settings_v1',
  AI_ADVICE: 'ai_advice_v1',
  SYNC_LOG: 'sync_log_v1',
  LAST_CLOUD_SYNC: 'last_cloud_sync_v1',
  INITIALIZED_FLAG: 'initialized_flag_v1',
};

// Listeners for store changes
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let syncTimeout: any = null;

export async function syncCurrentDataToCloud(): Promise<boolean> {
  const targetUserId = getEffectiveUserId();
  try {
    const dataToPush: CloudUserData = {
      transactions: getStoredTransactions(),
      accounts: getStoredAccounts(),
      categories: getStoredCategories(),
      bills: getStoredBills(),
      goals: getStoredGoals(),
      settings: getStoredSettings(),
    };
    const success = await pushUserCloudData(targetUserId, dataToPush);
    if (success) {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.LAST_CLOUD_SYNC), new Date().toISOString());
    }
    return success;
  } catch (err) {
    console.error('Error syncing to cloud:', err);
    return false;
  }
}

function triggerBackgroundCloudSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await syncCurrentDataToCloud();
  }, 500);
}

function notifyListeners() {
  triggerBackgroundCloudSync();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in store listener', e);
    }
  });
}

export function sortTransactionsDesc(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

// 1. Transactions Storage
export function getStoredTransactions(): Transaction[] {
  try {
    const currentKey = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS);
    const raw = localStorage.getItem(currentKey);

    // If explicit empty array stored, return empty array (do NOT revive starter data!)
    if (raw === '[]') {
      return [];
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return sortTransactionsDesc(parsed);
      } catch {}
    }

    // Check if user has initialized previously
    const initFlag = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG));
    if (initFlag === 'true') {
      return [];
    }

    // Check legacy storage keys if first time migration
    const candidates = [
      'finanflow_cguilleo_gmail_com_transactions_v1',
      'finanflow_usr_cguilleo_gmail_com_transactions_v1',
      'finanflow_guest_transactions_v1',
      'finanflow_transactions_v1',
      'transactions_v1',
    ];
    for (const k of candidates) {
      const val = localStorage.getItem(k);
      if (val && val !== '[]') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sorted = sortTransactionsDesc(parsed);
            localStorage.setItem(currentKey, JSON.stringify(sorted));
            localStorage.setItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG), 'true');
            return sorted;
          }
        } catch {}
      }
    }

    // Check all keys for any array of transactions
    let maxLen = 0;
    let bestRaw: string | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.includes('transaction') || k.includes('tx'))) {
        const v = localStorage.getItem(k);
        if (v) {
          try {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed) && parsed.length > maxLen) {
              maxLen = parsed.length;
              bestRaw = v;
            }
          } catch {}
        }
      }
    }
    if (bestRaw && maxLen > 0) {
      const sorted = sortTransactionsDesc(JSON.parse(bestRaw));
      localStorage.setItem(currentKey, JSON.stringify(sorted));
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG), 'true');
      return sorted;
    }

    const initial = generateStarterTransactions();
    saveStoredTransactions(initial, false);
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG), 'true');
    return initial;
  } catch (e) {
    console.error('Failed to parse transactions', e);
    return [];
  }
}

export function saveStoredTransactions(transactions: Transaction[], notify = true) {
  try {
    const key = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS);
    const sorted = sortTransactionsDesc(transactions);
    localStorage.setItem(key, JSON.stringify(sorted));
    recalculateAccountBalances();
    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
}

export function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
  const all = getStoredTransactions();
  const newTx: Transaction = {
    ...transaction,
    id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.unshift(newTx);
  saveStoredTransactions(all);
  return newTx;
}

export function addMultipleTransactions(transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Transaction[] {
  const all = getStoredTransactions();
  const created: Transaction[] = transactions.map((t, idx) => ({
    ...t,
    id: 'tx-' + (Date.now() + idx) + '-' + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const updatedAll = [...created, ...all];
  saveStoredTransactions(updatedAll);
  return created;
}

export function updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
  const all = getStoredTransactions();
  const index = all.findIndex((t) => t.id === id);
  if (index === -1) return null;
  
  const updatedTx = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updatedTx;
  saveStoredTransactions(all);
  return updatedTx;
}

export function deleteTransaction(id: string): boolean {
  const all = getStoredTransactions();
  const filtered = all.filter((t) => t.id !== id);
  if (filtered.length !== all.length) {
    saveStoredTransactions(filtered);
    return true;
  }
  return false;
}

// 2. Categories Storage
export function getStoredCategories(): Category[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.CATEGORIES));
    if (!raw) {
      saveStoredCategories(DEFAULT_CATEGORIES, false);
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

export function saveStoredCategories(categories: Category[], notify = true) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.CATEGORIES), JSON.stringify(categories));
    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

export function addCategory(category: Omit<Category, 'id'>): Category {
  const all = getStoredCategories();
  const newCat: Category = {
    ...category,
    id: 'cat-' + Date.now(),
  };
  all.push(newCat);
  saveStoredCategories(all);
  return newCat;
}

export function updateCategory(id: string, updates: Partial<Category>): Category | null {
  const all = getStoredCategories();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveStoredCategories(all);
  return all[idx];
}

export function deleteCategory(id: string): boolean {
  const all = getStoredCategories();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length !== all.length) {
    saveStoredCategories(filtered);
    return true;
  }
  return false;
}

// 3. Accounts Storage & Balance Recalculation
export function getStoredAccounts(): Account[] {
  try {
    const currentKey = getUserStorageKey(STORAGE_KEYS.ACCOUNTS);
    let raw = localStorage.getItem(currentKey);
    if (!raw || raw === '[]') {
      const legacy = localStorage.getItem('finanflow_accounts_v1') || localStorage.getItem('accounts_v1');
      if (legacy && legacy !== '[]') {
        raw = legacy;
        localStorage.setItem(currentKey, raw);
      }
    }
    if (!raw) {
      saveStoredAccounts(DEFAULT_ACCOUNTS, false);
      return DEFAULT_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_ACCOUNTS;
  }
}

export function saveStoredAccounts(accounts: Account[], notify = true) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.ACCOUNTS), JSON.stringify(accounts));
    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save accounts', e);
  }
}

export function recalculateAccountBalances() {
  try {
    const rawAccounts = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.ACCOUNTS));
    const rawTxs = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.TRANSACTIONS));
    if (!rawAccounts) return;
    const accounts: Account[] = JSON.parse(rawAccounts);
    const txs: Transaction[] = rawTxs ? JSON.parse(rawTxs) : [];

    const updatedAccounts = accounts.map((acc) => {
      let balance = acc.initialBalance || 0;
      for (const tx of txs) {
        if (tx.accountId === acc.id) {
          if (tx.type === 'income') {
            balance += tx.amount;
          } else if (tx.type === 'expense') {
            balance -= tx.amount;
          } else if (tx.type === 'transfer') {
            balance -= tx.amount;
          }
        }
        if (tx.type === 'transfer' && tx.toAccountId === acc.id) {
          balance += tx.amount;
        }
      }
      return {
        ...acc,
        currentBalance: Math.round(balance * 100) / 100,
      };
    });

    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.ACCOUNTS), JSON.stringify(updatedAccounts));
  } catch (e) {
    console.error('Error recalculating account balances', e);
  }
}

export function addAccount(account: Omit<Account, 'id' | 'currentBalance'>): Account {
  const all = getStoredAccounts();
  const newAcc: Account = {
    ...account,
    id: 'acc-' + Date.now(),
    currentBalance: account.initialBalance,
  };
  all.push(newAcc);
  saveStoredAccounts(all);
  recalculateAccountBalances();
  return newAcc;
}

export function updateAccount(id: string, updates: Partial<Account>): Account | null {
  const all = getStoredAccounts();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveStoredAccounts(all);
  recalculateAccountBalances();
  return all[idx];
}

export function deleteAccount(id: string): boolean {
  const all = getStoredAccounts();
  const filtered = all.filter((a) => a.id !== id);
  if (filtered.length !== all.length) {
    saveStoredAccounts(filtered);
    recalculateAccountBalances();
    return true;
  }
  return false;
}

// 4. Bills Storage
export function getStoredBills(): BillReminder[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.BILLS));
    if (!raw) {
      saveStoredBills(DEFAULT_BILLS, false);
      return DEFAULT_BILLS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_BILLS;
  }
}

export function saveStoredBills(bills: BillReminder[], notify = true) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.BILLS), JSON.stringify(bills));
    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save bills', e);
  }
}

export function addBillReminder(bill: Omit<BillReminder, 'id' | 'status'>): BillReminder {
  const all = getStoredBills();
  const newBill: BillReminder = {
    ...bill,
    id: 'bill-' + Date.now(),
    status: 'pending',
  };
  all.push(newBill);
  saveStoredBills(all);
  return newBill;
}

export function updateBillReminder(id: string, updates: Partial<BillReminder>): BillReminder | null {
  const all = getStoredBills();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveStoredBills(all);
  return all[idx];
}

export function deleteBillReminder(id: string): boolean {
  const all = getStoredBills();
  const filtered = all.filter((b) => b.id !== id);
  if (filtered.length !== all.length) {
    saveStoredBills(filtered);
    return true;
  }
  return false;
}

export const addBill = addBillReminder;
export const updateBillStatus = (id: string, status: 'pending' | 'paid' | 'overdue') => updateBillReminder(id, { status });
export const deleteBill = deleteBillReminder;

// 5. Savings Goals
export function getStoredGoals(): SavingsGoal[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.GOALS));
    if (!raw) {
      saveStoredGoals(DEFAULT_GOALS, false);
      return DEFAULT_GOALS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_GOALS;
  }
}

export function saveStoredGoals(goals: SavingsGoal[], notify = true) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.GOALS), JSON.stringify(goals));
    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save goals', e);
  }
}

export function addGoal(goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'isCompleted'>): SavingsGoal {
  const all = getStoredGoals();
  const newGoal: SavingsGoal = {
    ...goal,
    id: 'goal-' + Date.now(),
    currentAmount: 0,
    isCompleted: false,
  };
  all.push(newGoal);
  saveStoredGoals(all);
  return newGoal;
}

export function updateGoalAmount(id: string, addAmount: number): SavingsGoal | null {
  const all = getStoredGoals();
  const goal = all.find((g) => g.id === id);
  if (!goal) return null;
  goal.currentAmount = Math.max(0, goal.currentAmount + addAmount);
  goal.isCompleted = goal.currentAmount >= goal.targetAmount;
  saveStoredGoals(all);
  return goal;
}

// 6. User Settings
export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.SETTINGS));
    if (!raw) {
      saveStoredSettings(DEFAULT_SETTINGS, false);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings, notify = true) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.SETTINGS), JSON.stringify(settings));
    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

// 7. Cached AI Advice
export function getStoredAIAdvice(): FinancialHealthAnalysis | null {
  try {
    const raw = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.AI_ADVICE));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveStoredAIAdvice(advice: FinancialHealthAnalysis) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.AI_ADVICE), JSON.stringify(advice));
    notifyListeners();
  } catch (e) {
    console.error('Failed to save AI advice', e);
  }
}

// 8. Formatters
export function formatCurrency(amount: number, settings?: UserSettings): string {
  const set = settings || getStoredSettings();
  const formattedNumber = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  if (set.currencyPlacement === 'prefix') {
    return `${sign}${set.currencySymbol}${formattedNumber}`;
  }
  return `${sign}${formattedNumber} ${set.currencySymbol}`;
}

export function formatDate(dateString: string): string {
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    if (!y || !m || !d) return dateString;
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

export function seedInitialData(force = false) {
  if (force) {
    resetAllToDefaults();
    return;
  }
  getStoredCategories();
  getStoredAccounts();
  getStoredTransactions();
  getStoredBills();
  getStoredGoals();
  getStoredSettings();
  recalculateAccountBalances();
}

export function resetAllToDefaults() {
  localStorage.clear();
  getStoredCategories();
  getStoredAccounts();
  getStoredTransactions();
  getStoredBills();
  getStoredGoals();
  getStoredSettings();
  recalculateAccountBalances();
  notifyListeners();
}

export function resetAllData() {
  clearAllTransactionsAndData();
}

export function clearAllTransactionsAndData() {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG), 'true');
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.TRANSACTIONS), JSON.stringify([]));
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.BILLS), JSON.stringify([]));
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.GOALS), JSON.stringify([]));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.AI_ADVICE));
    const accounts = getStoredAccounts().map((a) => ({
      ...a,
      initialBalance: 0,
      currentBalance: 0,
    }));
    saveStoredAccounts(accounts, true);
    notifyListeners();
  } catch (e) {
    console.error('Error clearing data', e);
  }
}

export function clearOnlyTransactions(resetAccountBalances = true) {
  try {
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG), 'true');
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.TRANSACTIONS), JSON.stringify([]));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.AI_ADVICE));
    if (resetAccountBalances) {
      const accounts = getStoredAccounts().map((a) => ({
        ...a,
        initialBalance: 0,
        currentBalance: 0,
      }));
      saveStoredAccounts(accounts, false);
    }
    recalculateAccountBalances();
    notifyListeners();
  } catch (e) {
    console.error('Error clearing only transactions', e);
  }
}

export interface DeduplicationSummary {
  totalInFile: number;
  newCount: number;
  duplicateCount: number;
  newTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
  duplicateTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
}

export function analyzeTransactionDuplicates(
  candidates: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
): DeduplicationSummary {
  const existing = getStoredTransactions();
  const existingSignatures = new Set<string>();

  existing.forEach((t) => {
    // Exact signature: date + type + normalized amount + normalized description
    const cleanAmount = Number(t.amount).toFixed(2);
    const cleanDesc = (t.description || '').trim().toLowerCase();
    const sig = `${t.date}|${t.type}|${cleanAmount}|${cleanDesc}`;
    existingSignatures.add(sig);
  });

  const newTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = [];
  const duplicateTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = [];

  candidates.forEach((c) => {
    const cleanAmount = Number(c.amount).toFixed(2);
    const cleanDesc = (c.description || '').trim().toLowerCase();
    const sig = `${c.date}|${c.type}|${cleanAmount}|${cleanDesc}`;

    if (existingSignatures.has(sig)) {
      duplicateTransactions.push(c);
    } else {
      newTransactions.push(c);
      // Add to set to avoid duplicates within the incoming file itself
      existingSignatures.add(sig);
    }
  });

  return {
    totalInFile: candidates.length,
    newCount: newTransactions.length,
    duplicateCount: duplicateTransactions.length,
    newTransactions,
    duplicateTransactions,
  };
}

export function applySmartImport(
  candidates: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>,
  mode: 'skip-duplicates' | 'replace-all' | 'add-all'
): { added: number; skipped: number; total: number } {
  localStorage.setItem(getUserStorageKey(STORAGE_KEYS.INITIALIZED_FLAG), 'true');

  if (mode === 'replace-all') {
    // Clear all existing transactions and replace with new ones
    const created: Transaction[] = candidates.map((t, idx) => ({
      ...t,
      id: 'tx-' + (Date.now() + idx) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    saveStoredTransactions(created);
    return { added: created.length, skipped: 0, total: created.length };
  }

  if (mode === 'skip-duplicates') {
    const analysis = analyzeTransactionDuplicates(candidates);
    if (analysis.newTransactions.length > 0) {
      addMultipleTransactions(analysis.newTransactions);
    }
    const currentTotal = getStoredTransactions().length;
    return {
      added: analysis.newCount,
      skipped: analysis.duplicateCount,
      total: currentTotal,
    };
  }

  // add-all
  addMultipleTransactions(candidates);
  return {
    added: candidates.length,
    skipped: 0,
    total: getStoredTransactions().length,
  };
}

// 9. Sync with Cloud Firestore
export function applyCloudDataLocally(cloudData: CloudUserData) {
  if (!cloudData) return;
  try {
    if (cloudData.transactions !== undefined && Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.TRANSACTIONS), JSON.stringify(cloudData.transactions));
    }
    if (cloudData.accounts !== undefined && Array.isArray(cloudData.accounts) && cloudData.accounts.length > 0) {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.ACCOUNTS), JSON.stringify(cloudData.accounts));
    }
    if (cloudData.categories !== undefined && Array.isArray(cloudData.categories) && cloudData.categories.length > 0) {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.CATEGORIES), JSON.stringify(cloudData.categories));
    }
    if (cloudData.bills !== undefined && Array.isArray(cloudData.bills)) {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.BILLS), JSON.stringify(cloudData.bills));
    }
    if (cloudData.goals !== undefined && Array.isArray(cloudData.goals)) {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.GOALS), JSON.stringify(cloudData.goals));
    }
    if (cloudData.settings !== undefined && typeof cloudData.settings === 'object') {
      localStorage.setItem(getUserStorageKey(STORAGE_KEYS.SETTINGS), JSON.stringify(cloudData.settings));
    }
    recalculateAccountBalances();
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
  } catch (e) {
    console.error('Error applying cloud data locally', e);
  }
}
