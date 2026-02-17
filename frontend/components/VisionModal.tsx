import React, { useRef, useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { aiService } from '../services/aiService';
import { dialogService } from '../services/dialogService';
import Button from './ui/Button';

interface VisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksGenerated: (tasks: { title: string; description: string; subtasks: string[] }[]) => void;
  activeProjectName?: string;
  activeStageNames?: string[];
}

const VisionModal: React.FC<VisionModalProps> = ({ isOpen, onClose, onTasksGenerated, activeProjectName, activeStageNames }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!previewUrl) return;
    setIsProcessing(true);
    try {
      const base64Data = previewUrl.split(',')[1];
      const mimeType = previewUrl.split(',')[0].split(':')[1].split(';')[0];
      const tasks = await aiService.parseImageToTasks(base64Data, mimeType, {
        projectName: activeProjectName,
        stageNames: activeStageNames
      });
      if (tasks.length > 0) {
        onTasksGenerated(tasks);
        onClose();
      } else {
        await dialogService.notice('AI could not detect tasks in this image.', { title: 'No tasks detected' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-none md:rounded-xl shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[86vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Image to Tasks</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 md:p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {!previewUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[220px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-3 text-slate-600 hover:bg-slate-50"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">Upload image</span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </button>
          ) : (
            <>
              <img src={previewUrl} className="w-full h-60 object-cover rounded-lg border border-slate-200" alt="Preview" />
              <div className="flex gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <p>AI will analyze this image and extract tasks and subtasks for {activeProjectName || 'your workspace'}.</p>
              </div>
              <div className="flex gap-2 pb-1">
                <Button variant="outline" className="flex-1" onClick={() => setPreviewUrl(null)}>Choose another image</Button>
                <Button className="flex-1" onClick={processImage} isLoading={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Extract Tasks'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisionModal;
