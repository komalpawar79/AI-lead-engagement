import axios from 'axios';
import {
  DashboardSummary,
  DashboardActivity,
  Lead,
  Project,
  Configuration,
  Campaign,
  FollowUpItem,
  Conversation,
  NotificationItem,
} from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = rawApiUrl
  ? rawApiUrl.replace(/\/+$/, '').endsWith('/api')
    ? rawApiUrl.replace(/\/+$/, '')
    : `${rawApiUrl.replace(/\/+$/, '')}/api`
  : window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach token if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to unwrap { success, data }
api.interceptors.response.use(
  (response) => {
    // If response data is an HTML document string (from SPA fallback rewrite or 404 handler), reject it
    if (
      typeof response.data === 'string' &&
      (response.data.includes('<!DOCTYPE html>') ||
        response.data.includes('<!doctype html>') ||
        response.data.includes('<html'))
    ) {
      return Promise.reject(
        new Error('API endpoint returned HTML document instead of JSON. Backend service may be unreachable.')
      );
    }
    return response.data?.data ?? response.data;
  },
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Auth APIs
export const loginApi = (data: { email: string; password: string }): Promise<{ token: string; user: any }> =>
  api.post('/auth/login', data);

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/login';
};

// Dashboard APIs
export const getDashboardSummary = (): Promise<DashboardSummary> =>
  api.get('/dashboard/summary');

export const getDashboardActivity = (): Promise<DashboardActivity[]> =>
  api.get('/dashboard/activity');

// Leads APIs
export const getLeads = (params?: {
  search?: string;
  status?: string;
  projectId?: string;
  interestLevel?: string;
  followUpRequired?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ leads: Lead[]; pagination: any }> =>
  api.get('/leads', { params });

export const getLeadById = (id: string): Promise<any> =>
  api.get(`/leads/${id}`);

export const uploadLeads = (formData: FormData): Promise<any> =>
  api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateLead = (id: string, data: any): Promise<Lead> =>
  api.put(`/leads/${id}`, data);

// Projects APIs
export const getProjects = (): Promise<Project[]> =>
  api.get('/projects');

export const getProjectById = (id: string): Promise<Project> =>
  api.get(`/projects/${id}`);

export const createProject = (data: any): Promise<Project> =>
  api.post('/projects', data);

export const updateProject = (id: string, data: any): Promise<Project> =>
  api.put(`/projects/${id}`, data);

export const deleteProject = (id: string): Promise<any> =>
  api.delete(`/projects/${id}`);

// Configuration APIs
export const addConfiguration = (projectId: string, data: any): Promise<Configuration> =>
  api.post(`/projects/${projectId}/configurations`, data);

export const updateConfiguration = (projectId: string, configId: string, data: any): Promise<Configuration> =>
  api.put(`/projects/${projectId}/configurations/${configId}`, data);

export const deleteConfiguration = (projectId: string, configId: string): Promise<any> =>
  api.delete(`/projects/${projectId}/configurations/${configId}`);

export const addKnowledgeItem = (projectId: string, data: { category: string; question: string; answer: string }): Promise<any> =>
  api.post(`/projects/${projectId}/knowledge`, data);

export const deleteKnowledgeItem = (projectId: string, knowledgeId: string): Promise<any> =>
  api.delete(`/projects/${projectId}/knowledge/${knowledgeId}`);

// Campaigns APIs
export const getCampaigns = (): Promise<Campaign[]> =>
  api.get('/campaigns');

export const getCampaignById = (id: string): Promise<Campaign> =>
  api.get(`/campaigns/${id}`);

export const createCampaign = (data: { name: string; projectId: string }): Promise<Campaign> =>
  api.post('/campaigns', data);

export const startCampaign = (id: string): Promise<any> =>
  api.post(`/campaigns/${id}/start`);

export const pauseCampaign = (id: string): Promise<any> =>
  api.post(`/campaigns/${id}/pause`);

export const resumeCampaign = (id: string): Promise<any> =>
  api.post(`/campaigns/${id}/resume`);

// Follow-ups APIs
export const getFollowUps = (params?: { status?: string; priority?: string }): Promise<FollowUpItem[]> =>
  api.get('/follow-ups', { params });

export const updateFollowUpStatus = (id: string, data: { status?: string; priority?: string }): Promise<any> =>
  api.patch(`/follow-ups/${id}`, data);

export const exportFollowUpsUrl = `${API_BASE_URL}/follow-ups/export`;

// Conversations APIs
export const getConversationByLeadId = (leadId: string): Promise<Conversation> =>
  api.get(`/conversations/lead/${leadId}`);

export const sendMessage = (data: { leadId: string; messageText: string; channel?: string }): Promise<any> =>
  api.post('/conversations/message', data);

export const createOrGetTestConversation = (data?: { name?: string; phone?: string; projectId?: string }): Promise<any> =>
  api.post('/conversations/test-lead', data || {});

export const resetTestConversation = (leadId: string): Promise<any> =>
  api.post(`/conversations/test-lead/${leadId}/reset`);

// Notifications APIs
export const getNotifications = (): Promise<NotificationItem[]> =>
  api.get('/notifications');

export const markNotificationAsRead = (id: string): Promise<any> =>
  api.patch(`/notifications/${id}/read`);

export const markAllNotificationsAsRead = (): Promise<any> =>
  api.post('/notifications/mark-all-read');

export default api;

