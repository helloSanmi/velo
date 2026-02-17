
const USERS_KEY = 'velo_users';
const ORGS_KEY = 'velo_orgs';
const TASKS_KEY = 'velo_data';
const PROJECTS_KEY = 'velo_projects';
const GROUPS_KEY = 'velo_security_groups';
const TEAMS_KEY = 'velo_teams';
const INVITES_KEY = 'velo_org_invites';
const SESSION_KEY = 'velo_session';

const DEFAULT_ORG_ID = 'org-ent-001';

const INITIAL_ORGS = [
  {
    "id": DEFAULT_ORG_ID,
    "name": "Acme Global Enterprise",
    "totalSeats": 50,
    "plan": "pro",
    "seatPrice": 7,
    "billingCurrency": "USD",
    "ownerId": "demo-admin",
    "createdAt": 1740175200000
  }
];

const INITIAL_USERS = [
  { "id": "u-1", "orgId": DEFAULT_ORG_ID, "username": "alex", "displayName": "Alex Rivera", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", "email": "alex@velo.ai", "role": "member" },
  { "id": "u-2", "orgId": DEFAULT_ORG_ID, "username": "sarah", "displayName": "Sarah Chen", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", "email": "sarah@velo.ai", "role": "member" },
  { "id": "u-3", "orgId": DEFAULT_ORG_ID, "username": "mike", "displayName": "Michael Scott", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", "email": "mike@velo.ai", "role": "member" },
  { "id": "demo-admin", "orgId": DEFAULT_ORG_ID, "username": "admin", "displayName": "System Admin", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin", "email": "admin@velo.ai", "role": "admin" }
];

const INITIAL_PROJECTS = [
  {
    "id": "p1",
    "orgId": DEFAULT_ORG_ID,
    "createdBy": "u-1",
    "name": "Product Roadmap 2025",
    "description": "Core product strategy and high-level feature development.",
    "color": "bg-indigo-600",
    "members": ["u-1", "u-2", "u-3", "demo-admin"],
    "isPublic": false,
    "publicToken": "roadmap25"
  },
  {
    "id": "p2",
    "orgId": DEFAULT_ORG_ID,
    "createdBy": "u-3",
    "name": "Infrastructure Scaling",
    "description": "Kubernetes cluster expansion and global load balancing strategy.",
    "color": "bg-emerald-600",
    "members": ["u-1", "u-3", "demo-admin"],
    "isPublic": false,
    "publicToken": "infra-scale"
  },
  {
    "id": "p3",
    "orgId": DEFAULT_ORG_ID,
    "createdBy": "u-2",
    "name": "Z-Core Security",
    "description": "Zero-trust protocol implementation and hardware security key integration.",
    "color": "bg-rose-500",
    "members": ["u-2", "u-1", "demo-admin"],
    "isPublic": true,
    "publicToken": "z-core-sec"
  },
  {
    "id": "p4",
    "orgId": DEFAULT_ORG_ID,
    "createdBy": "u-2",
    "name": "UX Pulse UI",
    "description": "Next-generation design system and accessibility compliance audit.",
    "color": "bg-amber-500",
    "members": ["u-2", "u-3", "u-1", "demo-admin"],
    "isPublic": false,
    "publicToken": "ux-pulse"
  }
];

const INITIAL_TASKS = [
  {
    "id": "task-1",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-3",
    "assigneeId": "u-1",
    "projectId": "p1",
    "title": "Define Core AI Engine Architecture",
    "description": "Design the orchestration layer between Velo AI and the UI state. Focus on sub-100ms latency for streaming tokens.",
    "status": "in-progress",
    "priority": "High",
    "createdAt": Date.now() - 604800000,
    "dueDate": Date.now() + 86400000,
    "order": 0,
    "tags": ["Architecture", "AI"],
    "subtasks": [
      { "id": "st-1", "title": "Draft SDK orchestration schema", "isCompleted": true },
      { "id": "st-2", "title": "Select primary Gemini models", "isCompleted": true },
      { "id": "st-3", "title": "Implement streaming buffer logic", "isCompleted": false }
    ],
    "comments": [],
    "auditLog": [{ "id": "a1", "userId": "u-3", "displayName": "Michael Scott", "action": "Node initialized", "timestamp": Date.now() - 604800000 }],
    "timeLogged": 14400000
  },
  {
    "id": "task-2",
    "orgId": DEFAULT_ORG_ID,
    "userId": "demo-admin",
    "assigneeId": "u-2",
    "projectId": "p1",
    "title": "Cloud Scale Performance Audit",
    "description": "Stress test the real-time websocket synchronization under high concurrency loads.",
    "status": "todo",
    "priority": "Medium",
    "createdAt": Date.now() - 432000000,
    "dueDate": Date.now() + 604800000,
    "order": 1,
    "tags": ["DevOps", "Infrastructure"],
    "subtasks": [],
    "comments": [],
    "auditLog": [],
    "timeLogged": 0
  },
  {
    "id": "task-3",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-3",
    "assigneeId": "u-3",
    "projectId": "p2",
    "title": "K8s Multi-Region Cluster Deployment",
    "description": "Deploying the Velo Core nodes across EU-West and US-East regions for redundancy.",
    "status": "in-progress",
    "priority": "High",
    "createdAt": Date.now() - 172800000,
    "dueDate": Date.now() + 259200000,
    "order": 0,
    "tags": ["Cloud", "Deployment"],
    "subtasks": [
      { "id": "st-k1", "title": "Configure Terraform variables", "isCompleted": true },
      { "id": "st-k2", "title": "Initialize US-East VPC", "isCompleted": false }
    ],
    "comments": [],
    "auditLog": [],
    "timeLogged": 7200000
  },
  {
    "id": "task-4",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-2",
    "assigneeId": "u-2",
    "projectId": "p3",
    "title": "FIDO2 Hardware Key Protocol",
    "description": "Implementation of hardware-based authentication for administrative access nodes.",
    "status": "todo",
    "priority": "High",
    "createdAt": Date.now() - 86400000,
    "dueDate": Date.now() + 864000000,
    "order": 0,
    "tags": ["Security", "Hardening"],
    "subtasks": [],
    "comments": [],
    "auditLog": [],
    "timeLogged": 0,
    "blockedByIds": ["task-3"]
  },
  {
    "id": "task-5",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-2",
    "assigneeId": "u-2",
    "projectId": "p4",
    "title": "Accessibility WCAG 2.1 Audit",
    "description": "Deep scan of the Velo dashboard for screen reader compliance and keyboard navigation focus traps.",
    "status": "in-progress",
    "priority": "Medium",
    "createdAt": Date.now() - 345600000,
    "dueDate": Date.now() + 172800000,
    "order": 0,
    "tags": ["Compliance", "Design"],
    "subtasks": [
      { "id": "st-a1", "title": "Audit modal focus traps", "isCompleted": true },
      { "id": "st-a2", "title": "Check color contrast in Dark Mode", "isCompleted": true }
    ],
    "comments": [],
    "auditLog": [],
    "timeLogged": 21600000
  },
  {
    "id": "task-6",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-1",
    "assigneeId": "u-1",
    "projectId": "p1",
    "title": "Project Health Scoring Algorithm",
    "description": "Developing the logic for 'At Risk' node detection based on audit log frequency and velocity trends.",
    "status": "done",
    "priority": "Low",
    "createdAt": Date.now() - 1209600000,
    "dueDate": Date.now() - 86400000,
    "order": 2,
    "tags": ["Algorithms", "AI"],
    "subtasks": [
      { "id": "st-h1", "title": "Research baseline velocity metrics", "isCompleted": true },
      { "id": "st-h2", "title": "Implement risk weighting", "isCompleted": true }
    ],
    "comments": [
      { "id": "c-h1", "userId": "demo-admin", "displayName": "System Admin", "text": "This algorithm is now powering the Strategy Audit. Excellent work.", "timestamp": Date.now() - 172800000 }
    ],
    "auditLog": [],
    "timeLogged": 43200000
  },
  {
    "id": "task-7",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-2",
    "assigneeId": "u-2",
    "projectId": "p4",
    "title": "Identity Node Avatar System",
    "description": "Switching to high-performance SVG generation for identity nodes.",
    "status": "todo",
    "priority": "Low",
    "createdAt": Date.now() - 86400000,
    "dueDate": Date.now() + 1209600000,
    "order": 1,
    "tags": ["Frontend", "UX"],
    "subtasks": [],
    "comments": [],
    "auditLog": [],
    "timeLogged": 0
  },
  {
    "id": "task-8",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-3",
    "assigneeId": "u-3",
    "projectId": "p2",
    "title": "Global Edge Caching Layer",
    "description": "Implementing Cloudflare Workers for metadata acceleration across the distributed fabric.",
    "status": "todo",
    "priority": "Medium",
    "createdAt": Date.now() - 172800000,
    "dueDate": Date.now() + 432000000,
    "order": 1,
    "tags": ["Infrastructure", "Speed"],
    "subtasks": [],
    "comments": [],
    "auditLog": [],
    "timeLogged": 0
  },
  {
    "id": "task-9",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-2",
    "assigneeId": "u-2",
    "projectId": "p3",
    "title": "Velo Shield Encryption Upgrade",
    "description": "Upgrading current AES-256 implementation to post-quantum resistant standards.",
    "status": "in-progress",
    "priority": "High",
    "createdAt": Date.now() - 259200000,
    "dueDate": Date.now() + 86400000,
    "order": 1,
    "tags": ["Security", "Encryption"],
    "subtasks": [
      { "id": "st-s1", "title": "Library benchmarking", "isCompleted": true },
      { "id": "st-s2", "title": "Integration test in sandbox", "isCompleted": false }
    ],
    "comments": [],
    "auditLog": [],
    "timeLogged": 10800000
  },
  {
    "id": "task-10",
    "orgId": DEFAULT_ORG_ID,
    "userId": "demo-admin",
    "assigneeId": "u-3",
    "projectId": "p1",
    "title": "Leadership Q3 Strategy Sync",
    "description": "Align the Velo product roadmap with the broader Acme Global Enterprise mission.",
    "status": "done",
    "priority": "Medium",
    "createdAt": Date.now() - 2592000000,
    "dueDate": Date.now() - 1728000000,
    "order": 3,
    "tags": ["Executive", "Planning"],
    "subtasks": [
      { "id": "st-p1", "title": "Draft mission slides", "isCompleted": true },
      { "id": "st-p2", "title": "Confirm budget allocation", "isCompleted": true }
    ],
    "comments": [],
    "auditLog": [],
    "timeLogged": 18000000
  },
  {
    "id": "task-11",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-2",
    "assigneeId": "u-1",
    "projectId": "p1",
    "title": "Telemetry Visualization Core",
    "description": "Building the high-frequency charts for the Velocity Center dashboard.",
    "status": "in-progress",
    "priority": "Medium",
    "createdAt": Date.now() - 432000000,
    "dueDate": Date.now() + 86400000,
    "order": 4,
    "tags": ["Frontend", "Analytics"],
    "subtasks": [],
    "comments": [],
    "auditLog": [],
    "timeLogged": 32400000
  },
  {
    "id": "task-12",
    "orgId": DEFAULT_ORG_ID,
    "userId": "u-1",
    "assigneeId": "u-3",
    "projectId": "p2",
    "title": "PostgreSQL Migration Node 4",
    "description": "Shifting heavy audit logs to a dedicated high-performance partition.",
    "status": "done",
    "priority": "High",
    "createdAt": Date.now() - 864000000,
    "dueDate": Date.now() - 432000000,
    "order": 2,
    "tags": ["Database", "Operations"],
    "subtasks": [
      { "id": "st-db1", "title": "Backup primary cluster", "isCompleted": true },
      { "id": "st-db2", "title": "Execute migration script", "isCompleted": true }
    ],
    "comments": [],
    "auditLog": [],
    "timeLogged": 54000000
  }
];

const INITIAL_GROUPS = [
  {
    "id": "grp-global-eng",
    "orgId": DEFAULT_ORG_ID,
    "name": "Engineering Core",
    "scope": "global",
    "memberIds": ["u-1", "u-3", "demo-admin"],
    "createdBy": "demo-admin",
    "createdAt": Date.now() - 864000000,
    "updatedAt": Date.now() - 864000000
  },
  {
    "id": "grp-p1-delivery",
    "orgId": DEFAULT_ORG_ID,
    "name": "Roadmap Delivery",
    "scope": "project",
    "projectId": "p1",
    "memberIds": ["u-1", "u-2"],
    "createdBy": "u-1",
    "createdAt": Date.now() - 432000000,
    "updatedAt": Date.now() - 432000000
  }
];

const INITIAL_TEAMS = [
  {
    "id": "team-platform",
    "orgId": DEFAULT_ORG_ID,
    "name": "Platform Team",
    "description": "Core platform, reliability, and API operations.",
    "leadId": "u-1",
    "memberIds": ["u-1", "u-3", "demo-admin"],
    "createdBy": "demo-admin",
    "createdAt": Date.now() - 1209600000,
    "updatedAt": Date.now() - 1209600000
  },
  {
    "id": "team-product",
    "orgId": DEFAULT_ORG_ID,
    "name": "Product Team",
    "description": "Roadmap, design quality, and delivery planning.",
    "leadId": "u-2",
    "memberIds": ["u-2", "u-1", "demo-admin"],
    "createdBy": "demo-admin",
    "createdAt": Date.now() - 864000000,
    "updatedAt": Date.now() - 864000000
  }
];

export const mockDataService = {
  init: async (): Promise<void> => {
    try {
      // Re-initialize for new Velo branding/schema if necessary
      if (!localStorage.getItem(ORGS_KEY)) {
        localStorage.setItem(ORGS_KEY, JSON.stringify(INITIAL_ORGS));
      }
      if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      }
      if (!localStorage.getItem(PROJECTS_KEY)) {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(INITIAL_PROJECTS));
      }
      if (!localStorage.getItem(TASKS_KEY)) {
        localStorage.setItem(TASKS_KEY, JSON.stringify(INITIAL_TASKS));
      }
      if (!localStorage.getItem(GROUPS_KEY)) {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(INITIAL_GROUPS));
      }
      if (!localStorage.getItem(TEAMS_KEY)) {
        localStorage.setItem(TEAMS_KEY, JSON.stringify(INITIAL_TEAMS));
      }
      if (!localStorage.getItem(INVITES_KEY)) {
        localStorage.setItem(INVITES_KEY, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Failed to initialize Velo cluster data:', error);
    }
  },
  
  clearData: () => {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(ORGS_KEY);
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(PROJECTS_KEY);
    localStorage.removeItem(GROUPS_KEY);
    localStorage.removeItem(TEAMS_KEY);
    localStorage.removeItem(INVITES_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('velo_settings');
    localStorage.removeItem('velo_notifications');
    localStorage.removeItem('velo_workflows');
    localStorage.removeItem('velo_sidebar_width');
    localStorage.removeItem('velo_column_widths');
    localStorage.removeItem('velo_schema_version');
  }
};
