import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import DocumentUpload from './DocumentUpload.jsx';
import CaseAnalysis from './CaseAnalysis.jsx';

function parseDocRequests(text) {
  const parts = [];
  let remaining = text;
  const regex = /```docrequest\s*\n([\s\S]*?)\n```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before the doc request
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Parse the doc request JSON
    try {
      const doc = JSON.parse(match[1].trim());
      parts.push({ type: 'docrequest', document: doc.document, reason: doc.reason });
    } catch {
      parts.push({ type: 'text', content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

function isFullAnalysis(text) {
  // Check if the message contains the full case analysis sections
  return text.includes('## 1. Case Analysis Summary') && text.includes('## 5. Draft Appeal Letter');
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full"></div>
      <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full"></div>
      <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full"></div>
    </div>
  );
}

// Make phone numbers tappable in markdown
function processPhoneNumbers(text) {
  return text.replace(
    /(\d-\d{3}-\d{3}-\d{4})/g,
    '[$1](tel:$1)'
  );
}

function MessageBubble({ message, onUpload, onSkip }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%]">
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-end mb-2">
              {message.images.map((img, i) => (
                <img key={i} src={img.preview} alt="Uploaded document" className="w-20 h-20 object-cover rounded-lg border" />
              ))}
            </div>
          )}
          {message.content && (
            <div className="bg-brand-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-base">
              {message.isIntake ? (
                <pre className="whitespace-pre-wrap font-sans text-sm">{message.content}</pre>
              ) : (
                message.content
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  const content = message.content || '';

  // Check if this is a full analysis
  if (isFullAnalysis(content)) {
    return (
      <div className="mb-4">
        <CaseAnalysis content={content} onReset={() => {}} />
      </div>
    );
  }

  const parts = parseDocRequests(content);

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%]">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <div className="space-y-2">
            {parts.map((part, i) => {
              if (part.type === 'docrequest') {
                return (
                  <DocumentUpload
                    key={i}
                    documentName={part.document}
                    reason={part.reason}
                    onUpload={onUpload}
                    onSkip={onSkip}
                  />
                );
              }
              return (
                <div key={i} className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-100 text-base text-slate-800">
                  <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => {
                          if (href?.startsWith('tel:')) {
                            return <a href={href} className="text-brand-600 font-medium underline">{children}</a>;
                          }
                          return <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{children}</a>;
                        },
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
                      }}
                    >
                      {processPhoneNumbers(part.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ messages, isStreaming, onSendMessage, onReset }) {
  const [inputText, setInputText] = useState('');
  const [pendingImages, setPendingImages] = useState([]);
  const chatEndRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const [hasExchanged, setHasExchanged] = useState(false);

  // Track when user has had at least one exchange after initial analysis
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 1) setHasExchanged(true);
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (isStreaming) return;
    if (!inputText.trim() && pendingImages.length === 0) return;

    onSendMessage(inputText.trim(), pendingImages.length > 0 ? pendingImages : undefined, false);
    setInputText('');
    setPendingImages([]);
  }, [inputText, pendingImages, isStreaming, onSendMessage]);

  const handleDocUpload = useCallback((processed, docName) => {
    onSendMessage(`Here is my ${docName}`, processed, false);
  }, [onSendMessage]);

  const handleDocSkip = useCallback((docName) => {
    onSendMessage(`I don't have my ${docName}`, undefined, false);
  }, [onSendMessage]);

  const handleGenerateAnalysis = useCallback(() => {
    onSendMessage("That's everything I have — please give me my full action plan.", undefined, true);
  }, [onSendMessage]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (files.length === 0) return;

    const processed = [];
    for (const file of files) {
      const result = await new Promise((resolve) => {
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
          resolve({
            base64: canvas.toDataURL('image/jpeg', 0.8).split(',')[1],
            mediaType: 'image/jpeg',
            preview: canvas.toDataURL('image/jpeg', 0.3)
          });
        };
        img.src = url;
      });
      processed.push(result);
    }
    setPendingImages(prev => [...prev, ...processed].slice(0, 5));
    // Reset file input
    e.target.value = '';
  };

  const removePendingImage = (index) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if latest assistant message is a full analysis
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const showingAnalysis = lastAssistant && isFullAnalysis(lastAssistant.content);

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            onUpload={handleDocUpload}
            onSkip={handleDocSkip}
          />
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md px-2 py-1 shadow-sm border border-slate-100">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}

        {/* Generate full analysis button */}
        {hasExchanged && !isStreaming && !showingAnalysis && (
          <div className="flex justify-center my-4">
            <button
              onClick={handleGenerateAnalysis}
              className="py-3 px-6 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors shadow-lg shadow-green-600/25"
            >
              That's everything — give me my action plan
            </button>
          </div>
        )}

        {/* Reset button after analysis */}
        {showingAnalysis && !isStreaming && (
          <div className="flex justify-center my-4">
            <button
              onClick={onReset}
              className="py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              Start a New Case
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      {!showingAnalysis && (
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="max-w-3xl mx-auto">
            {/* Pending image previews */}
            {pendingImages.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.preview} alt="Pending" className="w-16 h-16 object-cover rounded-lg border" />
                    <button
                      onClick={() => removePendingImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isStreaming}
                className="p-2.5 text-slate-400 hover:text-brand-600 transition-colors disabled:opacity-50"
                title="Upload photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 p-3 border border-slate-200 rounded-xl resize-none focus:border-brand-600 focus:outline-none disabled:bg-slate-50 text-base"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isStreaming || (!inputText.trim() && pendingImages.length === 0)}
                className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
