import { useRef, useState } from 'react';

const MAX_FILES = 10;
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

export default function DocumentUpload({ onUpload, onSkip, onTypeIn, documentName, reason }) {
  const fileRef = useRef(null);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [sent, setSent] = useState(false);

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
    onUpload(stagedFiles, documentName);
    setSent(true);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 my-2 max-w-md">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">📄</span>
        <div>
          <div className="font-semibold text-slate-800">{documentName}</div>
          {reason && <div className="text-sm text-slate-500 mt-0.5">{reason}</div>}
        </div>
      </div>

      {sent ? (
        <div className="flex gap-2 flex-wrap mb-1">
          {stagedFiles.map((file, i) => (
            file.isPdf ? (
              <div key={i} className="w-16 h-16 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center">
                <span className="text-red-600 text-xs font-bold">PDF</span>
                <span className="text-red-400 text-[8px] truncate max-w-[52px] px-1">{file.fileName}</span>
              </div>
            ) : (
              <img key={i} src={file.preview} alt="Document" className="w-16 h-16 object-cover rounded-lg border" />
            )
          ))}
          <p className="text-sm text-green-600 font-medium w-full mt-1">Sent for analysis!</p>
        </div>
      ) : (
        <>
          {/* Staged file previews */}
          {stagedFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {stagedFiles.map((file, i) => (
                <div key={i} className="relative group">
                  {file.isPdf ? (
                    <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-red-600 text-[10px] font-bold">PDF</span>
                      <span className="text-red-400 text-[7px] truncate max-w-[46px] px-0.5">{file.fileName}</span>
                    </div>
                  ) : (
                    <img src={file.preview} alt="Document" className="w-14 h-14 object-cover rounded-lg border" />
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {stagedFiles.length > 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing || stagedFiles.length >= MAX_FILES}
                  className="flex-1 py-2 px-3 bg-slate-100 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  + Add more
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex-1 py-2 px-3 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors"
                >
                  Send {stagedFiles.length} {stagedFiles.length === 1 ? 'file' : 'files'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                  className="flex-1 py-2.5 px-3 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors disabled:bg-slate-300"
                >
                  {processing ? 'Processing...' : 'Upload photos or PDFs'}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onTypeIn(documentName)}
                className="flex-1 py-2 px-3 bg-slate-50 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-100 transition-colors border border-slate-200"
              >
                I'll type what it says
              </button>
              <button
                type="button"
                onClick={() => onSkip(documentName)}
                className="flex-1 py-2 px-3 bg-slate-50 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-100 transition-colors border border-slate-200"
              >
                I don't have this
              </button>
            </div>
            {stagedFiles.length === 0 && (
              <p className="text-xs text-slate-400 mt-0.5">You can upload multiple files at once (e.g., several EOBs or pages)</p>
            )}
          </div>
        </>
      )}

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
