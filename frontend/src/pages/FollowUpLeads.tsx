import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Download,
  Filter,
  Phone,
  Flame,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getFollowUps, updateFollowUpStatus, exportFollowUpsUrl } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { FollowUpItem } from '../types';

export const FollowUpLeads: React.FC = () => {
  const queryClient = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: rawFollowUps, isLoading, error } = useQuery({
    queryKey: ['followUps', statusFilter, priorityFilter],
    queryFn: () =>
      getFollowUps({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      }),
  });

  const followUps = Array.isArray(rawFollowUps) ? rawFollowUps : [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateFollowUpStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Follow-Up Leads
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                AI-identified prospects demonstrating genuine interest, callback requests, or site visit intent.
              </p>
            </div>
          </div>
        </div>

        {/* Hero Excel Export Button */}
        <div className="flex items-center space-x-3">
          <a
            href={exportFollowUpsUrl}
            download="follow_up_leads.xlsx"
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Follow-up Leads (Excel)</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Filter icon, label, and dropdowns grouped together */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold pr-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filters:</span>
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium cursor-pointer"
          >
            <option value="ALL">All Follow-up States</option>
            <option value="PENDING">Pending Action</option>
            <option value="EXPORTED">Exported to Sales</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Right Side: Lead Count */}
        <div className="text-xs font-semibold text-slate-600">
          Showing <span className="text-orange-600 font-bold">{followUps.length}</span> Qualified Leads
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading follow-up leads...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">Failed to load follow-up leads.</div>
        ) : followUps.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No follow-up leads found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Lead Name & Phone</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Requirement & Budget</th>
                  <th className="py-3.5 px-4">Interest & Reason</th>
                  <th className="py-3.5 px-4">AI Summary</th>
                  <th className="py-3.5 px-4">Priority & State</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((item: FollowUpItem) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Lead info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{item.leadName}</div>
                      <div className="flex items-center space-x-1.5 text-slate-500 font-medium mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.phone}</span>
                      </div>
                      {item.email && <div className="text-[11px] text-slate-400">{item.email}</div>}
                    </td>

                    {/* Project */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.projectName}
                    </td>

                    {/* Requirement & Budget */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {item.configuration || item.requirement || 'Not specified'}
                      </div>
                      {item.budget ? (
                        <div className="text-emerald-700 font-bold mt-0.5">
                          ₹{(item.budget / 100000).toFixed(1)} Lakhs
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Budget unstated</div>
                      )}
                    </td>

                    {/* Interest & Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="mb-1">
                        <StatusBadge status={item.interestLevel} type="interestLevel" />
                      </div>
                      <div className="text-slate-800 font-medium leading-snug">{item.reason}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.callbackRequested && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                            📞 Callback Req.
                          </span>
                        )}
                        {item.siteVisitRequested && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            🏡 Site Visit Req.
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AI Summary */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                        {item.summary || 'No AI summary available.'}
                      </p>
                    </td>

                    {/* Priority & State */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <StatusBadge status={item.priority} type="priority" />
                        <div>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              updateMutation.mutate({ id: item.id, status: e.target.value })
                            }
                            className="text-[11px] font-semibold border border-slate-200 rounded px-2 py-0.5 bg-slate-50 text-slate-700 cursor-pointer"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="EXPORTED">EXPORTED</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/leads/${item.leadId}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

