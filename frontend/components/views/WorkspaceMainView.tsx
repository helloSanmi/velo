import React from 'react';
import WorkspaceViewRenderer from './workspace-main/WorkspaceViewRenderer';
import { useWorkspaceScopedData } from './workspace-main/useWorkspaceScopedData';
import { WorkspaceMainViewProps } from './workspace-main/types';

const WorkspaceMainView: React.FC<WorkspaceMainViewProps> = (props) => {
  const scoped = useWorkspaceScopedData(props);
  return <WorkspaceViewRenderer props={props} scoped={scoped} />;
};

export default WorkspaceMainView;

