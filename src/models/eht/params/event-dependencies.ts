import type { EventDefinition } from './types';

export type EventDependencyIssueType =
  | 'duplicate_id'
  | 'missing_dependency'
  | 'self_dependency'
  | 'cycle'
  | 'impossible_window';

export type EventDependencyIssueSeverity = 'error' | 'warning';

export interface EventDependencyIssue {
  type: EventDependencyIssueType;
  severity: EventDependencyIssueSeverity;
  eventId: string;
  dependencyId?: string;
  message: string;
}

export interface EventDependencyAnalysis {
  orderedEvents: EventDefinition[];
  issues: EventDependencyIssue[];
  hasErrors: boolean;
}

function isGeneratedFormulaEvent(event: EventDefinition): boolean {
  return event.id.startsWith('__formula_');
}

function addIssue(
  issues: EventDependencyIssue[],
  issue: EventDependencyIssue
): void {
  if (!issues.some(existing =>
    existing.type === issue.type &&
    existing.eventId === issue.eventId &&
    existing.dependencyId === issue.dependencyId
  )) {
    issues.push(issue);
  }
}

function getWindowIssueSeverity(event: EventDefinition, dependency: EventDefinition): EventDependencyIssueSeverity {
  if (isFinite(dependency.start) && isFinite(event.end) && dependency.start > event.end) {
    return 'error';
  }
  return 'warning';
}

function maybeAddWindowIssue(
  event: EventDefinition,
  dependency: EventDefinition,
  issues: EventDependencyIssue[]
): void {
  if (!event.prereq || event.end === -1 || !isFinite(event.end)) return;
  if (dependency.end === -1) {
    addIssue(issues, {
      type: 'impossible_window',
      severity: 'warning',
      eventId: event.id,
      dependencyId: dependency.id,
      message: `Event "${event.id}" depends on inactive event "${dependency.id}".`,
    });
    return;
  }

  const dependencyCanSampleAfterEnd = isFinite(dependency.end) && dependency.end > event.end;
  const dependencyStartsAfterEnd = isFinite(dependency.start) && dependency.start > event.end;

  if (!dependencyCanSampleAfterEnd && !dependencyStartsAfterEnd) return;

  const severity = getWindowIssueSeverity(event, dependency);
  addIssue(issues, {
    type: 'impossible_window',
    severity,
    eventId: event.id,
    dependencyId: dependency.id,
    message: severity === 'error'
      ? `Event "${event.id}" cannot sample after "${dependency.id}" because its end time is before the dependency can start.`
      : `Event "${event.id}" may be skipped for cells where "${dependency.id}" samples after its end time.`,
  });
}

export function analyzeEventDependencies(events: EventDefinition[]): EventDependencyAnalysis {
  const issues: EventDependencyIssue[] = [];
  const eventById = new Map<string, EventDefinition>();
  const duplicateIds = new Set<string>();

  for (const event of events) {
    if (eventById.has(event.id)) {
      duplicateIds.add(event.id);
      addIssue(issues, {
        type: 'duplicate_id',
        severity: 'error',
        eventId: event.id,
        message: `Event ID "${event.id}" is used more than once.`,
      });
    } else {
      eventById.set(event.id, event);
    }
  }

  const edges = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const event of events) {
    indegree.set(event.id, 0);
    edges.set(event.id, []);
  }

  for (const event of events) {
    if (!event.prereq) continue;

    if (event.prereq === event.id) {
      addIssue(issues, {
        type: 'self_dependency',
        severity: 'error',
        eventId: event.id,
        dependencyId: event.prereq,
        message: `Event "${event.id}" cannot depend on itself.`,
      });
      continue;
    }

    const dependency = eventById.get(event.prereq);
    if (!dependency) {
      addIssue(issues, {
        type: 'missing_dependency',
        severity: 'error',
        eventId: event.id,
        dependencyId: event.prereq,
        message: `Event "${event.id}" depends on missing event "${event.prereq}".`,
      });
      continue;
    }

    maybeAddWindowIssue(event, dependency, issues);

    if (duplicateIds.has(event.id) || duplicateIds.has(dependency.id)) continue;

    edges.get(dependency.id)?.push(event.id);
    indegree.set(event.id, (indegree.get(event.id) ?? 0) + 1);
  }

  const queue = events
    .filter(event => (indegree.get(event.id) ?? 0) === 0 && !duplicateIds.has(event.id))
    .map(event => event.id);
  const orderedIds: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    orderedIds.push(id);

    for (const dependentId of edges.get(id) ?? []) {
      const nextIndegree = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(dependentId);
      }
    }
  }

  const unresolved = events.filter(event =>
    !orderedIds.includes(event.id) &&
    !duplicateIds.has(event.id) &&
    event.prereq &&
    eventById.has(event.prereq)
  );

  for (const event of unresolved) {
    if (isGeneratedFormulaEvent(event)) continue;
    addIssue(issues, {
      type: 'cycle',
      severity: 'error',
      eventId: event.id,
      dependencyId: event.prereq ?? undefined,
      message: `Event "${event.id}" is part of a dependency cycle.`,
    });
  }

  const orderedEvents = [
    ...orderedIds
      .map(id => eventById.get(id))
      .filter((event): event is EventDefinition => event !== undefined),
    ...events.filter(event => !orderedIds.includes(event.id)),
  ];

  return {
    orderedEvents,
    issues,
    hasErrors: issues.some(issue => issue.severity === 'error'),
  };
}

export function getEventDependencyIssues(
  analysis: EventDependencyAnalysis,
  eventId: string
): EventDependencyIssue[] {
  return analysis.issues.filter(issue => issue.eventId === eventId);
}
