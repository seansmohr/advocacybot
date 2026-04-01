import { useState, useCallback } from 'react';
import IntakeForm from './IntakeForm.jsx';
import ChatInterface from './ChatInterface.jsx';

export default function App() {
  const [phase, setPhase] = useState('intake'); // 'intake' | 'conversation'
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const streamResponse = useCallback(async (url, body, onDone) => {
    setIsStreaming(true);
    let assistantText = '';

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantText };
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      assistantText = 'Sorry, something went wrong. Please try again.';
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: assistantText };
        return updated;
      });
    }

    setIsStreaming(false);
    if (onDone) onDone(assistantText);
    return assistantText;
  }, []);

  const handleIntakeSubmit = useCallback(async (formData) => {
    // Build the user message from form data (for display)
    const grievanceLabels = { denied: 'Grievance denied', pending: 'Grievance pending', not_filed: 'No grievance filed', not_sure: 'Grievance status unknown' };
    const displayText = `Coverage: ${formData.coverageType}${formData.medicareType ? ` (${formData.medicareType})` : ''}${formData.medigapPlan ? ` — Plan ${formData.medigapPlan}` : ''}\nCarrier: ${formData.carrier || 'N/A'}\nAmount: $${formData.amount}\nAppeal/Grievance: ${grievanceLabels[formData.grievanceStatus] || formData.grievanceStatus}\n\n${formData.description}`;

    const userMsg = { role: 'user', content: displayText, isIntake: true };
    setMessages([userMsg]);
    setPhase('conversation');

    // Build the structured message for the API (stored in conversation history)
    let structuredText = `NEW CASE INTAKE:\nCoverage Type: ${formData.coverageType}\n`;
    if (formData.medicareType) structuredText += `Medicare Plan Type: ${formData.medicareType}\n`;
    if (formData.medigapPlan) structuredText += `Medigap Plan Letter: ${formData.medigapPlan}\n`;
    if (formData.carrier) structuredText += `Insurance Carrier: ${formData.carrier}\n`;
    structuredText += `Amount in Dispute: $${formData.amount}\nState: California\n\nClient Description:\n${formData.description}`;

    await streamResponse('/api/analyze', formData);
  }, [streamResponse]);

  const handleSendMessage = useCallback(async (text, images, generateAnalysis) => {
    // Build display content
    const userContent = [];
    if (images && images.length > 0) {
      userContent.push(...images.map(img => ({ type: 'thumbnail', src: img.preview })));
    }
    if (text) {
      userContent.push({ type: 'text', text });
    }

    const userMsg = {
      role: 'user',
      content: text || (generateAnalysis ? "That's everything I have — give me my action plan." : ''),
      images: images?.map(img => ({ preview: img.preview, isPdf: img.isPdf, fileName: img.fileName }))
    };

    setMessages(prev => [...prev, userMsg]);

    // Build API messages (without display-only fields)
    const apiMessages = [...messages, userMsg].map(m => {
      if (m.role === 'user' && m.images) {
        // Don't send previews to API
        return { role: 'user', content: m.content };
      }
      return { role: m.role, content: m.content };
    });

    await streamResponse('/api/followup', {
      messages: apiMessages.filter(m => m.content),
      newMessage: text,
      images: images?.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
      generateAnalysis
    });
  }, [messages, streamResponse]);

  const handleReset = useCallback(() => {
    setPhase('intake');
    setMessages([]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 leading-tight">Mohr Insurance Services</h1>
            <p className="text-xs text-slate-500">Health Advocacy</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      {phase === 'intake' ? (
        <IntakeForm onSubmit={handleIntakeSubmit} />
      ) : (
        <ChatInterface
          messages={messages}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
