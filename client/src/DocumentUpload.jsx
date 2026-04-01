import { useRef, useState } from 'react';

const MAX_FILES = 15;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

function processFile(file) {
  if (file.type === 'application/pdf') {
    return fileToBase64(file).then(base64 => ({
      base64,
      mediaType: 'application/pdf',
      preview: null,
      isPdf: true,
      fileName: file.name
    }));
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let scale = 1;
      const maxDim = 2048;
      if (img.width > maxDim || img.height > maxDim) {
        scale = maxDim / Math.max(img.width, img.height);
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      resolve({ base64, mediaType: 'image/jpeg', preview: canvas.toDataURL('image/jpeg', 0.3) });
    };
    img.src = url;
  });
}

export default function DocumentUpload({ onUpload, disabled }) {
  const fileRef = useRef(null);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessing(true);
    const newFiles = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(heic|pdf)$/i)) continue;
      const result = await processFile(file);
      if (!result.fileName) result.fileName = file.name;
      newFiles.push(result);
    }
    setStagedFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
    setProcessing(false);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (stagedFiles.length === 0) return;
    onUpload(stagedFiles);
    setStagedFiles([]);
  };

  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-4 my-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📎</span>
        <span className="font-semibold text-slate-700 text-sm">Upload your documents</span>
        <span className="text-xs text-slate-400">(photos or PDFs — up to {MAX_FILES} files)</span>
      </div>

      {/* Staged file previews */}
      {stagedFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {stagedFiles.map((file, i) => (
            <div key={i} className="relative group">
              {file.isPdf ? (
                <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-red-600 text-xs font-bold">PDF</span>
                  <span className="text-red-400 text-[8px] truncate max-w-[52px] px-1">{file.fileName}</span>
                </div>
              ) : (
                <img src={file.preview} alt="Document" className="w-16 h-16 object-cover rounded-lg border" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || processing || stagedFiles.length >= MAX_FILES}
          className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors disabled:bg-slate-100 disabled:text-slate-400"
        >
          {processing ? 'Processing...' : stagedFiles.length > 0 ? '+ Add more files' : 'Select files'}
        </button>
        {stagedFiles.length > 0 && (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled}
            className="py-2.5 px-5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors disabled:bg-slate-300"
          >
            Send {stagedFiles.length} {stagedFiles.length === 1 ? 'file' : 'files'} for review
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
