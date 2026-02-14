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
} from 'lucide-react';
import { EventEditor } from './EventsEditor';

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
  allEvents: _allEvents,
  onEventChange,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCopy,
  disabled,
}: CompactEventCardProps) {
  const isActive = isFinite(event.start) && isFinite(event.end);

  const handleActiveToggle = (checked: boolean) => {
    if (checked) {
      onEventChange({ ...event, start: 0, end: 10 });
    } else {
      onEventChange({ ...event, start: Infinity, end: Infinity });
    }
  };

  const handleProbabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEventChange({ ...event, probability: e.target.value });
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onEventChange({ ...event, start: Math.max(0, parsed) });
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onEventChange({ ...event, end: Math.max(0, parsed) });
    }
  };

  return (
    <div
      className={`border rounded-md px-2 py-1 text-xs items-center gap-x-1.5 ${isActive ? 'bg-card' : 'bg-muted/40 opacity-60'}`}
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
      <span className="font-medium truncate" title={event.name || event.id}>
        {event.name || event.id}
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
        <Input
          type="number"
          value={isActive ? event.start : ''}
          onChange={handleStartChange}
          disabled={disabled || !isActive}
          min={0}
          step={0.1}
          className="h-5 text-xs w-full px-1"
          placeholder="---"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          value={isActive ? event.end : ''}
          onChange={handleEndChange}
          disabled={disabled || !isActive}
          min={0}
          step={0.1}
          className="h-5 text-xs w-full px-1"
          placeholder="---"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0 justify-end">
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
          <DialogTitle className="text-sm">Edit Event: {event?.name || event?.id}</DialogTitle>
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
    updateDefaultEvents(defaultEvents.filter((_, i) => i !== index));
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
    (params.cell_types[cellTypeKey] as EHTCellTypeParams).events_v2 || [];

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
    const events = getEvents(cellTypeKey).filter((_, i) => i !== index);
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
      name: `New Event ${counter}`,
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
                    {preset.name}
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
                              <span className="text-xs text-muted-foreground truncate" title={event.name}>
                                {event.name || event.id}
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
                            <span className="text-xs text-muted-foreground truncate" title={event.name}>
                              {event.name || event.id}
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
