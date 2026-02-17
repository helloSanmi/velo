# Privacy Policy

Last updated: February 17, 2026

## Overview
Velo provides a project and task management workspace. This policy explains what data is stored and how it is used in this demo application.

## Data We Store
- Account information: username, display name, role, avatar URL, and email.
- Workspace data: projects, tasks, comments, subtasks, workflow rules, and settings.
- Session data: current signed-in user session.
- Audit data: security and activity records for accountability.

## How Data Is Used
- To provide core product features (boards, assignments, analytics, workflows).
- To personalize your interface and settings.
- To keep your workspace state available between sessions.

## Storage
- In this demo, data is primarily stored in browser local storage.
- If integrated with external services, data handling may depend on those providers.

## Deletion And Retention
- When a project is purged, related project data is removed from backend storage, including project tasks and project-scoped access groups.
- We retain only a minimal deletion audit record (`who deleted what and when`) for up to 30 days after purge.
- After 30 days, those project deletion audit records are removed automatically by backend retention cleanup jobs.
- Organization deletion uses a separate 30-day retention window before full purge.

## AI Features
- Optional AI features may process task/project text you submit.
- Do not submit sensitive personal or regulated data unless your deployment is configured for that use case.

## Security
- Access is controlled by account session state and role-based UI controls.
- Demo mode is not intended for production-grade compliance requirements.

## Your Choices
- You can clear demo data using the app reset flow.
- You can stop using AI features in settings.

## Contact
For privacy questions, use your organization’s support channel.
