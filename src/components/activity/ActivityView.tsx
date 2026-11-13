import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseItem } from './ExpenseItem';
import { RepaymentItem } from './RepaymentItem';
import { getDateGroupHeader } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import { TRANSPORT_LIST } from '../../utils/transport';
import type { Expense, Settlement } from '../../types';
import {
  Search,
  Plus,
  Calendar,
  X,
  SlidersHorizontal,
  ShieldCheck,
  Receipt,
  Users,
  Download,
} from 'lucide-react';

type ActivityEntry =
  | { type: 'expense'; id: string; date: string; data: Expense }
  | { type: 'settlement'; id: string; date: string; data: Settlement };

export const ActivityView: React.FC = () => {
  const { expenses, settlements, members, currentBlend, openAddExpense, openBlendModal } = useApp();

  const hasBlendFriends = (currentBlend?.memberCount ?? members.length) >= 2 || members.length >= 2;

  const [searchQuery, setSearchQuery] = useState('');
  const [activityType, setActivityType] = useState<'all' | 'rides' | 'repayments'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Build and filter unified activity entries
  const filteredEntries = useMemo(() => {
    const list: ActivityEntry[] = [];

    // Add expenses if requested
    if (activityType === 'all' || activityType === 'rides') {
      for (const exp of expenses) {
        // Category filter
        if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
          continue;
        }
        // Member filter (payer or participant)
        if (selectedMember !== 'all' && exp.payerId !== selectedMember && !exp.participantIds.includes(selectedMember)) {
          continue;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesDesc = exp.description.toLowerCase().includes(q);
          const matchesNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;
          if (!matchesDesc && !matchesNotes) continue;
        }

        list.push({ type: 'expense', id: exp.id, date: exp.date, data: exp });
      }
    }

    // Add repayments if requested
    if (activityType === 'all' || activityType === 'repayments') {
      for (const set of settlements) {
        // Category filter applies to rides only, so skip repayments if a specific category is selected
        if (selectedCategory !== 'all') {
          continue;
        }
        // Member filter (from or to)
        if (selectedMember !== 'all' && set.fromMemberId !== selectedMember && set.toMemberId !== selectedMember) {
          continue;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const fromMember = members.find(m => m.id === set.fromMemberId);
          const toMember = members.find(m => m.id === set.toMemberId);
          const matchesNames =
            (fromMember && fromMember.name.toLowerCase().includes(q)) ||
            (toMember && toMember.name.toLowerCase().includes(q));
          const matchesNotes = set.notes ? set.notes.toLowerCase().includes(q) : false;
          const matchesKeyword = 'repayment'.includes(q) || 'settle'.includes(q);
          if (!matchesNames && !matchesNotes && !matchesKeyword) continue;
        }

        list.push({ type: 'settlement', id: set.id, date: set.date, data: set });
      }
    }

    // Sort chronologically (newest first)
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [expenses, settlements, activityType, selectedCategory, selectedMember, searchQuery, members]);

  // Group filtered entries chronologically by date heading
  const groupedEntries = useMemo(() => {
    const groupsMap = new Map<string, ActivityEntry[]>();
    for (const item of filteredEntries) {
      const header = getDateGroupHeader(item.date);
      if (!groupsMap.has(header)) {
        groupsMap.set(header, []);
      }
      groupsMap.get(header)!.push(item);
    }
    const result: { heading: string; items: ActivityEntry[] }[] = [];
    groupsMap.forEach((items, heading) => {
      result.push({ heading, items });
    });
    return result;
  }, [filteredEntries]);

  const totalPaise = useMemo(() => {
    return filteredEntries.reduce((sum, item) => sum + item.data.amountPaise, 0);
  }, [filteredEntries]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    activityType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedMember !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setActivityType('all');
    setSelectedCategory('all');
    setSelectedMember('all');
  };

  /**
   * Sanitizes a cell value to prevent CSV Formula Injection (DDE code execution)
   * and enforces RFC-4180 quotation & escaping rules.
   */
  const sanitizeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    // Formula Injection Mitigation: prefix with single quote if first character is dangerous
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    // RFC-4180: escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const exportToCsv = () => {
    if (filteredEntries.length === 0) return;
    const header = [
      'Date',
      'Type',
      'Description',
      'Category',
      'Paid By / From',
      'Participants / To',
      'Amount (INR)',
      'Notes',
    ];

    const rows: string[][] = [header.map(h => sanitizeCsvCell(h))];

    for (const item of filteredEntries) {
      if (item.type === 'expense') {
        const exp = item.data;
        const payer = members.find((m) => m.id === exp.payerId)?.name || 'Unknown';
        const parts = exp.participantIds
          .map((pid) => members.find((m) => m.id === pid)?.name || pid)
          .join('; ');
        rows.push([
          sanitizeCsvCell(new Date(exp.date).toLocaleDateString()),
          sanitizeCsvCell('Ride Expense'),
          sanitizeCsvCell(exp.description),
          sanitizeCsvCell(exp.category),
          sanitizeCsvCell(payer),
          sanitizeCsvCell(parts),
          sanitizeCsvCell((exp.amountPaise / 100).toFixed(2)),
          sanitizeCsvCell(exp.notes || ''),
        ]);
      } else {
        const set = item.data;
        const fromM = members.find((m) => m.id === set.fromMemberId)?.name || 'Unknown';
        const toM = members.find((m) => m.id === set.toMemberId)?.name || 'Unknown';
        rows.push([
          sanitizeCsvCell(new Date(set.date).toLocaleDateString()),
          sanitizeCsvCell('UPI Repayment'),
          sanitizeCsvCell(`Repayment from ${fromM} to ${toM}`),
          sanitizeCsvCell('settlement'),
          sanitizeCsvCell(fromM),
          sanitizeCsvCell(toM),
          sanitizeCsvCell((set.amountPaise / 100).toFixed(2)),
          sanitizeCsvCell(set.notes || ''),
        ]);
      }
    }

    // Prepend UTF-8 BOM (\uFEFF) so Excel and third-party tools parse UTF-8 characters (like ₹) correctly
    const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expenso_${currentBlend?.name ? currentBlend.name.replace(/\s+/g, '_') : 'Commute'}_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-charcoal-900 tracking-tight">
            Commute Activity
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Full chronological log of shared rides and repayments
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          {filteredEntries.length > 0 && (
            <button
              onClick={exportToCsv}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-warm-100 text-charcoal-700 font-bold text-xs sm:text-sm rounded-xl border border-warm-300 shadow-subtle transition-all cursor-pointer"
              title="Export filtered activity to CSV"
            >
              <Download className="w-4 h-4 text-charcoal-500" />
              <span>Export CSV</span>
            </button>
          )}

          {hasBlendFriends ? (
            <button
              onClick={openAddExpense}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-card transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Expense</span>
            </button>
          ) : (
            <button
              onClick={openBlendModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-card transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Create / Join Blend</span>
              <span className="sm:hidden">Join Blend</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-warm-200 rounded-3xl p-5 sm:p-6 shadow-subtle space-y-4">
        {/* Activity Type Switcher */}
        <div className="flex bg-warm-100 p-1 rounded-xl border border-warm-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActivityType('all')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              activityType === 'all'
                ? 'bg-white text-charcoal-900 shadow-subtle'
                : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            All Activity ({expenses.length + settlements.length})
          </button>
          <button
            type="button"
            onClick={() => setActivityType('rides')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
              activityType === 'rides'
                ? 'bg-white text-charcoal-900 shadow-subtle'
                : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Rides Only ({expenses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivityType('repayments')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
              activityType === 'repayments'
                ? 'bg-white text-emerald-800 shadow-subtle'
                : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Repayments ({settlements.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity (e.g. Metro, Cab, UPI, Rahul)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-warm-50 text-charcoal-900 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-all placeholder:text-charcoal-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {activityType !== 'repayments' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-charcoal-500 uppercase">Ride:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-lg px-2.5 py-1 text-xs font-medium text-charcoal-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="all">All Modes</option>
                {TRANSPORT_LIST.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.badgeLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Member Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-charcoal-500 uppercase">Member:</span>
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="bg-warm-50 border border-warm-200 rounded-lg px-2.5 py-1 text-xs font-medium text-charcoal-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="all">Everyone</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.isCurrentUser ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Stats Bar */}
      <div className="flex items-center justify-between text-xs text-charcoal-500 px-1">
        <span>
          Showing <strong>{filteredEntries.length}</strong> activity item{filteredEntries.length === 1 ? '' : 's'}
        </span>
        <span>
          Volume: <strong className="text-charcoal-900">{formatCurrency(totalPaise)}</strong>
        </span>
      </div>

      {/* Grouped Chronological Activity List */}
      {groupedEntries.length > 0 ? (
        <div className="space-y-5">
          {groupedEntries.map(group => (
            <div key={group.heading} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                  {group.heading}
                </h3>
                <div className="flex-1 h-px bg-warm-200 ml-2" />
              </div>

              <div className="space-y-2">
                {group.items.map(entry =>
                  entry.type === 'expense' ? (
                    <ExpenseItem key={entry.id} expense={entry.data} />
                  ) : (
                    <RepaymentItem key={entry.id} settlement={entry.data} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-warm-200 rounded-2xl p-8 text-center shadow-subtle space-y-3">
          <div className="w-10 h-10 rounded-full bg-warm-100 text-charcoal-500 flex items-center justify-center mx-auto">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">No matching activity found</h3>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search query or filters to find what you are looking for.'
                : 'No commute expenses or repayments have been recorded yet.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-brand-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
