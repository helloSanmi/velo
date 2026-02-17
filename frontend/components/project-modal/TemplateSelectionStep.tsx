import React from 'react';
import { ProjectTemplate } from '../../types';

interface TemplateSelectionStepProps {
  templates: ProjectTemplate[];
  onSelectTemplate: (template: ProjectTemplate) => void;
}

const TemplateSelectionStep: React.FC<TemplateSelectionStepProps> = ({ templates, onSelectTemplate }) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Select a template:</p>
      <div className="space-y-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="w-full text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50"
          >
            <p className="text-sm font-medium text-slate-900">{template.name}</p>
            <p className="text-xs text-slate-600 mt-1">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelectionStep;
