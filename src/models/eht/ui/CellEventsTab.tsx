/**
 * EHT Cell Events Tab - Dedicated tab for managing cell events per cell type.
 * Shows compact event cards with a dialog for full editing.
 * Single-column layout with collapsible sections for default and per-type events.
 */
import { useState, useCallback } from 'react';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams, EHTCellTypeParams, EventDefinition } from '../params/types';
import { CellCyclePhase } from '../params/types';
import { DEFAULT_EVENT_PRESETS } from '../params/defaults';
import { Input } from '@/components/ui/input';
import { NumericTextInput } from '@/components/params/inputs/NumericTextInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  ClipboardPaste,
  HelpCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { EventEditor } from './EventsEditor';
import { getParameterDescription } from '../params/descriptions';
import { analyzeEventDependencies, getEventDependencyIssues } from '../params/event-dependencies';

// =============================================================================
// Compact Event Card (wide horizontal layout)
// =============================================================================

interface CompactEventCardProps {
  event: EventDefinition;
  index: number;
  totalCount: number;
  allEvents: EventDefinition[];
  onEventChange: (event: EventDefinition) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopy: () => void;
  disabled?: boolean;
}

function CompactEventCard({
  event,
  index,
  totalCount,
  allEvents,
  onEventChange,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCopy,
  disabled,
}: CompactEventCardProps) {
  const isActive = event.end !== -1;
  const analysis = analyzeEventDependencies(allEvents);
  const eventIssues = getEventDependencyIssues(analysis, event.id);
  const hasError = eventIssues.some(issue => issue.severity === 'error');
  const hasWarning = eventIssues.some(issue => issue.severity === 'warning');

  const handleActiveToggle = (checked: boolean) => {
    if (checked) {
      onEventChange({ ...event, end: 10 });
    } else {
      onEventChange({ ...event, end: -1 });
    }
  };

  const handleProbabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEventChange({ ...event, probability: e.target.value });
  };

  return (
    <div
      className={`border rounded-md px-2 py-1 text-xs items-center gap-x-1.5 ${
        hasError
          ? 'border-destructive bg-destructive/10'
          : hasWarning
            ? 'border-yellow-500/50 bg-yellow-500/10'
            : isActive ? 'bg-card' : 'bg-muted/40 opacity-60'
      }`}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px minmax(0, 200px) 80px 110px 1fr',
      }}
    >
      {/* Type badge as on/off toggle */}
      <button
        onClick={() => !disabled && handleActiveToggle(!isActive)}
        disabled={disabled}
        className={`px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
          isActive
            ? event.type === 'special'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-muted text-muted-foreground'
        }`}
        title={`${event.type === 'special' ? 'Special' : 'Parameter'} event — click to ${isActive ? 'disable' : 'enable'}`}
      >
        {event.type === 'special' ? 'S' : 'P'}
      </button>

      {/* Name — truncated within its grid column */}
      <span className="font-medium truncate" title={event.id}>
        {event.id}
      </span>

      {/* Probability */}
      <div className="flex items-center gap-0.5">
        <span className="text-muted-foreground">p=</span>
        <Input
          type="text"
          value={event.probability}
          onChange={handleProbabilityChange}
          disabled={disabled}
          className="h-5 text-xs w-full px-1"
          placeholder="1"
        />
      </div>

      {/* Time range */}
      <div className="flex items-center gap-0.5">
        <span className="text-muted-foreground text-[10px]">t:</span>
        {event.prereq ? (
          <div
            className="flex h-5 min-w-0 flex-1 items-center rounded border border-input bg-muted px-1 text-[10px] text-muted-foreground"
            title={`Start is controlled by time(${event.prereq})`}
          >
            time({event.prereq})
          </div>
        ) : (
          <NumericTextInput
            value={event.start}
            onChange={(v) => onEventChange({ ...event, start: v })}
            disabled={disabled || !isActive}
            min={0}
            className="h-5 text-xs w-full px-1"
          />
        )}
        <span className="text-muted-foreground">-</span>
        <NumericTextInput
          value={event.end}
          onChange={(v) => onEventChange({ ...event, end: v })}
          disabled={disabled || !isActive}
          min={0}
          className="h-5 text-xs w-full px-1"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0 justify-end">
        {event.prereq && (
          <span className="mr-1 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300" title={`Sampled after ${event.prereq}`}>
            Dep
          </span>
        )}
        {eventIssues.length > 0 && (
          <span
            className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${hasError ? 'bg-destructive/15 text-destructive' : 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300'}`}
            title={eventIssues.map(issue => issue.message).join('\n')}
          >
            {hasError ? 'Invalid' : 'Check'}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={disabled || index === 0} className="h-5 w-5" title="Move up">
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={disabled || index >= totalCount - 1} className="h-5 w-5" title="Move down">
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} className="h-5 w-5" title="Edit event">
          <Pencil className="h-2.5 w-2.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCopy} disabled={disabled} className="h-5 w-5" title="Copy event">
          <Copy className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={disabled} className="h-5 w-5 text-destructive hover:text-destructive" title="Delete event">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Event Edit Dialog
// =============================================================================

interface EventEditDialogProps {
  event: EventDefinition | null;
  allEvents: EventDefinition[];
  onSave: (event: EventDefinition) => void;
  onDelete: () => void;
  onClose: () => void;
  disabled?: boolean;
}

function EventEditDialog({ event, allEvents, onSave, onDelete, onClose, disabled }: EventEditDialogProps) {
  return (
    <Dialog open={event !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit Event: {event?.id}</DialogTitle>
        </DialogHeader>
        {event && (
          <EventEditor
            event={event}
            allEvents={allEvents}
            onChange={onSave}
            onDelete={() => { onDelete(); onClose(); }}
            disabled={disabled}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Cell Events Tab
// =============================================================================

export function EHTCellEventsTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  const [editingEvent, setEditingEvent] = useState<{ cellTypeKey: string; eventIndex: number } | null>(null);
  const [editingDefaultEvent, setEditingDefaultEvent] = useState<number | null>(null);
  const [copiedEvent, setCopiedEvent] = useState<EventDefinition | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const cellTypeKeys = Object.keys(params.cell_types);

  // Default events from general params
  const defaultEvents: EventDefinition[] = params.general.default_events ?? [];

  const updateDefaultEvents = useCallback((events: EventDefinition[]) => {
    const newParams = structuredClone(params);
    newParams.general.default_events = events;
    onChange(newParams);
  }, [params, onChange]);

  const updateDefaultEvent = useCallback((index: number, event: EventDefinition) => {
    const events = [...defaultEvents];
    events[index] = event;
    updateDefaultEvents(events);
  }, [defaultEvents, updateDefaultEvents]);

  const deleteDefaultEvent = useCallback((index: number) => {
    const deletedId = defaultEvents[index]?.id;
    updateDefaultEvents(defaultEvents
      .filter((_, i) => i !== index)
      .map(event => event.prereq === deletedId ? { ...event, prereq: null } : event));
  }, [defaultEvents, updateDefaultEvents]);

  const moveDefaultEvent = useCallback((index: number, direction: 'up' | 'down') => {
    const events = [...defaultEvents];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= events.length) return;
    [events[index], events[targetIndex]] = [events[targetIndex], events[index]];
    updateDefaultEvents(events);
  }, [defaultEvents, updateDefaultEvents]);

  const addDefaultPreset = useCallback((presetKey: string) => {
    const preset = DEFAULT_EVENT_PRESETS[presetKey];
    if (!preset) return;
    const cloned = structuredClone(preset);
    // Ensure unique ID
    let id = cloned.id;
    let counter = 1;
    while (defaultEvents.some(e => e.id === id)) {
      id = `${cloned.id}_${counter}`;
      counter++;
    }
    cloned.id = id;
    updateDefaultEvents([...defaultEvents, cloned]);
  }, [defaultEvents, updateDefaultEvents]);

  const toggleSkipDefault = useCallback((cellTypeKey: string, eventId: string, skip: boolean) => {
    const newParams = structuredClone(params);
    const ct = newParams.cell_types[cellTypeKey] as EHTCellTypeParams;
    if (!ct.skip_default_events) ct.skip_default_events = [];
    if (skip) {
      if (!ct.skip_default_events.includes(eventId)) {
        ct.skip_default_events.push(eventId);
      }
    } else {
      ct.skip_default_events = ct.skip_default_events.filter(id => id !== eventId);
    }
    onChange(newParams);
  }, [params, onChange]);

  const getEvents = (cellTypeKey: string): EventDefinition[] =>
    ((params.cell_types[cellTypeKey] as EHTCellTypeParams).events_v2 || [])
      .filter(e => !e.id.startsWith('__formula_'));

  const updateEvents = useCallback((cellTypeKey: string, events: EventDefinition[]) => {
    const newParams = structuredClone(params);
    (newParams.cell_types[cellTypeKey] as EHTCellTypeParams).events_v2 = events;
    onChange(newParams);
  }, [params, onChange]);

  const updateEvent = useCallback((cellTypeKey: string, index: number, event: EventDefinition) => {
    const events = [...getEvents(cellTypeKey)];
    events[index] = event;
    updateEvents(cellTypeKey, events);
  }, [params, updateEvents]);

  const deleteEvent = useCallback((cellTypeKey: string, index: number) => {
    const currentEvents = getEvents(cellTypeKey);
    const deletedId = currentEvents[index]?.id;
    const events = currentEvents
      .filter((_, i) => i !== index)
      .map(event => event.prereq === deletedId ? { ...event, prereq: null } : event);
    updateEvents(cellTypeKey, events);
  }, [params, updateEvents]);

  const moveEvent = useCallback((cellTypeKey: string, index: number, direction: 'up' | 'down') => {
    const events = [...getEvents(cellTypeKey)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= events.length) return;
    [events[index], events[targetIndex]] = [events[targetIndex], events[index]];
    updateEvents(cellTypeKey, events);
  }, [params, updateEvents]);

  const addEvent = useCallback((cellTypeKey: string, type: 'special' | 'parameter_change') => {
    const events = getEvents(cellTypeKey);
    let counter = 1;
    let newId = `event_${counter}`;
    while (events.some(e => e.id === newId)) {
      counter++;
      newId = `event_${counter}`;
    }

    const baseEvent = {
      id: newId,
      start: 0,
      end: 10,
      period: 0,
      probability: '1',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
    };

    let newEvent: EventDefinition;
    if (type === 'special') {
      newEvent = { ...baseEvent, type: 'special', special_name: 'lose_apical_adhesion' as const };
    } else {
      newEvent = { ...baseEvent, type: 'parameter_change', target_parameter: 'stiffness_nuclei_apical', formula: 'old_value * 0.1' };
    }

    updateEvents(cellTypeKey, [...events, newEvent]);
  }, [params, updateEvents]);

  const pasteEvent = useCallback((cellTypeKey: string) => {
    if (!copiedEvent) return;
    const events = getEvents(cellTypeKey);

    // Generate unique ID
    const cloned = structuredClone(copiedEvent);
    let newId = cloned.id;
    let counter = 1;
    while (events.some(e => e.id === newId)) {
      newId = `${cloned.id}_${counter}`;
      counter++;
    }
    cloned.id = newId;
    cloned.prereq = null; // Clear prereq as it may be invalid in target

    updateEvents(cellTypeKey, [...events, cloned]);
  }, [copiedEvent, params, updateEvents]);

  // Get the event currently being edited
  const editedEvent = editingEvent
    ? getEvents(editingEvent.cellTypeKey)[editingEvent.eventIndex] ?? null
    : null;
  const editedAllEvents = editingEvent ? getEvents(editingEvent.cellTypeKey) : [];

  // Get the default event currently being edited
  const editedDefaultEvent = editingDefaultEvent !== null
    ? defaultEvents[editingDefaultEvent] ?? null
    : null;

  return (
    <div className="space-y-1">
      {/* Help button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Event system documentation"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Help</span>
        </button>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cell Events Documentation</DialogTitle>
          </DialogHeader>
          <div className="events-help-content prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {getParameterDescription('events.overview') ?? ''}
            </ReactMarkdown>
          </div>
          <style>{`
            .events-help-content { line-height: 1.6; font-size: 0.875rem; }
            .events-help-content h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.75rem; }
            .events-help-content h2 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 0.25rem; }
            .events-help-content h3 { font-size: 0.9rem; font-weight: 600; margin: 1rem 0 0.375rem; }
            .events-help-content p { margin: 0.375rem 0; }
            .events-help-content ul, .events-help-content ol { margin: 0.375rem 0; padding-left: 1.25rem; }
            .events-help-content li { margin: 0.125rem 0; }
            .events-help-content code { background: hsl(var(--muted)); padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-size: 0.85em; }
            .events-help-content pre { background: hsl(var(--muted)); padding: 0.5rem; border-radius: 0.375rem; overflow-x: auto; margin: 0.5rem 0; }
            .events-help-content pre code { background: none; padding: 0; }
            .events-help-content table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; font-size: 0.8rem; }
            .events-help-content th { text-align: left; padding: 0.375rem 0.5rem; border-bottom: 2px solid hsl(var(--border)); font-weight: 600; }
            .events-help-content td { padding: 0.375rem 0.5rem; border-bottom: 1px solid hsl(var(--border)); }
            .events-help-content .katex { font-size: 0.95em; }
            .events-help-content .katex-display { margin: 0.5rem 0; text-align: center; overflow-x: auto; }
            .events-help-content strong { font-weight: 600; }
          `}</style>
        </DialogContent>
      </Dialog>

      <Accordion type="multiple" defaultValue={cellTypeKeys}>
        {/* Default Events Section */}
        <AccordionItem value="default-events">
          <AccordionTrigger className="py-2 text-sm font-semibold">
            Default Events ({defaultEvents.length})
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <div className="space-y-2">
              {/* Default event cards */}
              {defaultEvents.length > 0 && (
                <div className="space-y-1">
                  {defaultEvents.map((event, i) => (
                    <CompactEventCard
                      key={`default-${event.id}-${i}`}
                      event={event}
                      index={i}
                      totalCount={defaultEvents.length}
                      allEvents={defaultEvents}
                      onEventChange={(updated) => updateDefaultEvent(i, updated)}
                      onEdit={() => setEditingDefaultEvent(i)}
                      onDelete={() => deleteDefaultEvent(i)}
                      onMoveUp={() => moveDefaultEvent(i, 'up')}
                      onMoveDown={() => moveDefaultEvent(i, 'down')}
                      onCopy={() => setCopiedEvent(structuredClone(event))}
                      disabled={disabled}
                    />
                  ))}
                </div>
              )}

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(DEFAULT_EVENT_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => addDefaultPreset(key)}
                    disabled={disabled}
                    className="h-6 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {preset.id}
                  </Button>
                ))}
              </div>

              {/* Skip checkboxes per cell type */}
              {defaultEvents.length > 0 && (
                <div className="border rounded-md p-2 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Skip default events per cell type:</div>
                  {cellTypeKeys.map((key) => {
                    const ct = params.cell_types[key] as EHTCellTypeParams;
                    const skipSet = new Set(ct.skip_default_events ?? []);
                    const hasSkips = defaultEvents.some(e => skipSet.has(e.id));
                    if (!hasSkips && defaultEvents.length <= 3) {
                      // Show inline for small event counts
                      return (
                        <div key={key} className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold min-w-[60px]">{key}:</span>
                          {defaultEvents.map((event) => (
                            <div key={event.id} className="flex items-center gap-1">
                              <Checkbox
                                checked={skipSet.has(event.id)}
                                onCheckedChange={(checked) => toggleSkipDefault(key, event.id, !!checked)}
                                disabled={disabled}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs text-muted-foreground truncate" title={event.id}>
                                {event.id}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold min-w-[60px]">{key}:</span>
                        {defaultEvents.map((event) => (
                          <div key={event.id} className="flex items-center gap-1">
                            <Checkbox
                              checked={skipSet.has(event.id)}
                              onCheckedChange={(checked) => toggleSkipDefault(key, event.id, !!checked)}
                              disabled={disabled}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-xs text-muted-foreground truncate" title={event.id}>
                              {event.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Per-Cell-Type Events */}
        {cellTypeKeys.map((key) => {
          const events = getEvents(key);
          return (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="py-2 text-sm font-semibold">
                {key} ({events.length})
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-0">
                <div className="space-y-2">
                  {/* Event cards */}
                  {events.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2 border rounded-md bg-muted/30">
                      No events
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {events.map((event, i) => (
                        <CompactEventCard
                          key={`${key}-${event.id}-${i}`}
                          event={event}
                          index={i}
                          totalCount={events.length}
                          allEvents={events}
                          onEventChange={(updated) => updateEvent(key, i, updated)}
                          onEdit={() => setEditingEvent({ cellTypeKey: key, eventIndex: i })}
                          onDelete={() => deleteEvent(key, i)}
                          onMoveUp={() => moveEvent(key, i, 'up')}
                          onMoveDown={() => moveEvent(key, i, 'down')}
                          onCopy={() => setCopiedEvent(structuredClone(event))}
                          disabled={disabled}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add / Paste buttons */}
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addEvent(key, 'special')}
                      disabled={disabled}
                      className="h-6 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Special
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addEvent(key, 'parameter_change')}
                      disabled={disabled}
                      className="h-6 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Parameter
                    </Button>
                    {copiedEvent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pasteEvent(key)}
                        disabled={disabled}
                        className="h-6 text-xs gap-1"
                      >
                        <ClipboardPaste className="h-3 w-3" />
                        Paste
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Edit Dialog for per-type events */}
      <EventEditDialog
        event={editedEvent}
        allEvents={editedAllEvents}
        onSave={(updated) => {
          if (editingEvent) {
            updateEvent(editingEvent.cellTypeKey, editingEvent.eventIndex, updated);
          }
        }}
        onDelete={() => {
          if (editingEvent) {
            deleteEvent(editingEvent.cellTypeKey, editingEvent.eventIndex);
          }
        }}
        onClose={() => setEditingEvent(null)}
        disabled={disabled}
      />

      {/* Edit Dialog for default events */}
      <EventEditDialog
        event={editedDefaultEvent}
        allEvents={defaultEvents}
        onSave={(updated) => {
          if (editingDefaultEvent !== null) {
            updateDefaultEvent(editingDefaultEvent, updated);
          }
        }}
        onDelete={() => {
          if (editingDefaultEvent !== null) {
            deleteDefaultEvent(editingDefaultEvent);
          }
        }}
        onClose={() => setEditingDefaultEvent(null)}
        disabled={disabled}
      />
    </div>
  );
}
