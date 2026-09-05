import { BillReminder, Transaction } from '../types';

export interface ExtractedLoanData {
  principalAmount: number;
  interestAmount: number;
  totalToPay: number;
  remainingPrincipal: number;
  interestRate?: number;
  interestType?: 'percentage' | 'fixed';
  lenderOrBorrower?: string;
  originalNotes: string;
}

/**
 * Parses Colombian / LatAm formatted currency numbers like "$500.000,00" or "$40.000" or "500000"
 */
export function parseColombianCurrency(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[^0-9,\.]/g, '').trim();
  if (!clean) return 0;

  // Format with both dots and commas: 500.000,00
  if (clean.includes('.') && clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Format with just dots as thousands separators: 500.000 or 40.000
  if (clean.includes('.') && !clean.includes(',')) {
    const parts = clean.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
    return parseFloat(clean) || 0;
  }
  // Format with comma as decimal: 500,00
  if (clean.includes(',') && !clean.includes('.')) {
    const parts = clean.split(',');
    if (parts.length === 2 && (parts[1].length === 2 || parts[1].length === 1)) {
      return parseFloat(parts[0] + '.' + parts[1]) || 0;
    }
    return parseFloat(clean.replace(/,/g, '')) || 0;
  }
  return parseFloat(clean) || 0;
}

/**
 * Robustly extracts financial loan parameters from a BillReminder or linked Transaction
 */
export function extractLoanFinancials(bill: BillReminder, transactions: Transaction[] = []): ExtractedLoanData {
  let principal = bill.principalAmount ?? 0;
  let interest = bill.interestAmount ?? 0;
  let remainingPrincipal = bill.remainingPrincipal ?? 0;
  let total = bill.amount || 0;
  let interestRate = bill.loanInterestRate;
  let interestType = bill.loanInterestType;
  let lender = '';

  // 1. Try to find linked income transaction
  if (bill.loanTransactionId) {
    const tx = transactions.find((t) => t.id === bill.loanTransactionId);
    if (tx?.loanDetails) {
      if (!principal) principal = tx.loanDetails.principalAmount;
      if (!interest) interest = tx.loanDetails.installmentInterestAmount || tx.loanDetails.interestAmount;
      if (!interestRate) interestRate = tx.loanDetails.interestRate;
      if (!interestType) interestType = tx.loanDetails.interestType;
      if (!lender) lender = tx.loanDetails.lenderOrBorrower || '';
    }
  }

  // 2. If principal or interest still missing, parse from bill.notes
  // Notes format: "Alerta automática 1 día antes. Prestado: $500.000,00 • Interés cuota: $40.000,00 • Total a pagar: $540.000,00"
  if (bill.notes) {
    const prestadoMatch = bill.notes.match(/Prestado:\s*([^•\n\r]+)/i);
    if (prestadoMatch && (!principal || principal === 0)) {
      principal = parseColombianCurrency(prestadoMatch[1]);
    }

    const interesMatch = bill.notes.match(/Inter[eé]s(?:\s*cuota)?:\s*([^•\n\r]+)/i);
    if (interesMatch && (!interest || interest === 0)) {
      interest = parseColombianCurrency(interesMatch[1]);
    }

    const totalMatch = bill.notes.match(/Total(?:\s*a pagar)?:\s*([^•\n\r]+)/i);
    if (totalMatch && (!total || total === 0)) {
      total = parseColombianCurrency(totalMatch[1]);
    }

    const remainingMatch = bill.notes.match(/Capital pendiente:\s*([^•\n\r]+)/i);
    if (remainingMatch && (!remainingPrincipal || remainingPrincipal === 0)) {
      remainingPrincipal = parseColombianCurrency(remainingMatch[1]);
    }
  }

  // If remainingPrincipal hasn't been set yet, it starts equal to principal
  if (remainingPrincipal === 0 && principal > 0) {
    remainingPrincipal = principal;
  }

  // If principal is still 0, infer from bill.amount and interest
  if (principal === 0 && total > 0) {
    if (interest > 0 && total > interest) {
      principal = total - interest;
      remainingPrincipal = principal;
    } else {
      principal = total;
      remainingPrincipal = total;
    }
  }

  // If total is 0, sum principal + interest
  if (total === 0) {
    total = remainingPrincipal + interest;
  }

  return {
    principalAmount: principal,
    interestAmount: interest,
    totalToPay: remainingPrincipal + interest,
    remainingPrincipal: remainingPrincipal,
    interestRate,
    interestType,
    lenderOrBorrower: lender,
    originalNotes: bill.notes || '',
  };
}

/**
 * Calculates the next due date by adding 1 month (or customized frequency) to a date string YYYY-MM-DD
 */
export function calculateNextDueDate(currentDateStr: string, monthsToAdd: number = 1): string {
  try {
    const parts = currentDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month + monthsToAdd, day);
      return d.toISOString().split('T')[0];
    }
  } catch (e) {
    // fallback
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}
