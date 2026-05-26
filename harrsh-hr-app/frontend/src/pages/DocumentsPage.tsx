import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import useToast from '../hooks/useToast';
import useAuth from '../hooks/useAuth';

const DOC_TYPES = ['AADHAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'DEGREE', 'EXPERIENCE_LETTER', 'OFFER_LETTER', 'OTHER'];

const statusColor = { PENDING: 'bg-yellow-100 text-yellow-700', VERIFIED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };

const DocumentsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const showToast = (msg, type) => toast[type] ? toast[type](msg) : toast.info(msg);
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', type: 'OTHER', expiryDate: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then(r => r.data.data),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Select a file');
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('name', uploadForm.name || selectedFile.name);
      fd.append('type', uploadForm.type);
      if (uploadForm.expiryDate) fd.append('expiryDate', uploadForm.expiryDate);
      return api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      showToast('Document uploaded', 'success');
      qc.invalidateQueries({ queryKey: ['documents'] });
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ name: '', type: 'OTHER', expiryDate: '' });
    },
    onError: (e: any) => showToast((e as any).response?.data?.message || 'Upload failed', 'error'),
  });

  const verifyMutation = useMutation<any, Error, { id: any; status: string; verifierComment?: string }>({
    mutationFn: ({ id, status, verifierComment }) => api.put(`/documents/${id}/verify`, { status, verifierComment }),
    onSuccess: () => { showToast('Document updated', 'success'); qc.invalidateQueries({ queryKey: ['documents'] }); },
  });

  const deleteMutation = useMutation<any, Error, any>({
    mutationFn: (id) => api.delete(`/documents/${id}`),
    onSuccess: () => { showToast('Document deleted', 'success'); qc.invalidateQueries({ queryKey: ['documents'] }); },
  });

  const docs = (data || []).filter((d: any) => !filter || d.type === filter);
  const isHR = ['HR', 'ADMIN'].includes(user?.role);

  const isExpiringSoon = (date: string | null): boolean => {
    if (!date) return false;
    const diff = new Date(date).getTime() - new Date().getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Documents</h1>
        <button onClick={() => setShowUpload(true)} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg font-medium">+ Upload</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setFilter('')} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!filter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
        {DOC_TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{t.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium">No documents found</p>
          <p className="text-sm mt-1">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{doc.type.replace(/_/g, ' ')}</p>
                  {isHR && doc.user && <p className="text-xs text-indigo-600 mt-0.5">{doc.user.firstName} {doc.user.lastName} • {doc.user.employeeId}</p>}
                  {doc.expiryDate && (
                    <p className={`text-xs mt-1 ${isExpiringSoon(doc.expiryDate) ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                      Expires: {new Date(doc.expiryDate).toLocaleDateString()} {isExpiringSoon(doc.expiryDate) && '⚠️'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[doc.status] || 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                  <div className="flex gap-1">
                    <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.fileUrl}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">View</a>
                    {isHR && doc.status === 'PENDING' && (
                      <>
                        <button onClick={() => verifyMutation.mutate({ id: doc.id, status: 'VERIFIED' })} className="text-xs text-green-600 ml-2 underline">Verify</button>
                        <button onClick={() => verifyMutation.mutate({ id: doc.id, status: 'REJECTED' })} className="text-xs text-red-600 ml-2 underline">Reject</button>
                      </>
                    )}
                    {(doc.userId === user?.id || isHR) && (
                      <button onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(doc.id); }} className="text-xs text-gray-400 ml-2 underline">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Upload Document</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File *</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-indigo-400">
                  {selectedFile ? selectedFile.name : 'Tap to select file'}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Document Name</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={uploadForm.name} onChange={e => setUploadForm(f => ({...f, name: e.target.value}))} placeholder="Optional — uses filename if blank" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={uploadForm.type} onChange={e => setUploadForm(f => ({...f, type: e.target.value}))}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date (optional)</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={uploadForm.expiryDate} onChange={e => setUploadForm(f => ({...f, expiryDate: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowUpload(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700">Cancel</button>
              <button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !selectedFile} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
