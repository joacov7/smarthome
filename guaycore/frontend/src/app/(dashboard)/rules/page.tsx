'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { BookOpen, RefreshCw, Trash2, X } from 'lucide-react';
import { rulesApi } from '@/lib/api';
import type { Rule } from '@/lib/api';
import { SeverityBadge } from '@/components/ui/badge';

function timeAgo(ts?: string) {
  if (!ts) return 'Never';
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

function ConditionSummary({ condition }: { condition: Rule['condition'] }) {
  const opLabels: Record<string, string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '=',
    neq: '!=',
  };
  const op = opLabels[condition.operator] ?? condition.operator;
  return (
    <code className="text-xs font-mono text-slate-300">
      {condition.field} {op} {String(condition.value)}
    </code>
  );
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await rulesApi.list();
      setRules(data);
    } catch (err) {
      setError('Failed to load rules.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function handleToggle(rule: Rule) {
    setTogglingId(rule.id);
    try {
      const { data } = await rulesApi.toggle(rule.id, !rule.enabled);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? data : r)));
    } catch {
      setError('Failed to update rule.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await rulesApi.delete(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      setConfirmDelete(null);
    } catch {
      setError('Failed to delete rule.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Rules</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {rules.filter((r) => r.enabled).length} active /{' '}
            {rules.length} total
          </p>
        </div>
        <button
          onClick={fetchRules}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              Delete Rule
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete this rule? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deletingId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
              >
                {deletingId ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BookOpen className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500 text-sm">No rules configured</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/50">
            {rules.map((rule) => {
              const isToggling = togglingId === rule.id;
              return (
                <li
                  key={rule.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition-colors"
                >
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(rule)}
                    disabled={isToggling}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 ${
                      rule.enabled ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* Rule info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">
                        {rule.name}
                      </span>
                      <SeverityBadge severity={rule.severity} />
                      {!rule.enabled && (
                        <span className="text-xs text-slate-500 italic">
                          disabled
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      <ConditionSummary condition={rule.condition} />
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-xs text-slate-500">
                        Last triggered: {timeAgo(rule.lastTriggeredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {rule.message}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(rule.id)}
                    disabled={!!togglingId || !!deletingId}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
