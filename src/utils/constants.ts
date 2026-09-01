import { Account, BillReminder, Category, SavingsGoal, Transaction, UserSettings } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Gastos
  { id: 'cat-food', name: 'Alimentación & Súper', type: 'expense', icon: 'ShoppingCart', color: '#10B981', isDefault: true },
  { id: 'cat-housing', name: 'Vivienda & Alquiler', type: 'expense', icon: 'Home', color: '#3B82F6', isDefault: true },
  { id: 'cat-utilities', name: 'Servicios (Luz, Agua, Net)', type: 'expense', icon: 'Zap', color: '#F59E0B', isDefault: true },
  { id: 'cat-transport', name: 'Transporte & Gasolina', type: 'expense', icon: 'Car', color: '#6366F1', isDefault: true },
  { id: 'cat-dining', name: 'Restaurantes & Cafeterías', type: 'expense', icon: 'UtensilsCrossed', color: '#EC4899', isDefault: true },
  { id: 'cat-health', name: 'Salud & Farmacia', type: 'expense', icon: 'HeartPulse', color: '#EF4444', isDefault: true },
  { id: 'cat-entertainment', name: 'Ocio & Entretenimiento', type: 'expense', icon: 'Film', color: '#8B5CF6', isDefault: true },
  { id: 'cat-shopping', name: 'Compras & Ropa', type: 'expense', icon: 'ShoppingBag', color: '#14B8A6', isDefault: true },
  { id: 'cat-subscriptions', name: 'Suscripciones & Apps', type: 'expense', icon: 'CreditCard', color: '#F97316', isDefault: true },
  { id: 'cat-education', name: 'Educación & Cursos', type: 'expense', icon: 'GraduationCap', color: '#06B6D4', isDefault: true },
  { id: 'cat-other-exp', name: 'Otros Gastos', type: 'expense', icon: 'MoreHorizontal', color: '#64748B', isDefault: true },

  // Ingresos
  { id: 'cat-salary', name: 'Salario / Nómina', type: 'income', icon: 'Briefcase', color: '#10B981', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance & Proyectos', type: 'income', icon: 'Laptop', color: '#3B82F6', isDefault: true },
  { id: 'cat-investments', name: 'Rendimientos / Inversión', type: 'income', icon: 'TrendingUp', color: '#8B5CF6', isDefault: true },
  { id: 'cat-gifts', name: 'Premios & Regalos', type: 'income', icon: 'Gift', color: '#EC4899', isDefault: true },
  { id: 'cat-other-inc', name: 'Otros Ingresos', type: 'income', icon: 'PlusCircle', color: '#14B8A6', isDefault: true },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-main', name: 'Cuenta Bancaria Principal', type: 'bank', initialBalance: 0, currentBalance: 0, currency: 'COP', color: '#2563EB', icon: 'Building2', accountNumberMask: '•••• 1234' },
  { id: 'acc-cash', name: 'Efectivo en Mano', type: 'cash', initialBalance: 0, currentBalance: 0, currency: 'COP', color: '#059669', icon: 'Banknote' },
];

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'COP',
  currencySymbol: '$',
  currencyPlacement: 'prefix',
  theme: 'dark',
  budgetAlertThreshold: 80,
  enableBudgetAlerts: true,
  enableUpcomingBillAlerts: true,
  autoCategorizeWithAI: true,
  soundEffects: true,
};

// Start with clean empty transactions for real users
export function generateStarterTransactions(): Transaction[] {
  return [];
}

export const DEFAULT_BILLS: BillReminder[] = [];

export const DEFAULT_GOALS: SavingsGoal[] = [];
