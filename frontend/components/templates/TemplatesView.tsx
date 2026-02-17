import React from 'react';
import { ProjectTemplate } from '../../types';

interface TemplatesViewProps {
  templateQuery: string;
  setTemplateQuery: (value: string) => void;
  templates: ProjectTemplate[];
  onUseTemplate: (templateId: string) => void;
}

const TemplatesView: React.FC<TemplatesViewProps> = ({
  templateQuery,
  setTemplateQuery,
  templates,
  onUseTemplate
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900">Templates</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-1">Start faster with predefined project structures.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <input
            value={templateQuery}
            onChange={(event) => setTemplateQuery(event.target.value)}
            placeholder="Filter templates"
            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
          />
          {templates.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              No templates match your filter.
            </div>
          ) : (
            <div className="md:max-h-[62vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
                    <p className="text-sm text-slate-600 mt-1 flex-1">{template.description}</p>
                    <button
                      onClick={() => onUseTemplate(template.id)}
                      className="mt-4 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      Use template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesView;
