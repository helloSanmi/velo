import React from 'react';
import { IntakeTicket, Project, User } from '../../types';
import TicketCreateModal from './TicketCreateModal';
import TicketDetailPane from './TicketDetailPane';
import TicketsListPane from './TicketsListPane';
import TicketsRouteHeader from './TicketsRouteHeader';
import TicketsSidebar from './TicketsSidebar';
import { STATUS_OPTIONS } from './ticketConstants';
import { useTicketsController } from './hooks/useTicketsController';

interface TicketsViewProps {
  orgId: string;
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  onRefreshTasks: () => void;
  routeTicketId?: string | null;
  onOpenTicketRoute?: (ticketId: string | null) => void;
}

const TicketsView: React.FC<TicketsViewProps> = (props) => {
  const controller = useTicketsController(props);

  return (
    <div className="flex-1 overflow-hidden bg-[#f7f3f6] p-4 md:p-6">
      <div className={`mx-auto flex h-full flex-col gap-3 ${controller.isSingleTicketRoute ? 'max-w-[1900px]' : 'max-w-[1600px]'}`}>
        {controller.isSingleTicketRoute ? (
          <TicketsRouteHeader
            selectedTicket={controller.selectedTicket}
            loading={controller.loading}
            onBack={() => controller.openTicketRoute(null)}
            onRefresh={() => void controller.loadTickets()}
            onCreate={() => controller.setIsCreateModalOpen(true)}
          />
        ) : null}

        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className={`grid h-full min-h-0 ${controller.isSingleTicketRoute ? 'grid-cols-1' : 'xl:grid-cols-[220px_1fr] grid-cols-1'}`}>
            {!controller.isSingleTicketRoute ? (
              <TicketsSidebar
                query={controller.query}
                onQueryChange={controller.setQuery}
                statusFilter={controller.statusFilter}
                setStatusFilter={controller.setStatusFilter}
                setProjectFilter={controller.setProjectFilter}
                currentUserDisplayName={props.currentUser.displayName}
                currentUserEmail={props.currentUser.email}
                setQuery={controller.setQuery}
                analyticsTotal={controller.analytics.total}
                newCount={controller.viewCounts.newCount}
                inProgressCount={controller.viewCounts.inProgress}
                resolvedCount={controller.viewCounts.resolved}
                closedCount={controller.viewCounts.closed}
                convertedCount={controller.viewCounts.converted}
                myAssignedCount={controller.viewCounts.mine}
                raisedCount={controller.viewCounts.raised}
              />
            ) : null}

            {!controller.isSingleTicketRoute ? (
              <TicketsListPane
                loading={controller.loading}
                quickViewLabel={controller.quickViewLabel}
                filteredTicketsLength={controller.filteredTickets.length}
                statusFilter={controller.statusFilter}
                onStatusFilterChange={controller.setStatusFilter}
                statusOptions={STATUS_OPTIONS}
                projectFilter={controller.projectFilter}
                onProjectFilterChange={controller.setProjectFilter}
                projectOptions={controller.projectOptions}
                filteredTickets={controller.filteredTickets}
                sortedTickets={controller.sortedTickets}
                selectedTicketId={controller.selectedTicketId}
                allUsers={props.allUsers}
                onOpenTicketRoute={(ticketId) => controller.openTicketRoute(ticketId)}
                tableWrapRef={controller.tableWrapRef}
                tableSort={controller.tableSort}
                setTableSort={controller.setTableSort}
                columnWidths={controller.columnWidths}
                onStartResize={({ event, key, nextKey }) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const wrapWidth = controller.tableWrapRef.current?.getBoundingClientRect().width || 0;
                  controller.resizeStateRef.current = {
                    key,
                    nextKey,
                    startX: event.clientX,
                    startCurrent: controller.columnWidths[key],
                    startNext: controller.columnWidths[nextKey],
                    wrapWidth
                  };
                }}
              />
            ) : null}

            {controller.isSingleTicketRoute ? (
              <main className="min-h-0 overflow-y-auto">
                <TicketDetailPane
                  selectedTicket={controller.selectedTicket}
                  busyId={controller.busyId}
                  setComposerMode={(mode) => {
                    controller.setComposerMode(mode);
                    window.setTimeout(() => controller.composerInputRef.current?.focus(), 0);
                  }}
                  composerMode={controller.composerMode}
                  setIsActionsMenuOpen={controller.setIsActionsMenuOpen}
                  isActionsMenuOpen={controller.isActionsMenuOpen}
                  actionsMenuRef={controller.actionsMenuRef}
                  onClose={() =>
                    controller.selectedTicket &&
                    void controller.updateTicket(controller.selectedTicket.id, { status: 'closed' })
                  }
                  onConvert={() => {
                    if (!controller.selectedTicket) return;
                    controller.setIsActionsMenuOpen(false);
                    void controller.convertTicket(controller.selectedTicket as IntakeTicket);
                  }}
                  onDelete={() => {
                    if (!controller.selectedTicket) return;
                    controller.setIsActionsMenuOpen(false);
                    void controller.deleteTicket(controller.selectedTicket.id);
                  }}
                  commentStatus={controller.commentStatus}
                  setCommentStatus={controller.setCommentStatus}
                  commentStartAt={controller.commentStartAt}
                  setCommentStartAt={controller.setCommentStartAt}
                  canManageSelectedTicket={controller.canManageSelectedTicket}
                  forwardTarget={controller.forwardTarget}
                  setForwardTarget={controller.setForwardTarget}
                  commentText={controller.commentText}
                  setCommentText={controller.setCommentText}
                  composerInputRef={controller.composerInputRef}
                  onSubmit={() => void controller.submitCommentAction()}
                  createStatusOptions={controller.createStatusOptions}
                  createProjectOptions={controller.createProjectOptions}
                  assigneeOptions={controller.assigneeOptions}
                  onUpdateTicket={(patch) =>
                    controller.selectedTicket && void controller.updateTicket(controller.selectedTicket.id, patch)
                  }
                />
              </main>
            ) : null}
          </div>
        </section>
      </div>

      <TicketCreateModal
        currentUser={props.currentUser}
        busyId={controller.busyId}
        isOpen={controller.isCreateModalOpen}
        title={controller.draftTitle}
        description={controller.draftDescription}
        status={controller.draftStatus}
        priority={controller.draftPriority}
        projectId={controller.draftProjectId}
        assigneeId={controller.draftAssigneeId}
        tags={controller.draftTags}
        canManageDraftTriageFields={controller.canManageDraftTriageFields}
        createStatusOptions={controller.createStatusOptions}
        createProjectOptions={controller.createProjectOptions}
        createAssigneeOptions={controller.createAssigneeOptions}
        onClose={() => controller.setIsCreateModalOpen(false)}
        onCreate={() => void controller.createTicket()}
        onTitleChange={controller.setDraftTitle}
        onDescriptionChange={controller.setDraftDescription}
        onStatusChange={controller.setDraftStatus}
        onPriorityChange={controller.setDraftPriority}
        onProjectChange={controller.setDraftProjectId}
        onAssigneeChange={controller.setDraftAssigneeId}
        onTagsChange={controller.setDraftTags}
      />
    </div>
  );
};

export default TicketsView;
