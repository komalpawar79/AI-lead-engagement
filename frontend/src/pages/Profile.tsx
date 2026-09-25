import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Save,
  CheckCircle2,
  Camera,
  MapPin,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';

export const Profile: React.FC = () => {
  // Load current admin from localStorage or default
  const storedUser = (() => {
    try {
      const u = localStorage.getItem('auth_user');
      const parsed = u ? JSON.parse(u) : null;
      if (parsed && (parsed.name === 'Sales Director' || parsed.name === 'Admin User')) {
        parsed.name = 'Admin';
        localStorage.setItem('auth_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  })();

  const [name, setName] = useState(storedUser?.name || 'Admin');
  const [email, setEmail] = useState(storedUser?.email || 'admin@leadengage.ai');
  const [phone, setPhone] = useState(storedUser?.phone || '+91 98765 00000');
  const [company, setCompany] = useState(storedUser?.company || 'Prime Real Estate Advisors');
  const [location, setLocation] = useState(storedUser?.location || 'Mumbai');
  const [avatarUrl, setAvatarUrl] = useState(storedUser?.avatarUrl || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarUrl(base64);
      const current = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const updated = { ...current, avatarUrl: base64 };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auth_user_updated', { detail: updated }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    const current = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const updated = { ...current, avatarUrl: '' };
    localStorage.setItem('auth_user', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('auth_user_updated', { detail: updated }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      const updated = {
        ...(storedUser || {}),
        name,
        email,
        phone,
        company,
        location,
        avatarUrl,
        role: 'ADMIN',
      };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auth_user_updated', { detail: updated }));
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Profile</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your administrator profile, contact info, and agency details.
              </p>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Admin</span>
        </span>
      </div>

      {/* Main Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Avatar Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="w-28 h-28 rounded-full object-cover border-4 border-orange-500/20 shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-orange-500/20">
                {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-orange-600 transition-colors"
              title="Upload Profile Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">{name}</h2>
            <p className="text-xs text-slate-500">{email}</p>
            <div className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full inline-block">
              {company}
            </div>
          </div>

          {/* Avatar Actions */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove Photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="w-full pt-4 border-t border-slate-100 text-left space-y-2 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          </div>
        </div>

        {/* Right: Personal & Agency Details Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Admin Account Details</h3>
                <p className="text-xs text-slate-500">Edit your administrator name and agency credentials</p>
              </div>
              {isSaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Profile updated successfully!</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / WhatsApp Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Real Estate Firm / Agency</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Mumbai or Navi Mumbai"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              {isSaved ? (
                <div className="text-xs font-bold text-emerald-700 flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Profile updated & synchronized!</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Updates sync across header and sidebar automatically.
                </div>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all disabled:opacity-80 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Changes...</span>
                  </>
                ) : isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
