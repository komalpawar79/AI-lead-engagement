import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Upload,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { getLeads, getProjects } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Lead } from '../types';

export const Leads: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [interestFilter, setInterestFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data: rawProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', searchTerm, statusFilter, projectFilter, interestFilter, page],
    queryFn: () =>
      getLeads({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        projectId: projectFilter !== 'ALL' ? projectFilter : undefined,
        interestLevel: interestFilter !== 'ALL' ? interestFilter : undefined,
        page,
        limit: 15,
      }),
  });

  const leads = Array.isArray(data?.leads) ? data.leads : [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lead Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            All imported leads undergoing AI qualification and conversational triage.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/upload-leads"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import Leads (Excel)</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, mobile, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="FOLLOW_UP">Follow-up Required</option>
            <option value="INTERESTED">Interested</option>
            <option value="RESPONDED">Responded</option>
            <option value="CONTACTED">Contacted</option>
            <option value="IMPORTED">Imported</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="NO_RESPONSE">No Response</option>
          </select>

          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Interest Level filter */}
          <select
            value={interestFilter}
            onChange={(e) => {
              setInterestFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="ALL">All Interest Levels</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="NOT_INTERESTED">Not Interested</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading leads...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">Error loading leads directory.</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No leads found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Lead Name & Phone</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">AI Status</th>
                  <th className="py-3.5 px-4">Interest Level</th>
                  <th className="py-3.5 px-4">Latest Reply / Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead: Lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{lead.name}</div>
                      <div className="flex items-center space-x-1 text-slate-500 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.email && <div className="text-[11px] text-slate-400">{lead.email}</div>}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div>{lead.projectName}</div>
                      {lead.configuration && (
                        <span className="text-[11px] text-slate-500 font-normal">
                          Pref: {lead.configuration}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.status} type="leadStatus" />
                      {lead.followUpReason && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-1">
                          {lead.followUpReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.interestLevel} type="interestLevel" />
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {lead.lastReply ? (
                        <div className="flex items-start space-x-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-700 truncate block">
                            "{lead.lastReply}"
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No response yet</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        to={`/leads/${lead.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
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

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total: <span className="font-bold text-slate-800">{pagination.total}</span> leads
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

