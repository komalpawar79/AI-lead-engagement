import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Send,
  MessageSquare,
  ThumbsUp,
  Flame,
  ThumbsDown,
  Clock,
  ArrowRight,
  Download,
  Sparkles,
  Bot,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getDashboardSummary, getDashboardActivity, exportFollowUpsUrl } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const Dashboard: React.FC = () => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 15000,
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboardActivity'],
    queryFn: getDashboardActivity,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading AI LeadEngage metrics...</span>
        </div>
      </div>
    );
  }

  const metrics = summary?.metrics || {
    totalLeads: 0,
    messagesSent: 0,
    responses: 0,
    interestedLeads: 0,
    followUpLeads: 0,
    notInterested: 0,
    noResponse: 0,
    conversionRate: '0.0',
    responseRate: '0.0',
  };
  const intentDistribution = Array.isArray(summary?.intentDistribution) ? summary.intentDistribution : [];
  const followUpPreview = Array.isArray(summary?.followUpPreview) ? summary.followUpPreview : [];
  const insights = Array.isArray(summary?.insights) ? summary.insights : [];

  // Data for Funnel Bar Chart
  const funnelData = [
    { stage: 'Total Leads', count: metrics.totalLeads, fill: '#0f172a' },
    { stage: 'Messages Sent', count: metrics.messagesSent, fill: '#3b82f6' },
    { stage: 'Responses', count: metrics.responses, fill: '#8b5cf6' },
    { stage: 'Interested', count: metrics.interestedLeads, fill: '#10b981' },
    { stage: 'Follow-ups', count: metrics.followUpLeads, fill: '#f97316' },
  ];

  // Colors for Intent Pie Chart
  const PIE_COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#64748b'];

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Operational Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
              Live AI Funnel
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Transform raw Excel leads into actionable human follow-ups.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/upload-leads"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            + Upload Excel Leads
          </Link>
          <a
            href={exportFollowUpsUrl}
            download="follow_up_leads.xlsx"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Follow-Ups</span>
          </a>
        </div>
      </div>

      {/* KPI METRIC CARDS (7 Primary Metrics with HERO FOLLOW-UP LEADS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {/* 1. Total Leads */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.totalLeads}</div>
          <div className="text-[10px] text-slate-500 mt-1">100% Ingested</div>
        </div>

        {/* 2. Messages Sent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sent</span>
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.messagesSent}</div>
          <div className="text-[10px] text-blue-600 mt-1">AI Proactive Pings</div>
        </div>

        {/* 3. Responses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Responses</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.responses}</div>
          <div className="text-[10px] text-purple-600 mt-1">{metrics.responseRate}% reply rate</div>
        </div>

        {/* 4. Interested Leads */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Interested</span>
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{metrics.interestedLeads}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Confirmed Interest</div>
        </div>

        {/* 5. HERO METRIC: Follow-Up Leads */}
        <Link
          to="/follow-up-leads"
          className="col-span-2 md:col-span-1 bg-gradient-to-br from-orange-500 to-amber-600 text-white p-4 rounded-xl shadow-md ring-2 ring-orange-400/50 hover:shadow-lg transition-all transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">
              Follow-Up Leads
            </span>
            <Flame className="w-4 h-4 text-white animate-bounce" />
          </div>
          <div className="text-3xl font-black tracking-tight">{metrics.followUpLeads}</div>
          <div className="flex items-center justify-between text-[11px] text-orange-100 font-medium mt-1">
            <span>Presales Ready</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 6. Not Interested */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Not Int.</span>
            <ThumbsDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700">{metrics.notInterested}</div>
          <div className="text-[10px] text-rose-500 mt-1">Saved Cold Calls</div>
        </div>

        {/* 7. No Response */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">No Reply</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700">{metrics.noResponse}</div>
          <div className="text-[10px] text-slate-500 mt-1">Outreach Pending</div>
        </div>
      </div>

      {/* CHARTS ROW: Lead Engagement Funnel & Intent Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lead Engagement Overview</h2>
              <p className="text-xs text-slate-500">
                Conversion drop-off from raw Excel leads to qualified follow-ups
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {metrics.conversionRate}% Follow-up Extraction Rate
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#0f172a', fontWeight: 700, marginBottom: '2px' }}
                  itemStyle={{ color: '#ea580c', fontWeight: 600 }}
                  formatter={(value: any) => [`${value} Leads`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intent Distribution Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">AI Conversation Analysis</h2>
            <p className="text-xs text-slate-500">Detected customer intent categories</p>
          </div>

          {intentDistribution && intentDistribution.length > 0 ? (
            <>
              <div className="h-48 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={intentDistribution}
                      dataKey="count"
                      nameKey="intent"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {intentDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                      itemStyle={{ color: '#ea580c', fontWeight: 600 }}
                      formatter={(value: any, name: any) => [`${value} Leads`, `${name}`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {intentDistribution.slice(0, 3).map((item, index) => (
                  <div key={item.intent} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-600 font-medium">{item.intent}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="my-auto py-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 p-4">
              <Sparkles className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Awaiting Intent Signals</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                Customer intents (Pricing, Callback, Site Visit) will visualize here as leads converse.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI INSIGHTS ROW */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-orange-500/20 rounded-lg border border-orange-500/40">
              <Sparkles className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Real Estate Insights</h2>
              <p className="text-xs text-slate-400">Intelligent conversation synthesis across all leads</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
            Real-Time Analysis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{insight.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TWO COLUMN ROW: FOLLOW-UP LEADS PREVIEW & SYSTEM ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-up Leads Preview Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Follow-Up Leads Preview</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
                  {metrics.followUpLeads} Actionable
                </span>
              </div>
              <p className="text-xs text-slate-500">Qualified leads waiting for sales team callback</p>
            </div>

            <Link
              to="/follow-up-leads"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
            >
              <span>View Full List</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Lead</th>
                  <th className="pb-3">Project</th>
                  <th className="pb-3">Config & Budget</th>
                  <th className="pb-3">Follow-up Reason</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUpPreview && followUpPreview.length > 0 ? (
                  followUpPreview.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-slate-900">{lead.leadName}</div>
                        <div className="text-[11px] text-slate-500">{lead.phone}</div>
                      </td>
                      <td className="py-3 font-medium text-slate-800">{lead.projectName}</td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-800">{lead.requirement}</span>
                        {lead.budget && (
                          <div className="text-[11px] text-emerald-700 font-medium">
                            ₹{(lead.budget / 100000).toFixed(1)} L
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-slate-700 font-medium block max-w-xs truncate">
                          {lead.reason}
                        </span>
                        {lead.callbackRequested && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                            📞 Callback Req.
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/leads/${lead.leadId}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg text-xs transition-colors"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <p className="text-xs font-semibold text-slate-700">No Actionable Follow-ups Yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        High-intent leads requesting a callback or site visit will appear here automatically.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI System Activity Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Bot className="w-4 h-4 text-orange-500" />
              <h2 className="text-base font-bold text-slate-900">AI System Activity</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Real-time conversational events</p>

            <div className="space-y-3.5">
              {(activity || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No conversational events yet. Real-time messages will appear here.
                </div>
              ) : (
                (activity || []).slice(0, 5).map((act) => (
                  <div key={act.id} className="text-xs flex items-start space-x-2.5">
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        act.senderType === 'AI' ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 truncate">
                          {act.leadName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate mt-0.5">{act.messageText}</p>
                      <span className="text-[10px] text-slate-400 font-medium">{act.projectName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              to="/test-conversations"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Open Test Chat Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
