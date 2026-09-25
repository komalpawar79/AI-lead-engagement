import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Download,
  Building,
} from 'lucide-react';
import { getProjects, uploadLeads } from '../services/api';

export const UploadLeads: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: rawProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  // Dry run / Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProjectId);
      formData.append('confirm', 'false');
      return await uploadLeads(formData);
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Validation failed.');
    },
  });

  // Final Commit Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedProjectId) return;
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', selectedProjectId);
      formData.append('confirm', 'true');
      return await uploadLeads(formData);
    },
    onSuccess: () => {
      navigate('/leads');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Import failed.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setValidationResult(null);
      setErrorMessage(null);
    }
  };

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select an Excel or CSV file.');
      return;
    }
    if (!selectedProjectId) {
      setErrorMessage('Please select a target real estate project.');
      return;
    }
    validateMutation.mutate(selectedFile);
  };

  // Helper to generate and download a sample CSV/Excel template
  const downloadSampleTemplate = () => {
    const csvContent =
      'Name,Mobile,Email,Project,Requirement,Budget\n' +
      'Vikram Saxena,9876543210,vikram@gmail.com,Godrej Horizon,2 BHK,8500000\n' +
      'Ritu Sen,9812345678,ritu@infosys.com,Godrej Horizon,3 BHK,18000000\n' +
      'Karan Patel,9899887766,karan@startup.io,Godrej Horizon,2 BHK,9000000\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_real_estate_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Import Excel Leads
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload raw leads from Excel (.xlsx) or CSV. The AI will engage them automatically.
          </p>
        </div>

        <button
          onClick={downloadSampleTemplate}
          type="button"
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center space-x-2">
          <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Upload Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleValidate} className="space-y-6">
          {/* Target Project Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              1. Select Associated Real Estate Project *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              >
                <option value="">-- Choose Project for AI Context Grounding --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.location} ({p.configurations})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              The AI will use this project's verified pricing, configurations, and amenities during conversations.
            </p>
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              2. Upload Spreadsheet File (.xlsx, .csv) *
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-orange-50/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <div className="text-xs font-bold text-slate-900">{selectedFile.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Click to choose file or drag and drop here
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Excel (.xlsx, .xls) or Comma Separated Values (.csv) up to 10MB
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validate Button */}
          {!validationResult && (
            <button
              type="submit"
              disabled={validateMutation.isPending || !selectedFile || !selectedProjectId}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>
                {validateMutation.isPending ? 'Validating Spreadsheet...' : 'Validate File'}
              </span>
            </button>
          )}
        </form>

        {/* Step 2: Validation Summary & Row Preview */}
        {validationResult && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Validation Summary</h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                File Parsed
              </span>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Rows</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {validationResult.totalRows}
                </div>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Rows</span>
                </div>
                <div className="text-xl font-bold text-emerald-800 mt-1">
                  {validationResult.validRows}
                </div>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                <div className="text-[11px] font-semibold text-amber-700 uppercase flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Duplicates</span>
                </div>
                <div className="text-xl font-bold text-amber-800 mt-1">
                  {validationResult.duplicatesCount}
                </div>
              </div>

              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                <div className="text-[11px] font-semibold text-rose-700 uppercase flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Errors</span>
                </div>
                <div className="text-xl font-bold text-rose-800 mt-1">
                  {validationResult.errorsCount}
                </div>
              </div>
            </div>

            {/* Validation Errors List if any */}
            {validationResult.errors && validationResult.errors.length > 0 && (
              <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 text-xs">
                <div className="font-bold text-rose-800 mb-2">Detected Row Issues (will be skipped):</div>
                <ul className="list-disc list-inside space-y-1 text-rose-700">
                  {validationResult.errors.map((e: any, idx: number) => (
                    <li key={idx}>
                      Row {e.rowNumber}: <span className="font-medium">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview First 5 Rows */}
            {validationResult.preview && validationResult.preview.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sample Data Preview (First 5 Rows):
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Requirement</th>
                        <th className="py-2.5 px-3">Budget</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.preview.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{row.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.phone}</td>
                          <td className="py-2.5 px-3 text-slate-400">{row.email || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.requirement || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {row.budget ? `₹${(row.budget / 100000).toFixed(1)}L` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 3: Confirm Import Action */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setValidationResult(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Re-upload File
              </button>
              <button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || validationResult.validRows === 0}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <span>
                  {importMutation.isPending
                    ? 'Importing Leads...'
                    : `Confirm & Import ${validationResult.validRows} Leads`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

