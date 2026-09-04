export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'card' | 'savings' | 'investment' | 'crypto';

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string; // Lucide icon name
  color: string; // Hex color code
  monthlyBudget?: number; // Budget in current currency
  isDefault?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  color: string;
  icon: string;
  isArchived?: boolean;
  accountNumberMask?: string; // e.g. "**** 4821"
}

export interface TransactionItem {
  name: string;
  quantity?: number;
  price: number;
}

export interface LoanDetails {
  principalAmount: number; // Monto prestado recibido
  interestRate: number; // Tasa de interés (%)
  interestType: 'percentage' | 'fixed'; // Porcentaje (%) o valor fijo ($)
  interestAmount: number; // Interés cobrado total
  installmentInterestAmount: number; // Interés por cuota
  installmentAmount: number; // Interés cuota / Valor cuota a pagar
  installmentsCount: number; // Número de cuotas
  totalToPay: number; // Total a pagar (prestado + intereses)
  paymentDueDate: string; // Fecha de pago (YYYY-MM-DD)
  reminderDaysBefore: number; // Días antes para notificar (1 día antes)
  lenderOrBorrower?: string; // Entidad o persona que prestó
  isPaid?: boolean; // Si ya fue pagado
  linkedBillReminderId?: string; // ID del recordatorio automático de pago
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  categoryId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  tags: string[];
  notes?: string;
  receiptImage?: string; // base64 preview or data URI
  items?: TransactionItem[];
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
  source?: 'manual' | 'ocr' | 'voice' | 'sms' | 'invoice' | 'csv';
  isLoanIncome?: boolean;
  loanDetails?: LoanDetails;
}

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId: string;
  accountId: string;
  status: 'pending' | 'paid' | 'overdue';
  isRecurring: boolean;
  frequency?: 'weekly' | 'monthly' | 'yearly';
  recurringInterval?: 'monthly' | 'bimonthly' | 'yearly';
  reminderDaysBefore: number;
  notes?: string;
  paidTransactionId?: string;
  isLoanReminder?: boolean;
  loanTransactionId?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  categoryId?: string;
  icon: string;
  color: string;
  notes?: string;
  isCompleted?: boolean;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  currencyPlacement: 'prefix' | 'suffix';
  theme: 'dark' | 'light' | 'system';
  budgetAlertThreshold: number; // e.g. 80 (warn at 80%)
  enableBudgetAlerts: boolean;
  enableUpcomingBillAlerts: boolean;
  enableNotifications?: boolean;
  enableAIExtraction?: boolean;
  autoCategorizeWithAI: boolean;
  encryptionPasswordHash?: string;
  lastCloudSyncTimestamp?: string;
  soundEffects: boolean;
}

export interface FinancialHealthAnalysis {
  healthScore: number;
  healthStatus?: string;
  summary: string;
  executiveSummary?: string;
  savingsRateEstimate?: number;
  budgetStatusAnalysis?: string;
  potentialMonthlySavings?: number;
  moneyLeaks?: Array<{
    category: string;
    description: string;
    estimatedImpact: number;
  }>;
  budgetLeakages?: string[];
  actionableTips: string[];
  strategicAdvice: string[];
  weeklySavingsPlan?: string;
  savingsTargetRecommendation?: string;
  generatedAt?: string;
}

export interface DateFilterRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface OCRScanResult {
  merchant: string;
  totalAmount: number;
  date: string;
  taxAmount?: number;
  suggestedCategory: string;
  suggestedTags: string[];
  items?: TransactionItem[];
  notes?: string;
  confidenceScore?: number;
}

export interface ParsedVoiceOrSMSResult {
  transactions: Array<{
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    description: string;
    date: string;
    suggestedCategory: string;
    suggestedAccount?: string;
    tags?: string[];
    notes?: string;
  }>;
  detectedSummary?: string;
}

export interface CloudSyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  status: 'synced' | 'pending' | 'offline' | 'error';
  pendingChangesCount: number;
  encryptionEnabled: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  mode?: 'personal' | 'business';
  companyName?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  token: string;
  lastLogin: string;
}
