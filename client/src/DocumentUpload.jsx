import { useRef, useState } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
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

export default function DocumentUpload({ onUpload, onSkip, documentName, reason }) {
  const fileRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_FILES);
    if (files.length === 0) return;

    setProcessing(true);
    const processed = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(heic|pdf)$/i)) continue;
      const result = await processFile(file);
      processed.push(result);
    }
    setPreviews(processed.map(p => p.isPdf ? 'pdf' : p.preview));
    setProcessing(false);

    if (processed.length > 0) {
      onUpload(processed, documentName);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 my-2 max-w-sm">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">📄</span>
        <div>
          <div className="font-semibold text-slate-800">{documentName}</div>
          {reason && <div className="text-sm text-slate-500 mt-0.5">{reason}</div>}
        </div>
      </div>

      {previews.length > 0 ? (
        <div className="flex gap-2 flex-wrap mb-3">
          {previews.map((src, i) => (
            src === 'pdf' ? (
              <div key={i} className="w-20 h-20 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">PDF</span>
              </div>
            ) : (
              <img key={i} src={src} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
            )
          ))}
          <p className="text-sm text-green-600 font-medium w-full">Uploaded! Sending for analysis...</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={processing}
            className="flex-1 py-2.5 px-4 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors disabled:bg-slate-300"
          >
            {processing ? 'Processing...' : '📷 Upload Photo/PDF'}
          </button>
          <button
            type="button"
            onClick={() => onSkip(documentName)}
            className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            I don't have this
          </button>
        </div>
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
