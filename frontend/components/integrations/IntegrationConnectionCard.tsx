import React from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { IntegrationCardModel } from './types';

interface IntegrationConnectionCardProps {
  card: IntegrationCardModel;
  githubRepo: string;
  setGithubRepo: (value: string) => void;
  slackChannel: string;
  setSlackChannel: (value: string) => void;
  slackConnected: boolean;
  githubConnected: boolean;
  onSaveSlackChannel: () => void;
  onSaveGitHubRepo: () => void;
}

const IntegrationConnectionCard: React.FC<IntegrationConnectionCardProps> = ({
  card,
  githubRepo,
  setGithubRepo,
  slackChannel,
  setSlackChannel,
  slackConnected,
  githubConnected,
  onSaveSlackChannel,
  onSaveGitHubRepo
}) => {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">{card.icon}</div>
        <Badge variant={card.enabled ? 'emerald' : 'neutral'}>
          {card.enabled ? 'Connected' : 'Not Connected'}
        </Badge>
      </div>
      <div>
        <h3 className="text-base font-semibold">{card.name}</h3>
        <p className="text-sm text-slate-600 mt-1">{card.description}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Workspace: {card.workspaceConnected ? `Connected${card.workspaceLabel ? ` (${card.workspaceLabel})` : ''}` : 'Not connected'}
        </p>
      </div>

      {card.id === 'slack' ? (
        <label className="block">
          <span className="text-[11px] text-slate-500">Channel</span>
          <input
            value={slackChannel}
            onChange={(event) => setSlackChannel(event.target.value)}
            onBlur={onSaveSlackChannel}
            placeholder="general"
            disabled={!slackConnected}
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
      ) : null}

      {card.id === 'github' ? (
        <label className="block">
          <span className="text-[11px] text-slate-500">Repository</span>
          <input
            value={githubRepo}
            onChange={(event) => setGithubRepo(event.target.value)}
            onBlur={onSaveGitHubRepo}
            placeholder="org/repository"
            disabled={!githubConnected}
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
      ) : null}

      <Button
        onClick={card.onClick}
        variant={card.workspaceConnected ? (card.enabled ? 'outline' : 'primary') : 'primary'}
        isLoading={card.isConnecting}
        className="w-full"
      >
        {card.actionLabel}
      </Button>
    </article>
  );
};

export default IntegrationConnectionCard;
