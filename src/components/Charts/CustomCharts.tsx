import React, { useState } from 'react';
import { Category, Transaction, UserSettings } from '../../types';
import { formatCurrency } from '../../utils/storage';

interface CategoryExpense {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

// 1. Interactive Donut Chart for Categories
export const CategoryDonutChart: React.FC<{
  transactions: Transaction[];
  categories: Category[];
  settings: UserSettings;
}> = ({ transactions, categories, settings }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const expenseTxs = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const catMap: { [id: string]: { name: string; color: string; amount: number; count: number } } = {};
  expenseTxs.forEach((t) => {
    const cat = categoryMap.get(t.categoryId);
    const catId = t.categoryId || 'other';
    const name = cat ? cat.name : 'Otros';
    const color = cat ? cat.color : '#64748B';

    if (!catMap[catId]) {
      catMap[catId] = { name, color, amount: 0, count: 0 };
    }
    catMap[catId].amount += t.amount;
    catMap[catId].count += 1;
  });

  const data: CategoryExpense[] = Object.entries(catMap)
    .map(([id, val]) => ({
      categoryId: id,
      name: val.name,
      color: val.color,
      amount: val.amount,
      percentage: totalExpense > 0 ? (val.amount / totalExpense) * 100 : 0,
      count: val.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (totalExpense === 0 || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-sm">No hay gastos registrados en este periodo</p>
      </div>
    );
  }

  // SVG Donut calculation
  const radius = 80;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const activeItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
      {/* SVG Donut */}
      <div className="relative w-56 h-56 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-800"
          />
          {data.map((item, idx) => {
            const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
            const rotation = accumulatedAngle;
            accumulatedAngle += (item.percentage / 100) * 360;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={item.categoryId}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(${rotation} 100 100)`}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {activeItem ? activeItem.name : 'Gasto Total'}
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(activeItem ? activeItem.amount : totalExpense, settings)}
          </span>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {activeItem ? `${activeItem.percentage.toFixed(1)}%` : `${data.length} categorías`}
          </span>
        </div>
      </div>

      {/* Legend & Breakdown list */}
      <div className="w-full space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {data.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.categoryId}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  ({item.count} movs)
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(item.amount, settings)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {item.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 2. Bar Chart: Income vs Expense Trend (Last 6 Months)
export const IncomeExpenseBarChart: React.FC<{
  transactions: Transaction[];
  settings: UserSettings;
}> = ({ transactions, settings }) => {
  // Generate last 6 months buckets
  const now = new Date();
  const monthsData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('es-ES', { month: 'short' });

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.date.startsWith(monthKey)) {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
      }
    });

    monthsData.push({
      key: monthKey,
      label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      income,
      expense,
      savings: income - expense,
    });
  }

  const maxVal = Math.max(...monthsData.map((m) => Math.max(m.income, m.expense)), 100);

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center justify-end gap-5 mb-4 text-xs font-medium text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span>Ingresos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500" />
          <span>Gastos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-500" />
          <span>Ahorro Neto</span>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-6 gap-2 sm:gap-4 h-48 items-end pt-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        {monthsData.map((item) => {
          const incHeight = (item.income / maxVal) * 100;
          const expHeight = (item.expense / maxVal) * 100;
          const savingsPositive = item.savings >= 0;

          return (
            <div key={item.key} className="flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-14 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded py-1 px-2 pointer-events-none z-20 shadow-lg whitespace-nowrap">
                <span>Ingresos: {formatCurrency(item.income, settings)}</span>
                <span>Gastos: {formatCurrency(item.expense, settings)}</span>
                <span className={savingsPositive ? 'text-emerald-400' : 'text-rose-400'}>
                  Neto: {formatCurrency(item.savings, settings)}
                </span>
              </div>

              {/* Bars */}
              <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-40">
                {/* Income Bar */}
                <div
                  style={{ height: `${Math.max(incHeight, 4)}%` }}
                  className="w-3 sm:w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all duration-300"
                />
                {/* Expense Bar */}
                <div
                  style={{ height: `${Math.max(expHeight, 4)}%` }}
                  className="w-3 sm:w-4 bg-rose-500 hover:bg-rose-600 rounded-t transition-all duration-300"
                />
              </div>

              {/* Month Label */}
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. Weekly spending distribution (Last 7 days)
export const WeeklySpendingChart: React.FC<{
  transactions: Transaction[];
  settings: UserSettings;
}> = ({ transactions, settings }) => {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });

    let amount = 0;
    transactions.forEach((t) => {
      if (t.type === 'expense' && t.date === dateStr) {
        amount += t.amount;
      }
    });

    days.push({
      dateStr,
      dayName: dayName.toUpperCase(),
      amount,
      isToday: i === 0,
    });
  }

  const maxAmount = Math.max(...days.map((d) => d.amount), 50);

  return (
    <div className="grid grid-cols-7 gap-2 h-36 items-end pt-3 pb-1">
      {days.map((d) => {
        const height = (d.amount / maxAmount) * 100;
        return (
          <div key={d.dateStr} className="flex flex-col items-center h-full justify-end group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 hidden group-hover:flex bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none z-10 whitespace-nowrap">
              {formatCurrency(d.amount, settings)}
            </div>

            <div
              style={{ height: `${Math.max(height, 6)}%` }}
              className={`w-full max-w-[28px] rounded-t transition-all duration-300 ${
                d.isToday
                  ? 'bg-indigo-500 group-hover:bg-indigo-600'
                  : d.amount > 0
                  ? 'bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            />
            <span className={`text-[10px] font-semibold mt-2 ${d.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              {d.dayName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
