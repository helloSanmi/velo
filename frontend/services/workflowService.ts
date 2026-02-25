import { WorkflowRule, WorkflowTrigger, WorkflowAction, Task, ProjectTemplate, TaskPriority, TaskStatus } from '../types';
import { createId } from '../utils/id';
import { apiRequest } from './apiClient';

const WORKFLOWS_KEY = 'velo_workflows';

const readAllRules = (): WorkflowRule[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(WORKFLOWS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const workflowService = {
  getRules: async (orgId: string): Promise<WorkflowRule[]> => {
    const localOrgRules = readAllRules().filter((rule) => rule.orgId === orgId);
    try {
      const remote = await apiRequest<WorkflowRule[]>(`/orgs/${orgId}/workflows`);
      if (remote.length === 0 && localOrgRules.length > 0) {
        for (const localRule of localOrgRules) {
          try {
            await apiRequest<WorkflowRule>(`/orgs/${orgId}/workflows`, {
              method: 'POST',
              body: {
                projectId: localRule.projectId,
                name: localRule.name,
                trigger: localRule.trigger,
                triggerValue: localRule.triggerValue,
                action: localRule.action,
                actionValue: localRule.actionValue,
                isActive: localRule.isActive
              }
            });
          } catch {
            // Ignore backfill failures per rule (permission/network)
          }
        }
        const hydrated = await apiRequest<WorkflowRule[]>(`/orgs/${orgId}/workflows`);
        localStorage.setItem(WORKFLOWS_KEY, JSON.stringify([
          ...readAllRules().filter((rule) => rule.orgId !== orgId),
          ...hydrated
        ]));
        return hydrated;
      }
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify([
        ...readAllRules().filter((rule) => rule.orgId !== orgId),
        ...remote
      ]));
      return remote;
    } catch {
      // Fallback for offline/local mode
    }
    return localOrgRules;
  },

  getRulesForProject: (orgId: string, projectId?: string): WorkflowRule[] => {
    const all = readAllRules().filter((rule) => rule.orgId === orgId);
    if (!projectId) return all;
    return all.filter((rule) => !rule.projectId || rule.projectId === projectId);
  },

  saveRule: async (rule: Omit<WorkflowRule, 'id'>): Promise<WorkflowRule> => {
    try {
      const created = await apiRequest<WorkflowRule>(`/orgs/${rule.orgId}/workflows`, {
        method: 'POST',
        body: rule
      });
      const all = readAllRules().filter((entry) => !(entry.orgId === created.orgId && entry.id === created.id));
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify([...all, created]));
      return created;
    } catch {
      // Fallback for offline/local mode
    }
    const all = readAllRules();
    const newRule = { ...rule, id: createId() };
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify([...all, newRule]));
    return newRule;
  },

  deleteRule: async (orgId: string, id: string): Promise<void> => {
    try {
      await apiRequest(`/orgs/${orgId}/workflows/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback for offline/local mode
    }
    const all = readAllRules();
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(all.filter(r => !(r.id === id && r.orgId === orgId))));
  },

  toggleRule: async (orgId: string, id: string): Promise<WorkflowRule | null> => {
    const all = readAllRules();
    const existing = all.find((rule) => rule.orgId === orgId && rule.id === id);
    if (!existing) return null;
    try {
      const updated = await apiRequest<WorkflowRule>(`/orgs/${orgId}/workflows/${id}`, {
        method: 'PATCH',
        body: { isActive: !existing.isActive }
      });
      localStorage.setItem(
        WORKFLOWS_KEY,
        JSON.stringify(all.map((rule) => (rule.id === id && rule.orgId === orgId ? updated : rule)))
      );
      return updated;
    } catch {
      // Fallback for offline/local mode
    }
    localStorage.setItem(
      WORKFLOWS_KEY,
      JSON.stringify(all.map(r => (r.id === id && r.orgId === orgId ? { ...r, isActive: !r.isActive } : r)))
    );
    const updatedLocal = readAllRules().find((rule) => rule.orgId === orgId && rule.id === id);
    return updatedLocal || null;
  },

  getTemplates: (): ProjectTemplate[] => [
    {
      id: 'tmpl-dev',
      name: 'Software Lifecycle',
      description: 'Standard Agile sprint board with QA and Deploy readiness.',
      icon: 'Terminal',
      tasks: [
        { title: 'Environment Setup', description: 'Configure repositories, environments, and access controls.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Ops'] },
        { title: 'Sprint Backlog Review', description: 'Refine stories, acceptance criteria, and owner assignments.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Planning'] },
        { title: 'Architecture Review', description: 'Validate technical design and integration boundaries.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Architecture'] },
        { title: 'Core Feature Implementation', description: 'Develop MVP scope for the sprint release.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Build'] },
        { title: 'QA Test Plan', description: 'Define regression and critical-path test cases.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['QA'] },
        { title: 'Release Readiness Check', description: 'Confirm release notes, migration steps, and rollback plan.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Release'] },
        { title: 'API Documentation', description: 'Update API contracts and usage examples.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Docs'] }
      ]
    },
    {
      id: 'tmpl-mkt',
      name: 'Marketing Launch',
      description: 'Coordinated campaign tracking from design to PR.',
      icon: 'Zap',
      tasks: [
        { title: 'Launch Strategy Brief', description: 'Define audience, messaging pillars, and goals.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Strategy'] },
        { title: 'Brand Kit Audit', description: 'Validate campaign visuals against current brand system.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Design'] },
        { title: 'Landing Page Copy', description: 'Draft value proposition and conversion-focused copy.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Content'] },
        { title: 'Press Release Draft', description: 'Prepare PR narrative and spokesperson quotes.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['PR'] },
        { title: 'Social Asset Creation', description: 'Produce social graphics and short-form creatives.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Design'] },
        { title: 'Campaign QA', description: 'Verify links, tracking parameters, and schedule.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['QA'] },
        { title: 'Performance Review', description: 'Analyze CTR, leads, and CAC after launch week.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Analytics'] }
      ]
    },
    {
      id: 'tmpl-hr',
      name: 'Executive Onboarding',
      description: 'Streamline the first 30 days for new senior hires.',
      icon: 'Users',
      tasks: [
        { title: 'Offer Finalization', description: 'Confirm signed documents and start-date checklist.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['HR'] },
        { title: 'Access Provisioning', description: 'Provision accounts, permissions, and security tools.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Security'] },
        { title: 'Welcome Brief', description: 'Share company context, strategy, and current priorities.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['HR'] },
        { title: 'Leadership Introductions', description: 'Schedule key stakeholder and team 1:1 meetings.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Leadership'] },
        { title: '30-Day Objectives', description: 'Define measurable outcomes for the first month.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Planning'] },
        { title: 'Feedback Checkpoint', description: 'Run onboarding feedback and adjustment session.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['People'] }
      ]
    },
    {
      id: 'tmpl-sales',
      name: 'Sales Pipeline Sprint',
      description: 'Drive qualified pipeline generation and close readiness.',
      icon: 'TrendingUp',
      tasks: [
        { title: 'Target Account List', description: 'Finalize ICP-fit account and contact list.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Prospecting'] },
        { title: 'Outreach Sequence Setup', description: 'Configure email and call sequences for reps.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Enablement'] },
        { title: 'Discovery Call Script', description: 'Refine qualification framework and objection handling.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Process'] },
        { title: 'Demo Environment Prep', description: 'Prepare role-based demo assets and narratives.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Demo'] },
        { title: 'Pipeline Review Cadence', description: 'Set weekly forecast and deal-risk reviews.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Forecast'] },
        { title: 'Close Plan Templates', description: 'Create standardized close plans for late-stage deals.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Closing'] }
      ]
    },
    {
      id: 'tmpl-customer-success',
      name: 'Customer Success Rollout',
      description: 'Standard onboarding and adoption workflow for new customers.',
      icon: 'HeartHandshake',
      tasks: [
        { title: 'Kickoff Call Scheduling', description: 'Confirm customer stakeholders and kickoff agenda.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Onboarding'] },
        { title: 'Implementation Plan', description: 'Document milestones, owners, and timeline commitments.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Planning'] },
        { title: 'Platform Configuration', description: 'Configure core settings according to customer requirements.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Setup'] },
        { title: 'Admin Training Session', description: 'Run admin enablement session with documentation.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Training'] },
        { title: 'Adoption Checkpoint', description: 'Review usage metrics and address blockers.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Adoption'] },
        { title: 'Success Review', description: 'Capture outcomes, risks, and expansion opportunities.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Health'] }
      ]
    },
    {
      id: 'tmpl-product-discovery',
      name: 'Product Discovery',
      description: 'Validate problem space and shape the next product release.',
      icon: 'Lightbulb',
      tasks: [
        { title: 'Problem Statement', description: 'Define target user problem and expected impact.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Discovery'] },
        { title: 'Research Plan', description: 'Select methods, sample, and interview cadence.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Research'] },
        { title: 'User Interviews', description: 'Run interviews and synthesize insights.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['UX'] },
        { title: 'Opportunity Mapping', description: 'Prioritize opportunities based on value and effort.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Prioritization'] },
        { title: 'Solution Concepts', description: 'Create concept options and test hypotheses.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Ideation'] },
        { title: 'Recommendation Readout', description: 'Present validated direction and next steps.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Stakeholders'] }
      ]
    },
    {
      id: 'tmpl-security-audit',
      name: 'Security Audit Cycle',
      description: 'Quarterly security review and remediation execution.',
      icon: 'ShieldCheck',
      tasks: [
        { title: 'Scope and Assets Inventory', description: 'Confirm systems, data flows, and ownership.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Security'] },
        { title: 'Vulnerability Scan', description: 'Run automated scan across production and staging.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Vulnerability'] },
        { title: 'Access Review', description: 'Audit privileged roles and stale credentials.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Access'] },
        { title: 'Risk Prioritization', description: 'Rank findings by impact and exploitability.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Risk'] },
        { title: 'Remediation Sprint', description: 'Implement fixes for high and medium findings.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Remediation'] },
        { title: 'Compliance Report', description: 'Publish audit summary and closure status.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Compliance'] }
      ]
    },
    {
      id: 'tmpl-event',
      name: 'Event Operations',
      description: 'End-to-end planning and execution for team events.',
      icon: 'CalendarDays',
      tasks: [
        { title: 'Event Brief', description: 'Define event goals, audience, and format.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Planning'] },
        { title: 'Budget and Vendors', description: 'Confirm budget, venue, and vendor contracts.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Ops'] },
        { title: 'Run-of-Show Draft', description: 'Build agenda, speaker timing, and transitions.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Production'] },
        { title: 'Registration Setup', description: 'Configure event page and attendee communications.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Comms'] },
        { title: 'Onsite Checklist', description: 'Validate AV, signage, and staffing plans.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Execution'] },
        { title: 'Post-event Report', description: 'Summarize attendance, feedback, and ROI.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Reporting'] }
      ]
    },
    {
      id: 'tmpl-content-engine',
      name: 'Content Engine',
      description: 'Structured editorial workflow from planning to distribution.',
      icon: 'FileText',
      tasks: [
        { title: 'Editorial Calendar', description: 'Plan monthly topics by funnel stage.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Editorial'] },
        { title: 'Keyword Briefs', description: 'Prepare SEO-focused outlines and intent targets.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['SEO'] },
        { title: 'Draft Production', description: 'Write first drafts and required visuals.', priority: TaskPriority.HIGH, status: TaskStatus.TODO, tags: ['Writing'] },
        { title: 'Review and QA', description: 'Edit for clarity, tone, and factual accuracy.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Review'] },
        { title: 'Publish and Distribute', description: 'Schedule publishing and channel distribution.', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, tags: ['Distribution'] },
        { title: 'Performance Optimization', description: 'Update content using analytics insights.', priority: TaskPriority.LOW, status: TaskStatus.TODO, tags: ['Optimization'] }
      ]
    }
  ]
};
