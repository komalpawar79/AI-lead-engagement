import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  CheckCheck,
  Building,
  Flame,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Calendar,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  createOrGetTestConversation,
  sendMessage,
  resetTestConversation,
  getProjects,
} from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

const renderFormattedMessage = (text: string, isAI: boolean) => {
  if (!text) return null;

  // Regex to match URLs including http(s):// and google.com/maps or maps.google.com or maps.app.goo.gl
  const urlRegex = /(https?:\/\/[^\s]+|(?:(?:https?:\/\/)?(?:www\.)?(?:google\.com\/maps[^\s]*|maps\.google\.com[^\s]*|maps\.app\.goo\.gl[^\s]*)))/gi;
  const parts = text.split(urlRegex);

  return (
    <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
      {parts.map((part, idx) => {
        if (!part) return null;
        if (
          part.match(/^https?:\/\//i) ||
          part.match(/^(?:https?:\/\/)?(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl)/i)
        ) {
          const href = part.startsWith('http://') || part.startsWith('https://') ? part : `https://${part}`;
          const isMap = /google\.com\/maps|maps\.google|maps\.app\.goo\.gl/i.test(part);

          if (isMap) {
            return (
              <span key={idx} className="block my-1.5">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-xs max-w-full ${
                    isAI
                      ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-500'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="font-semibold">Open Google Maps Location</span>
                  <ExternalLink className="w-3 h-3 opacity-70 shrink-0 ml-0.5" />
                </a>
              </span>
            );
          }

          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline font-medium break-all ${
                isAI ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-100 hover:text-white'
              }`}
            >
              {part}
            </a>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </div>
  );
};

export const TestConversations: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  // Automatically select first project once loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Load or initialize test lead conversation
  const { data: testData, isLoading } = useQuery({
    queryKey: ['testConversation', selectedProjectId],
    queryFn: () =>
      createOrGetTestConversation({
        name: 'Rahul Sharma (Test Lead)',
        phone: '9876543210',
        projectId: selectedProjectId || undefined,
      }),
    enabled: Boolean(selectedProjectId),
  });

  const lead = testData?.lead;
  const conversation = testData?.conversation;
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const latestAnalysis = conversation?.analyses?.[0];

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [optimisticCustomerMsg, setOptimisticCustomerMsg] = useState<string | null>(null);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!lead?.id) throw new Error('No active test lead');
      return sendMessage({
        leadId: lead.id,
        messageText: text,
        channel: 'TEST',
      });
    },
    onMutate: (text: string) => {
      // Optimistically display customer message immediately
      setOptimisticCustomerMsg(text);
      setInputMessage('');
    },
    onSuccess: () => {
      setOptimisticCustomerMsg(null);
      queryClient.invalidateQueries({ queryKey: ['testConversation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    },
    onError: () => {
      setOptimisticCustomerMsg(null);
    },
  });

  // Reset conversation mutation
  const resetMutation = useMutation({
    mutationFn: () => {
      if (!lead?.id) throw new Error('No active test lead');
      return resetTestConversation(lead.id);
    },
    onSuccess: (data: any) => {
      setOptimisticCustomerMsg(null);
      if (data?.conversation) {
        queryClient.setQueryData(['testConversation', selectedProjectId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['testConversation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendMutation.isPending || !lead?.id) return;
    sendMutation.mutate(inputMessage.trim());
  };

  const handlePresetClick = (presetText: string) => {
    if (sendMutation.isPending || !lead?.id) return;
    sendMutation.mutate(presetText);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                AI Conversation & Intent Simulator
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate multi-turn real estate conversations in English & Hinglish and observe live AI intent extraction.
              </p>
            </div>
          </div>
        </div>

        {/* Project Selector for AI Context */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Building className="w-4 h-4 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending || !lead}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Main Grid: WhatsApp Chat Simulator + AI Analysis Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat Simulator Window (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Chat Window Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center font-bold text-xs text-white">
                RS
              </div>
              <div>
                <div className="text-xs font-bold flex items-center space-x-1.5">
                  <span>{lead?.name || 'Rahul Sharma (Test)'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[11px] text-slate-400">
                  {lead?.phone || '+91 98765 43210'} • WhatsApp Simulation
                </div>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Dev Sandbox
            </span>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-100/70">
            {isLoading ? (
              <div className="text-center text-xs text-slate-400 py-8">Initializing AI sandbox...</div>
            ) : (
              messages.map((msg: any) => {
                const isAI = msg.senderType === 'AI';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] ${
                        isAI
                          ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                          : 'bg-emerald-600 text-white rounded-tr-none'
                      }`}
                    >
                      <div className="flex items-center justify-between space-x-4 mb-1">
                        <span
                          className={`text-[10px] font-bold ${
                            isAI ? 'text-orange-600' : 'text-emerald-200'
                          }`}
                        >
                          {isAI ? 'AI Assistant (Aria)' : 'Rahul (Lead)'}
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
                      {renderFormattedMessage(msg.messageText, isAI)}
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
            {optimisticCustomerMsg && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] bg-emerald-600 text-white rounded-tr-none">
                  <div className="flex items-center justify-between space-x-4 mb-1">
                    <span className="text-[10px] font-bold text-emerald-200">Rahul (Lead)</span>
                    <span className="text-[10px] text-emerald-100">Just now</span>
                  </div>
                  {renderFormattedMessage(optimisticCustomerMsg, false)}
                </div>
              </div>
            )}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2 text-xs flex items-center space-x-2 text-slate-500 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
                  <span>Aria is typing response & analyzing intent...</span>
                </div>
              </div>
            )}
            {resetMutation.isPending && (
              <div className="flex justify-center py-6">
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs flex items-center space-x-2.5 text-slate-600 shadow-sm">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>Clearing conversation & preparing fresh AI outreach...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Real Estate Presets */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium py-1 px-1">Try:</span>
            <button
              onClick={() =>
                handlePresetClick('Haan interested hu. 2 BHK chahiye around 80 lakh. Kal call karna.')
              }
              className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200 rounded-lg text-slate-700 font-medium transition-all"
            >
              "2 BHK chahiye 80L, kal call karna"
            </button>
            <button
              onClick={() =>
                handlePresetClick('Site visit kab available hai? Saturday ko sample flat dekhna hai.')
              }
              className="px-2.5 py-1 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 rounded-lg text-slate-700 font-medium transition-all"
            >
              "Site visit sample flat Saturday"
            </button>
            <button
              onClick={() =>
                handlePresetClick('Not interested. Already purchased another flat last week.')
              }
              className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg text-slate-700 font-medium transition-all"
            >
              "Not interested / Already bought"
            </button>
          </div>

          {/* Message Input Bar */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type message as customer (e.g. 'Price kya hai 2 BHK ka?')..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sendMutation.isPending}
              className="p-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right: Real-time AI Analysis & Extraction Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-bold text-slate-900">AI Extraction Inspector</h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                Live Schema
              </span>
            </div>

            {/* Extraction Cards */}
            <div className="space-y-4">
              {/* Follow-up Required HERO BLOCK */}
              <div
                className={`p-4 rounded-xl border ${
                  latestAnalysis?.followUpRequired
                    ? 'bg-orange-50 border-orange-200 text-orange-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Follow-Up Status
                  </span>
                  {latestAnalysis?.followUpRequired ? (
                    <span className="flex items-center space-x-1 text-xs font-bold text-orange-700">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>REQUIRED</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">Not Required</span>
                  )}
                </div>
                <div className="text-xs font-medium">
                  {latestAnalysis?.followUpReason ||
                    'Awaiting customer conversation for intent qualification.'}
                </div>
              </div>

              {/* Grid of Extracted Signals */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Intent */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Detected Intent
                  </div>
                  <div className="font-bold text-slate-900 mt-1">
                    {latestAnalysis?.intent || 'PENDING'}
                  </div>
                </div>

                {/* Interest Level */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Interest Level
                  </div>
                  <div className="mt-1">
                    <StatusBadge
                      status={latestAnalysis?.interestLevel || 'UNKNOWN'}
                      type="interestLevel"
                    />
                  </div>
                </div>

                {/* Configuration */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Configuration
                  </div>
                  <div className="font-bold text-slate-900 mt-1">
                    {latestAnalysis?.configuration || 'Not specified'}
                  </div>
                </div>

                {/* Budget */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Extracted Budget
                  </div>
                  <div className="font-bold text-emerald-700 mt-1">
                    {latestAnalysis?.budget
                      ? `₹${(latestAnalysis.budget / 100000).toFixed(1)} Lakhs`
                      : 'Not stated'}
                  </div>
                </div>
              </div>

              {/* Callbacks & Site Visits */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2 ${
                    latestAnalysis?.callbackRequested
                      ? 'bg-orange-50 border-orange-200 text-orange-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Callback Requested</span>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2 ${
                    latestAnalysis?.siteVisitRequested
                      ? 'bg-purple-50 border-purple-200 text-purple-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Site Visit Requested</span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Executive Presales Summary
                </div>
                <p className="text-slate-700 leading-relaxed font-normal">
                  {latestAnalysis?.summary ||
                    'Start chatting on the left to see the AI summarize customer requirements.'}
                </p>
              </div>
            </div>
          </div>

          {/* Model info footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Model: {latestAnalysis?.model || 'gpt-4o-mini'}</span>
            <span>Prompt: {latestAnalysis?.promptVersion || 'v1.0'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

