import { relations } from 'drizzle-orm';
import { alerts } from './schema/alerts';
import { dailyRollups } from './schema/dailyRollups';
import { events } from './schema/events';
import { funnels } from './schema/funnels';
import { goals } from './schema/goals';
import { pageViews } from './schema/pageviews';
import { projects } from './schema/projects';
import { sessions } from './schema/sessions';
import { users } from './schema/users';
import { workspaceMembers } from './schema/workspaceMembers';
import { workspaces } from './schema/workspaces';

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  workspaceMembers: many(workspaceMembers),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  projects: many(projects),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  alerts: many(alerts),
  goals: many(goals),
  funnels: many(funnels),
  pageViews: many(pageViews),
  events: many(events),
  dailyRollups: many(dailyRollups),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  project: one(projects, { fields: [alerts.projectId], references: [projects.id] }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  project: one(projects, { fields: [goals.projectId], references: [projects.id] }),
}));

export const funnelsRelations = relations(funnels, ({ one }) => ({
  project: one(projects, { fields: [funnels.projectId], references: [projects.id] }),
}));

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  project: one(projects, { fields: [pageViews.projectId], references: [projects.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  project: one(projects, { fields: [events.projectId], references: [projects.id] }),
}));

export const dailyRollupsRelations = relations(dailyRollups, ({ one }) => ({
  project: one(projects, { fields: [dailyRollups.projectId], references: [projects.id] }),
}));
