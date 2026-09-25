import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building,
  Calendar,
  MessageSquare,
  Bot,
  User,
  CheckCheck,
  Flame,
  PhoneCall,
} from 'lucide-react';
import { getLeadById } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['leadDetail', id],
    queryFn: () => getLeadById(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading lead profile...</div>;
  }

  if (error || !lead) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl text-xs">
        Lead not found or error loading details.
      </div>
    );
  }

  const latestConversation = lead.conversations?.[0];
  const messages = latestConversation?.messages || [];
  const latestAnalysis = lead.analyses?.[0];

  return (
    <div className="space-y-6">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/leads"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </Link>
        <div className="flex items-center space-x-2">
          <StatusBadge status={lead.status} type="leadStatus" />
          <StatusBadge status={lead.interestLevel} type="interestLevel" />
        </div>
      </div>

      {/* 3-Column Split View: Lead Profile (Left), Chronological Chat (Middle), AI Analysis (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lead Profile (3 cols) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{lead.name}</h2>
            <div className="text-xs text-slate-400 mt-0.5">Source: {lead.source}</div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-semibold">{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center space-x-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{lead.email}</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-slate-700">
              <Building className="w-4 h-4 text-slate-400" />
              <span>Project: {lead.project?.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                Added:{' '}
                {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Stated Requirements */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Lead Requirements
            </div>
            <div className="text-xs text-slate-800">
              <span className="font-semibold">Configuration: </span>
              <span>{lead.configuration || 'Not specified'}</span>
            </div>
            <div className="text-xs text-slate-800">
              <span className="font-semibold">Budget: </span>
              {lead.budget ? (
                <span className="text-emerald-700 font-bold">
                  ₹{(lead.budget / 100000).toFixed(1)} Lakhs
                </span>
              ) : (
                <span className="text-slate-400">Not stated</span>
              )}
            </div>
          </div>

          {/* Follow-up Flag */}
          {lead.followUpRequired && (
            <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
              <div className="font-bold flex items-center space-x-1.5 text-orange-800 mb-1">
                <Flame className="w-4 h-4 text-orange-600" />
                <span>Follow-Up Required</span>
              </div>
              <p className="leading-snug">{lead.followUpReason}</p>
            </div>
          )}
        </div>

        {/* Middle Column: Chronological Chat Transcript (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold">Conversation Transcript</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {latestConversation?.channel || 'WHATSAPP'}
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-12">
                No conversation recorded for this lead yet.
              </div>
            ) : (
              messages.map((msg: any) => {
                const isAI = msg.senderType === 'AI';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                        isAI
                          ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                          : 'bg-emerald-600 text-white rounded-tr-none'
                      }`}
                    >
                      <div className="flex items-center justify-between space-x-3 mb-1">
                        <span
                          className={`text-[10px] font-bold ${
                            isAI ? 'text-orange-600' : 'text-emerald-200'
                          }`}
                        >
                          {isAI ? 'AI Assistant' : lead.name}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isAI ? 'text-slate-400' : 'text-emerald-100'
                          }`}
                        >
                          {new Date(msg.sentAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.messageText}</p>
                      <div className="flex justify-end mt-1">
                        <CheckCheck
                          className={`w-3 h-3 ${isAI ? 'text-blue-500' : 'text-emerald-200'}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: AI Analysis Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-900">AI Conversation Analysis</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
              v1.0 Structured
            </span>
          </div>

          {latestAnalysis ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">
                  Classified Intent
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {latestAnalysis.intent}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Interest Level
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={latestAnalysis.interestLevel} type="interestLevel" />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Confidence
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {(latestAnalysis.confidenceScore * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Callback & Site visit badges */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`p-2.5 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 ${
                    latestAnalysis.callbackRequested
                      ? 'bg-orange-50 text-orange-800 border-orange-200 font-bold'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Callback Req.</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 ${
                    latestAnalysis.siteVisitRequested
                      ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Site Visit Req.</span>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Executive Presales Summary
                </div>
                <p className="text-slate-700 leading-relaxed">{latestAnalysis.summary}</p>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                <span>Model: {latestAnalysis.model}</span>
                <span>Version: {latestAnalysis.promptVersion}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No AI analysis records found for this lead.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

