import React from 'react';
import IntegrationConnectionCard from './IntegrationConnectionCard';
import { IntegrationCardModel } from './types';

interface IntegrationConnectionsGridProps {
  cards: IntegrationCardModel[];
  githubRepo: string;
  setGithubRepo: (value: string) => void;
  slackChannel: string;
  setSlackChannel: (value: string) => void;
  slackConnected: boolean;
  githubConnected: boolean;
  onSaveSlackChannel: () => void;
  onSaveGitHubRepo: () => void;
}

const IntegrationConnectionsGrid: React.FC<IntegrationConnectionsGridProps> = ({
  cards,
  githubRepo,
  setGithubRepo,
  slackChannel,
  setSlackChannel,
  slackConnected,
  githubConnected,
  onSaveSlackChannel,
  onSaveGitHubRepo
}) => {
  if (cards.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
        No integrations match these filters.
      </div>
    );
  }

  return (
    <div className="md:max-h-[62vh] overflow-y-auto custom-scrollbar pr-1">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <IntegrationConnectionCard
            key={card.id}
            card={card}
            githubRepo={githubRepo}
            setGithubRepo={setGithubRepo}
            slackChannel={slackChannel}
            setSlackChannel={setSlackChannel}
            slackConnected={slackConnected}
            githubConnected={githubConnected}
            onSaveSlackChannel={onSaveSlackChannel}
            onSaveGitHubRepo={onSaveGitHubRepo}
          />
        ))}
      </div>
    </div>
  );
};

export default IntegrationConnectionsGrid;
