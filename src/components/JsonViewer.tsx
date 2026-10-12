import React, { useState } from 'react';
import { Copy, Check, Code, FileDown, Layers, Terminal } from 'lucide-react';
import { ProcessGSTR1Result } from '../engine/gstEngine';
import { downloadSingleGstr1Json } from '../utils/exportUtils';

interface JsonViewerProps {
  result: ProcessGSTR1Result;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  const json = result.gstr1_json;
  const sections = Object.keys(json);

  const displayedJson = selectedSection === 'ALL'
    ? json
    : { gstin: json.gstin, fp: json.fp, [selectedSection]: json[selectedSection] };

  const jsonString = JSON.stringify(displayedJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.gstr1_json_str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">GSTR-1 Offline JSON Payload</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            {jsonString.split('\n').length} lines
          </span>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedSection('ALL')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
              selectedSection === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            All Payload
          </button>
          {sections.filter(s => s !== 'gstin' && s !== 'fp').map(sec => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                selectedSection === sec
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Copy & Download */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={() => downloadSingleGstr1Json(result)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download .json</span>
          </button>
        </div>
      </div>

      {/* Code Editor Window */}
      <div className="relative rounded-xl border border-slate-800 bg-[#070b12] overflow-hidden shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 text-slate-400 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-2 font-mono text-slate-500">
              GSTR1_{result.seller_gstin}_{result.filing_period}.json
            </span>
          </div>
          <span className="text-slate-500">JSON Format • UTF-8</span>
        </div>

        <pre className="p-4 overflow-x-auto max-h-[550px] text-slate-200 leading-relaxed font-mono">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
};
