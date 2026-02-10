/**
 * EHT Cell Events Tab - Dedicated tab for managing cell events per cell type.
 * Shows compact event cards with a dialog for full editing.
 */
import { useState, useCallback } from 'react';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams, EHTCellTypeParams, EventDefinition } from '../params/types';
import { CellCyclePhase } from '../params/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
// Compact Event Card
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
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onEventChange({ ...event, probability: Math.max(0, Math.min(1, parsed)) });
    }
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
    <div className="border rounded-md p-2 space-y-1 bg-card text-xs">
      {/* Row 1: Type badge + name */}
      <div className="flex items-center gap-1.5">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
          event.type === 'special'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}>
          {event.type === 'special' ? 'S' : 'P'}
        </span>
        <span className="font-medium truncate" title={event.name || event.id}>
          {event.name || event.id}
        </span>
      </div>

      {/* Row 2: Active + probability */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Checkbox
            checked={isActive}
            onCheckedChange={handleActiveToggle}
            disabled={disabled}
            className="h-3.5 w-3.5"
          />
          <span className="text-muted-foreground">Active</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-muted-foreground">p=</span>
          <Input
            type="number"
            value={event.probability}
            onChange={handleProbabilityChange}
            disabled={disabled}
            min={0}
            max={1}
            step={0.1}
            className="h-5 text-xs w-14 px-1"
          />
        </div>
      </div>

      {/* Row 3: Start - End (disabled when inactive, not hidden) */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={isActive ? event.start : ''}
          onChange={handleStartChange}
          disabled={disabled || !isActive}
          min={0}
          step={0.1}
          className="h-5 text-xs w-14 px-1"
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
          className="h-5 text-xs w-14 px-1"
          placeholder="---"
        />
      </div>

      {/* Row 4: Edit button */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="h-6 text-xs gap-1 w-full"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>

      {/* Row 5: Up/Down + Copy + Delete */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={disabled || index === 0}
          className="h-6 w-6"
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={disabled || index >= totalCount - 1}
          className="h-6 w-6"
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
            disabled={disabled}
            className="h-6 w-6"
            title="Copy event"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
            className="h-6 w-6 text-destructive hover:text-destructive"
            title="Delete event"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
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
  const [copiedEvent, setCopiedEvent] = useState<EventDefinition | null>(null);

  const cellTypeKeys = Object.keys(params.cell_types);

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
      probability: 1.0,
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

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cellTypeKeys.length}, minmax(180px, 1fr))` }}
        >
          {cellTypeKeys.map((key) => {
            const events = getEvents(key);
            return (
              <div key={key} className="space-y-2">
                {/* Column header */}
                <div className="text-sm font-semibold border-b pb-1">{key}</div>

                {/* Event cards */}
                {events.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 border rounded-md bg-muted/30">
                    No events
                  </div>
                ) : (
                  <div className="space-y-2">
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
            );
          })}
        </div>
      </div>

      {/* Edit Dialog */}
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
    </div>
  );
}
