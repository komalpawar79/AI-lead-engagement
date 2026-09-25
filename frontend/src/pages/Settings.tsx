import React, { useState } from 'react';
import { Settings as SettingsIcon, MessageSquare, Bot, Shield, Save, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [model, setModel] = useState('gpt-4o-mini');
  const [phoneId, setPhoneId] = useState('');
  const [verifyToken, setVerifyToken] = useState('leadengage_webhook_verify_token_2026');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure Meta WhatsApp Cloud API credentials, OpenAI engine parameters, and real estate business rules.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* WhatsApp Cloud API Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Meta WhatsApp Cloud API Configuration</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Webhook Callback URL</label>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-slate-700 select-all border border-slate-200">
                {webhookUrl}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Configure this URL in Meta Developer Portal under WhatsApp &gt; Configuration &gt; Webhook.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Webhook Verify Token</label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">WhatsApp Phone Number ID</label>
                <input
                  type="text"
                  placeholder="e.g. 100234567890123"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* OpenAI Engine Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Bot className="w-5 h-5 text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900">AI Model & Extraction Parameters</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Active LLM Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-medium"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recommended: Fast & Low Latency)</option>
                  <option value="gpt-4o">gpt-4o (High Precision Real Estate Reasoning)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Extraction Prompt Version</label>
                <div className="p-2.5 bg-slate-50 rounded-lg font-mono text-slate-600 border border-slate-200">
                  v1.0 (Structured Intent + Hinglish Entity Extraction)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Estate Business Rules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Strict Real Estate Guardrails</h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded text-orange-600" />
              <div>
                <div className="font-bold text-slate-800">Zero Hallucination Grounding</div>
                <div className="text-slate-500 text-[11px]">
                  AI strictly rejects answering questions outside the verified project knowledge base.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded text-orange-600" />
              <div>
                <div className="font-bold text-slate-800">Never Infer Budget</div>
                <div className="text-slate-500 text-[11px]">
                  Budget remains null unless explicitly stated by the lead in conversations.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded text-orange-600" />
              <div>
                <div className="font-bold text-slate-800">Immediate Presales Handoff on Callback</div>
                <div className="text-slate-500 text-[11px]">
                  Automatically tags lead as Follow-Up Required upon callback or site visit request.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

