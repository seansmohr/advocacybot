import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function CaseAnalysis({ content, onReset }) {
  const [copied, setCopied] = useState(false);

  // Extract appeal letter section (flexible heading match)
  const appealMatch = content.match(/##\s*\d[\.\):]?\s*Draft Appeal.*?\n([\s\S]*?)(?=##\s*\d[\.\):]?\s|$)/);
  const appealLetter = appealMatch ? appealMatch[1].trim() : null;

  const copyLetter = () => {
    if (appealLetter) {
      navigator.clipboard.writeText(appealLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Make phone numbers tappable
  const processContent = (text) => {
    return text.replace(
      /(\d-\d{3}-\d{3}-\d{4})/g,
      '[$1](tel:$1)'
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 my-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 text-lg">✓</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Your Case Analysis & Action Plan</h2>
      </div>

      <div className="prose prose-slate max-w-none prose-headings:text-brand-700 prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2 prose-h2:mt-8">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith('tel:')) {
                return <a href={href} className="text-brand-600 font-medium underline">{children}</a>;
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{children}</a>;
            }
          }}
        >
          {processContent(content)}
        </ReactMarkdown>
      </div>

      {appealLetter && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={copyLetter}
            className="py-2 px-4 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Appeal Letter'}
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-200">
        <button
          onClick={onReset}
          className="w-full py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          Start a New Case
        </button>
      </div>
    </div>
  );
}
