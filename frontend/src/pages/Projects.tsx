import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  MapPin,
  Trash2,
  Pencil,
  Calendar,
  Layers,
  FileCheck,
  AlertTriangle,
  FileText,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addConfiguration,
  updateConfiguration,
  deleteConfiguration,
  addKnowledgeItem,
  deleteKnowledgeItem,
} from '../services/api';
import { Project, Configuration } from '../types';

export const Projects: React.FC = () => {
  const queryClient = useQueryClient();

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [manageConfigProjectId, setManageConfigProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // New & Edit Project Form state (Project-Level Only!)
  const [name, setName] = useState('');
  const [developer, setDeveloper] = useState('');
  const [location, setLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [possession, setPossession] = useState('');
  const [amenities, setAmenities] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const resetForm = () => {
    setName('');
    setDeveloper('');
    setLocation('');
    setFullAddress('');
    setGoogleMapsUrl('');
    setReraNumber('');
    setPossession('');
    setAmenities('');
    setDescription('');
    setCoverImageUrl('');
  };

  const handleOpenEditModal = (project: Project) => {
    setName(project.name || '');
    setDeveloper(project.developer || '');
    setLocation(project.location || '');
    setFullAddress(project.fullAddress || '');
    setGoogleMapsUrl(project.googleMapsUrl || '');
    setReraNumber(project.reraNumber || '');
    setPossession(project.possession || '');
    setAmenities(project.amenities || '');
    setDescription(project.description || '');
    setCoverImageUrl(project.coverImageUrl || '');
    setEditingProject(project);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImageUrl(reader.result as string);
    };
    reader.onerror = () => {
      alert('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Configuration Form state (inside Configuration Modal)
  const [cfgType, setCfgType] = useState('2 BHK');
  const [cfgCarpet, setCfgCarpet] = useState('');
  const [cfgPrice, setCfgPrice] = useState('');
  const [cfgPriceUnit, setCfgPriceUnit] = useState<'CR' | 'LAKH' | 'RUPEES'>('CR');
  const [cfgBaths, setCfgBaths] = useState('2');
  const [cfgBalconies, setCfgBalconies] = useState('1');
  const [cfgStatus, setCfgStatus] = useState('AVAILABLE');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  const getPricePreview = (valStr: string, unit: 'CR' | 'LAKH' | 'RUPEES') => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) return null;
    let fullAmount = val;
    let display = '';
    if (unit === 'CR') {
      fullAmount = Math.round(val * 10000000);
      display = `₹${val} Cr`;
    } else if (unit === 'LAKH') {
      fullAmount = Math.round(val * 100000);
      display = `₹${val} Lakhs`;
    } else {
      fullAmount = Math.round(val);
      if (fullAmount >= 10000000) {
        display = `₹${(fullAmount / 10000000).toFixed(2)} Cr`;
      } else if (fullAmount >= 100000) {
        display = `₹${(fullAmount / 100000).toFixed(1)} Lakhs`;
      } else {
        display = `₹${fullAmount.toLocaleString('en-IN')}`;
      }
    }
    return {
      display,
      fullFormatted: `₹${fullAmount.toLocaleString('en-IN')}`,
      numeric: fullAmount,
    };
  };

  const handleStartEditConfig = (cfg: Configuration) => {
    setEditingConfigId(cfg.id);
    setCfgType(cfg.type);
    setCfgCarpet(String(cfg.carpetAreaSqft));
    setCfgBaths(String(cfg.bathrooms || 2));
    setCfgBalconies(String(cfg.balconies || 1));
    setCfgStatus(cfg.availabilityStatus || 'AVAILABLE');
    if (cfg.startingPrice >= 10000000) {
      setCfgPriceUnit('CR');
      setCfgPrice(String(cfg.startingPrice / 10000000));
    } else if (cfg.startingPrice >= 100000) {
      setCfgPriceUnit('LAKH');
      setCfgPrice(String(cfg.startingPrice / 100000));
    } else if (cfg.startingPrice > 0) {
      if (cfg.startingPrice < 25) {
        setCfgPriceUnit('CR');
        setCfgPrice(String(cfg.startingPrice));
      } else {
        setCfgPriceUnit('LAKH');
        setCfgPrice(String(cfg.startingPrice));
      }
    } else {
      setCfgPriceUnit('CR');
      setCfgPrice('');
    }
  };

  const handleCancelEditConfig = () => {
    setEditingConfigId(null);
    setCfgType('2 BHK');
    setCfgCarpet('');
    setCfgPrice('');
    setCfgPriceUnit('CR');
  };

  // Knowledge QA state
  const [qaCategory, setQaCategory] = useState('PRICING');
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');

  // Queries
  const { data: rawProjects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      createProject({
        name,
        developer,
        location,
        fullAddress: fullAddress || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        reraNumber: reraNumber || undefined,
        possession: possession || undefined,
        amenities: amenities || undefined,
        description: description || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.refetchQueries({ queryKey: ['projects'] });
      setShowCreateModal(false);
      resetForm();
      showSuccess(`Project "${name}" created and photo saved successfully!`);
    },
    onError: (err: any) => {
      alert('Failed to save project: ' + (err.message || 'Please check project details.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingProject) throw new Error('No project selected for editing');
      return updateProject(editingProject.id, {
        name,
        developer,
        location,
        fullAddress: fullAddress || null,
        googleMapsUrl: googleMapsUrl.trim() || null,
        reraNumber: reraNumber || null,
        possession: possession || null,
        amenities: amenities || null,
        description: description || null,
        coverImageUrl: coverImageUrl.trim() || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.refetchQueries({ queryKey: ['projects'] });
      setEditingProject(null);
      resetForm();
      showSuccess(`Project "${name}" updated and photo saved successfully!`);
    },
    onError: (err: any) => {
      alert('Failed to update project: ' + (err.message || 'Please check project details.'));
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectToDelete(null);
    },
  });

  const addConfigMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      addConfiguration(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCfgCarpet('');
      setCfgPrice('');
      showSuccess('Configuration added successfully!');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({
      projectId,
      configId,
      data,
    }: {
      projectId: string;
      configId: string;
      data: any;
    }) => updateConfiguration(projectId, configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingConfigId(null);
      setCfgCarpet('');
      setCfgPrice('');
      showSuccess('Configuration updated successfully!');
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: ({ projectId, configId }: { projectId: string; configId: string }) =>
      deleteConfiguration(projectId, configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const addKnowledgeMutation = useMutation({
    mutationFn: ({
      projectId,
      category,
      question,
      answer,
    }: {
      projectId: string;
      category: string;
      question: string;
      answer: string;
    }) => addKnowledgeItem(projectId, { category, question, answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setQaQuestion('');
      setQaAnswer('');
    },
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: ({ projectId, knowledgeId }: { projectId: string; knowledgeId: string }) =>
      deleteKnowledgeItem(projectId, knowledgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const activeManageProject = projects.find((p) => p.id === manageConfigProjectId);
  const activeFaqProject = projects.find((p) => p.id === selectedProjectId);
  const pricePreview = getPricePreview(cfgPrice, cfgPriceUnit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Real Estate Projects & Configurations
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Add your projects and manage their independent typologies (1 BHK, 2 BHK, 3 BHK). The AI strictly isolates price, carpet area, and FAQs per project.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Project</span>
        </button>
      </div>

      {/* Live Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading real estate projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Projects in Database</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add your project details first, then add its configurations (2 BHK, 3 BHK, etc.) to start engaging leads!
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            + Add Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => {
            const configs = project.inventory || [];
            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col h-full overflow-hidden"
              >
                {/* Cover Image Banner (if uploaded) */}
                {project.coverImageUrl ? (
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={project.coverImageUrl}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-black/20" />
                    <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-emerald-800 shadow-xs">
                        {project.status || 'ACTIVE'}
                      </span>
                      <button
                        onClick={() => handleOpenEditModal(project)}
                        className="p-1.5 text-white/90 hover:text-white bg-slate-900/60 hover:bg-orange-600 rounded-lg backdrop-blur-xs transition-colors shadow-xs"
                        title="Edit Project"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setProjectToDelete(project)}
                        className="p-1.5 text-white/90 hover:text-white bg-slate-900/60 hover:bg-rose-600 rounded-lg backdrop-blur-xs transition-colors shadow-xs"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="absolute bottom-2.5 left-4 right-4">
                      <h2 className="text-sm font-bold text-white drop-shadow-sm truncate">{project.name}</h2>
                      <div className="text-[11px] text-slate-200 font-medium drop-shadow-sm truncate">{project.developer}</div>
                    </div>
                  </div>
                ) : null}

                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-start">
                  {/* Top: Project Name & Delete Button (shown when no cover image) */}
                  {!project.coverImageUrl && (
                    <div className="flex items-start justify-between pb-1">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">{project.name}</h2>
                        <div className="text-xs text-slate-500 font-medium">{project.developer}</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {project.status || 'ACTIVE'}
                        </span>
                        <button
                          onClick={() => handleOpenEditModal(project)}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit Project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProjectToDelete(project)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Macro details */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate font-semibold text-xs">{project.location}</span>
                    </div>

                    {project.fullAddress && (
                      <div className="text-[11px] text-slate-500 line-clamp-1 pl-5">
                        {project.fullAddress}
                      </div>
                    )}

                    {project.googleMapsUrl && (
                      <div className="pl-5 pt-0.5">
                        <a
                          href={project.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-[11px] text-orange-600 hover:text-orange-700 font-semibold hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Location Map Link</span>
                        </a>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1 truncate" title={project.reraNumber || undefined}>
                        <FileCheck className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{project.reraNumber ? `RERA: ${project.reraNumber}` : 'RERA: Registered'}</span>
                      </div>
                      <div className="flex items-center space-x-1 truncate">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{project.possession ? `Poss: ${project.possession}` : 'Poss: On Request'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Configurations Box */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-orange-500" />
                        <span>Configurations ({configs.length})</span>
                      </span>
                      <button
                        onClick={() => setManageConfigProjectId(project.id)}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                      >
                        Manage
                      </button>
                    </div>

                    {configs.length === 0 ? (
                      <div className="py-2 px-3 bg-orange-50/50 rounded-lg border border-dashed border-orange-200 text-center flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">No configs added yet</span>
                        <button
                          onClick={() => setManageConfigProjectId(project.id)}
                          className="px-2 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-bold inline-flex items-center space-x-1 shadow-2xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-0.5">
                        {configs.map((cfg: Configuration) => {
                          const displayPrice =
                            cfg.priceDisplay && !cfg.priceDisplay.includes('0.0')
                              ? cfg.priceDisplay
                              : cfg.startingPrice >= 10000000
                              ? `₹${(cfg.startingPrice / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`
                              : cfg.startingPrice >= 100000
                              ? `₹${(cfg.startingPrice / 100000).toFixed(1).replace(/\.0$/, '')} Lakhs`
                              : cfg.startingPrice > 0
                              ? cfg.startingPrice < 25
                                ? `₹${cfg.startingPrice} Cr`
                                : `₹${cfg.startingPrice} Lakhs`
                              : 'Price on Request';

                          return (
                            <div
                              key={cfg.id}
                              className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/70 flex items-center justify-between text-xs transition-colors"
                            >
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900">{cfg.type}</span>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[11px] text-slate-500">{cfg.carpetAreaSqft} sq.ft.</span>
                              </div>
                              <span className="font-bold text-emerald-700 text-xs">
                                {displayPrice}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {project.description && project.description.trim().length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-orange-500" />
                        <span>Project Description</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed max-h-16 overflow-y-auto pr-1 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                        {project.description.trim()}
                      </p>
                    </div>
                  )}

                  {project.amenities && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center space-x-1.5 text-[11px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Amenities:</span>
                      <span className="text-slate-600 truncate">{project.amenities}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metrics & Action Buttons */}
                <div className="mt-auto px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
                  <div className="text-slate-500 text-[11px]">
                    <span className="font-bold text-slate-800">{project._count?.knowledge || 0}</span> FAQs
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setManageConfigProjectId(project.id)}
                      className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Configuration</span>
                    </button>
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      FAQs
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Delete Project Confirmation */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Project?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{projectToDelete.name}"</span>?
              This will permanently delete all associated configurations, FAQs, and lead records.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProjectMutation.mutate(projectToDelete.id)}
                disabled={deleteProjectMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {deleteProjectMutation.isPending ? 'Deleting...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Manage Configurations (Opened via "+ Add Configuration") */}
      {manageConfigProjectId && activeManageProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeManageProject.name} — Configurations
                </h2>
                <p className="text-xs text-slate-500">
                  Add and manage unit configurations (2 BHK, 3 BHK, etc.) with carpet area and pricing.
                </p>
              </div>
              <button
                onClick={() => {
                  handleCancelEditConfig();
                  setManageConfigProjectId(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Existing configurations list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(activeManageProject.inventory || []).length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No configurations added yet for this project. Fill out the form below to add your first configuration!
                </div>
              ) : (
                (activeManageProject.inventory || []).map((cfg) => {
                  const displayPrice =
                    cfg.priceDisplay && !cfg.priceDisplay.includes('0.0')
                      ? cfg.priceDisplay
                      : cfg.startingPrice >= 10000000
                      ? `₹${(cfg.startingPrice / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`
                      : cfg.startingPrice >= 100000
                      ? `₹${(cfg.startingPrice / 100000).toFixed(1).replace(/\.0$/, '')} Lakhs`
                      : cfg.startingPrice > 0
                      ? cfg.startingPrice < 25
                        ? `₹${cfg.startingPrice} Cr`
                        : `₹${cfg.startingPrice} Lakhs`
                      : 'Price on Request';

                  const isCurrentEditing = editingConfigId === cfg.id;

                  return (
                    <div
                      key={cfg.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isCurrentEditing
                          ? 'bg-orange-50/80 border-orange-300 ring-1 ring-orange-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{cfg.type}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {cfg.availabilityStatus}
                          </span>
                          {isCurrentEditing && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 animate-pulse">
                              Editing...
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 flex items-center space-x-3 text-[11px]">
                          <span>📐 {cfg.carpetAreaSqft} sq.ft. (Carpet)</span>
                          <span>🚿 {cfg.bathrooms} Baths</span>
                          <span>🅿️ {cfg.parkingSpaces || '1 Covered'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-700">{displayPrice}</div>
                          <div className="text-[10px] text-slate-400">Starting Price</div>
                        </div>
                        <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                          <button
                            onClick={() => handleStartEditConfig(cfg)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrentEditing
                                ? 'text-orange-600 bg-orange-100'
                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                            title="Edit Configuration"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              deleteConfigMutation.mutate({
                                projectId: activeManageProject.id,
                                configId: cfg.id,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Configuration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add / Edit Configuration Form */}
            <div className="pt-4 border-t border-slate-200 space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  {editingConfigId ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-orange-600" />
                      <span>Edit Configuration ({cfgType})</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-orange-600" />
                      <span>+ Add Configuration to {activeManageProject.name}</span>
                    </>
                  )}
                </div>
                {editingConfigId && (
                  <button
                    type="button"
                    onClick={handleCancelEditConfig}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Configuration Type *</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 BHK or 3 BHK"
                    value={cfgType}
                    onChange={(e) => setCfgType(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Carpet Area (sq.ft.) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 800 or 1250"
                    value={cfgCarpet}
                    onChange={(e) => setCfgCarpet(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Starting Price *</label>
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-1 focus-within:ring-orange-500 focus-within:border-orange-500">
                    <span className="pl-2.5 text-slate-400 font-bold text-xs shrink-0">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder={
                        cfgPriceUnit === 'CR'
                          ? 'e.g. 1.27'
                          : cfgPriceUnit === 'LAKH'
                          ? 'e.g. 85'
                          : 'e.g. 12700000'
                      }
                      value={cfgPrice}
                      onChange={(e) => setCfgPrice(e.target.value)}
                      className="w-full text-xs py-2 px-1 text-slate-800 focus:outline-none font-medium min-w-0"
                    />
                    <div className="flex items-center bg-slate-100 p-0.5 mr-1 rounded shrink-0 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setCfgPriceUnit('CR')}
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          cfgPriceUnit === 'CR'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Crore"
                      >
                        Cr
                      </button>
                      <button
                        type="button"
                        onClick={() => setCfgPriceUnit('LAKH')}
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          cfgPriceUnit === 'LAKH'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Lakhs"
                      >
                        Lakh
                      </button>
                      <button
                        type="button"
                        onClick={() => setCfgPriceUnit('RUPEES')}
                        className={`px-1 py-0.5 rounded transition-all ${
                          cfgPriceUnit === 'RUPEES'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Total Rupees"
                      >
                        ₹
                      </button>
                    </div>
                  </div>
                  {pricePreview && (
                    <div className="mt-1 text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                      <span>✓ Will Display:</span>
                      <span className="truncate">
                        {pricePreview.display} ({pricePreview.fullFormatted})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={cfgBaths}
                    onChange={(e) => setCfgBaths(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Balconies</label>
                  <input
                    type="number"
                    value={cfgBalconies}
                    onChange={(e) => setCfgBalconies(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Availability Status</label>
                  <select
                    value={cfgStatus}
                    onChange={(e) => setCfgStatus(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="FEW_UNITS_LEFT">FEW UNITS LEFT</option>
                    <option value="SOLD_OUT">SOLD OUT</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  if (editingConfigId) {
                    updateConfigMutation.mutate({
                      projectId: activeManageProject.id,
                      configId: editingConfigId,
                      data: {
                        type: cfgType,
                        carpetAreaSqft: cfgCarpet,
                        startingPrice: cfgPrice,
                        priceUnit: cfgPriceUnit,
                        bathrooms: cfgBaths,
                        balconies: cfgBalconies,
                        availabilityStatus: cfgStatus,
                      },
                    });
                  } else {
                    addConfigMutation.mutate({
                      projectId: activeManageProject.id,
                      data: {
                        type: cfgType,
                        carpetAreaSqft: cfgCarpet,
                        startingPrice: cfgPrice,
                        priceUnit: cfgPriceUnit,
                        bathrooms: cfgBaths,
                        balconies: cfgBalconies,
                        availabilityStatus: cfgStatus,
                      },
                    });
                  }
                }}
                disabled={
                  !cfgType ||
                  !cfgCarpet ||
                  !cfgPrice ||
                  addConfigMutation.isPending ||
                  updateConfigMutation.isPending
                }
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                {(addConfigMutation.isPending || updateConfigMutation.isPending) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {editingConfigId
                    ? updateConfigMutation.isPending
                      ? 'Saving Changes...'
                      : '✓ Update Configuration'
                    : addConfigMutation.isPending
                    ? 'Adding Configuration...'
                    : '+ Save Configuration'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Project (ONLY PROJECT-LEVEL DETAILS!) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-2xl p-7 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Add Real Estate Project</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter project information. You can add configurations (2 BHK, 3 BHK, etc.) right from the project card once created.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. The Domus"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Developer / Builder *</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Developers"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Area *</label>
                  <input
                    type="text"
                    placeholder="e.g. Panvel, Navi Mumbai"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RERA Number</label>
                  <input
                    type="text"
                    placeholder="e.g. P52000012345"
                    value={reraNumber}
                    onChange={(e) => setReraNumber(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 18, Opp Central Park, Panvel"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Location Map Link (Google Maps URL)</span>
                  <span className="text-[10px] text-orange-600 font-normal">AI sends this link when leads ask for location</span>
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://maps.app.goo.gl/... or https://maps.google.com/..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Possession Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Dec 2026 or Ready to Move"
                    value={possession}
                    onChange={(e) => setPossession(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key Amenities</label>
                  <input
                    type="text"
                    placeholder="e.g. Clubhouse, Swimming Pool, Gym"
                    value={amenities}
                    onChange={(e) => setAmenities(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the project overview, elevation (e.g. G+23 storey), land parcel size, connectivity, and key USPs for AI lead engagement and display..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-3 bg-slate-50 focus:ring-1 focus:ring-orange-500 min-h-[90px] resize-y leading-relaxed text-slate-800"
                />
              </div>

              {/* Project Cover Photo Upload & URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Project Cover Photo <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  {coverImageUrl && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Photo Selected</span>
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  {/* Option A: Upload from computer */}
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-orange-400 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2 cursor-pointer shadow-2xs transition-all">
                      <Upload className="w-3.5 h-3.5 text-orange-600" />
                      <span>Choose photo from device (PNG, JPG, WEBP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 uppercase font-semibold">
                    <div className="flex-1 border-t border-slate-200" />
                    <span>or paste image web URL</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* Option B: Direct URL Input - ALWAYS MOUNTED & EDITABLE */}
                  <div className="relative flex items-center">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Paste image link: https://images.unsplash.com/..."
                      value={coverImageUrl.startsWith('data:') ? '' : coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted) setCoverImageUrl(pasted.trim());
                      }}
                      className="w-full pl-8 pr-16 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                    {coverImageUrl && (
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="absolute right-2 px-2 py-0.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded text-[10px] font-semibold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Live Photo Preview */}
                  {coverImageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 w-full bg-slate-200 shadow-inner group">
                      <img
                        src={coverImageUrl}
                        alt="Elevation Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.3';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Live Preview</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCoverImageUrl('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!name || !developer || !location || createMutation.isPending}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Saving Project...</span>
                  </>
                ) : (
                  <span>Save Project</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Project */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-2xl p-7 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Project Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update project information, amenities, and cover image.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Developer / Builder *</label>
                  <input
                    type="text"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Area *</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RERA Number</label>
                  <input
                    type="text"
                    value={reraNumber}
                    onChange={(e) => setReraNumber(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Physical Address</label>
                <input
                  type="text"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Location Map Link (Google Maps URL)</span>
                  <span className="text-[10px] text-orange-600 font-normal">AI sends this link when leads ask for location</span>
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://maps.app.goo.gl/... or https://maps.google.com/..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Possession Date</label>
                  <input
                    type="text"
                    value={possession}
                    onChange={(e) => setPossession(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key Amenities</label>
                  <input
                    type="text"
                    value={amenities}
                    onChange={(e) => setAmenities(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the project overview, elevation (e.g. G+23 storey), land parcel size, connectivity, and key USPs for AI lead engagement and display..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-3 bg-slate-50 focus:ring-1 focus:ring-orange-500 min-h-[90px] resize-y leading-relaxed text-slate-800"
                />
              </div>

              {/* Project Cover Photo Upload & URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Project Cover Photo <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  {coverImageUrl && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Photo Selected</span>
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  {/* Option A: Upload from computer */}
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-orange-400 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2 cursor-pointer shadow-2xs transition-all">
                      <Upload className="w-3.5 h-3.5 text-orange-600" />
                      <span>Choose photo from device (PNG, JPG, WEBP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 uppercase font-semibold">
                    <div className="flex-1 border-t border-slate-200" />
                    <span>or paste image web URL</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* Option B: Direct URL Input - ALWAYS MOUNTED & EDITABLE */}
                  <div className="relative flex items-center">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Paste image link: https://images.unsplash.com/..."
                      value={coverImageUrl.startsWith('data:') ? '' : coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted) setCoverImageUrl(pasted.trim());
                      }}
                      className="w-full pl-8 pr-16 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                    {coverImageUrl && (
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="absolute right-2 px-2 py-0.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded text-[10px] font-semibold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Live Photo Preview */}
                  {coverImageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 w-full bg-slate-200 shadow-inner group">
                      <img
                        src={coverImageUrl}
                        alt="Elevation Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.3';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Live Preview</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={!name || !developer || !location || updateMutation.isPending}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Updating Project...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Knowledge Base FAQs Manager */}
      {selectedProjectId && activeFaqProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl border border-slate-200 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeFaqProject.name} — FAQs & Grounding Knowledge
                </h2>
                <p className="text-xs text-slate-500">
                  Approved Q&As the AI assistant uses to answer customer inquiries accurately.
                </p>
              </div>
              <button
                onClick={() => setSelectedProjectId(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Existing FAQs */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(activeFaqProject.knowledge || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No FAQs added yet. Add custom Q&As below (e.g. site visit timings, offers, sample flat).
                </div>
              ) : (
                (activeFaqProject.knowledge || []).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex justify-between items-start space-x-3"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        {item.category}
                      </span>
                      <div className="font-bold text-slate-900">Q: {item.question}</div>
                      <div className="text-slate-600">A: {item.answer}</div>
                    </div>
                    <button
                      onClick={() =>
                        deleteKnowledgeMutation.mutate({
                          projectId: selectedProjectId,
                          knowledgeId: item.id,
                        })
                      }
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New FAQ Form */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800">Add Approved Question & Answer</div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={qaCategory}
                  onChange={(e) => setQaCategory(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                >
                  <option value="PRICING">PRICING</option>
                  <option value="CONFIGURATION">CONFIGURATION</option>
                  <option value="AMENITIES">AMENITIES</option>
                  <option value="LOCATION">LOCATION</option>
                  <option value="SITE_VISIT">SITE VISIT</option>
                  <option value="POSSESSION">POSSESSION</option>
                  <option value="GENERAL">GENERAL</option>
                </select>
                <input
                  type="text"
                  placeholder="Question (e.g. Is site visit available on weekends?)"
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  className="col-span-2 text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>
              <textarea
                placeholder="Approved answer to ground the AI assistant..."
                rows={2}
                value={qaAnswer}
                onChange={(e) => setQaAnswer(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
              />
              <button
                onClick={() =>
                  addKnowledgeMutation.mutate({
                    projectId: selectedProjectId,
                    category: qaCategory,
                    question: qaQuestion,
                    answer: qaAnswer,
                  })
                }
                disabled={!qaQuestion || !qaAnswer || addKnowledgeMutation.isPending}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                + Add to Knowledge Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
