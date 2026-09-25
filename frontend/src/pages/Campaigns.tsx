import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Play,
  Pause,
  Plus,
  Building,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Flame,
} from 'lucide-react';
import {
  getCampaigns,
  getProjects,
  createCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
} from '../services/api';
import { Campaign } from '../types';

export const Campaigns: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newProjectId, setNewProjectId] = useState('');

  const { data: rawCampaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  });

  const { data: rawProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const campaigns = Array.isArray(rawCampaigns) ? rawCampaigns : [];
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  const createMutation = useMutation({
    mutationFn: () => createCampaign({ name: newCampaignName, projectId: newProjectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreateModal(false);
      setNewCampaignName('');
      setNewProjectId('');
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => startCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => pauseCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Outreach Campaigns</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automate high-volume conversational lead engagement across projects with rate-controlled queues.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New AI Campaign</span>
        </button>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No campaigns found. Create your first AI outreach campaign to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((campaign: Campaign) => (
            <div
              key={campaign.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-base font-bold text-slate-900">{campaign.name}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        campaign.status === 'RUNNING'
                          ? 'bg-emerald-100 text-emerald-800'
                          : campaign.status === 'PAUSED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-1.5 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Project: {campaign.project?.name || 'Assigned Project'}</span>
                  </div>
                </div>

                {/* Campaign Action Buttons */}
                <div className="flex items-center space-x-2">
                  {campaign.status === 'DRAFT' && (
                    <button
                      onClick={() => startMutation.mutate(campaign.id)}
                      disabled={startMutation.isPending}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Campaign</span>
                    </button>
                  )}
                  {campaign.status === 'RUNNING' && (
                    <button
                      onClick={() => pauseMutation.mutate(campaign.id)}
                      disabled={pauseMutation.isPending}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  {campaign.status === 'PAUSED' && (
                    <button
                      onClick={() => resumeMutation.mutate(campaign.id)}
                      disabled={resumeMutation.isPending}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div className="text-[11px] text-slate-500 font-semibold">Total Leads</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{campaign.totalLeads}</div>
                </div>

                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                  <div className="text-[11px] text-blue-700 font-semibold flex items-center space-x-1">
                    <Send className="w-3 h-3" />
                    <span>Sent</span>
                  </div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">
                    {campaign.messagesSent}
                  </div>
                </div>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                  <div className="text-[11px] text-purple-700 font-semibold flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Replies</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900 mt-0.5">{campaign.responses}</div>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                  <div className="text-[11px] text-emerald-700 font-semibold">Interested</div>
                  <div className="text-lg font-bold text-emerald-900 mt-0.5">
                    {campaign.interestedLeads}
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                  <div className="text-[11px] text-orange-700 font-bold flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>Follow-ups</span>
                  </div>
                  <div className="text-lg font-black text-orange-700 mt-0.5">
                    {campaign.followUpLeads}
                  </div>
                </div>

                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                  <div className="text-[11px] text-rose-700 font-semibold">Not Interested</div>
                  <div className="text-lg font-bold text-rose-900 mt-0.5">
                    {campaign.notInterested}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Campaign */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Create AI Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Premium Buyer Outreach"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Project *
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newCampaignName || !newProjectId || createMutation.isPending}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

