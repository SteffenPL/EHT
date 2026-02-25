/**
 * Events Editor UI for EHT v1.1.0 event system.
 * Provides components for editing cell type events.
 */
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NumericTextInput } from '@/components/params/inputs/NumericTextInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { HelpPopover } from '@/components/ui/help-popover';
import { getParameterDescription } from '../params/descriptions';
import type {
  EventDefinition,
  ParameterChangeEvent,
  SpecialEvent,
  SpecialEventName,
  EHTCellTypeParams,
  GlobalEventDefinition,
} from '../params/types';
import { CellCyclePhase } from '../params/types';

// =============================================================================
// Types
// =============================================================================

interface EventsEditorProps {
  events: EventDefinition[];
  onChange: (events: EventDefinition[]) => void;
  disabled?: boolean;
  cellTypeKey: string;
}

interface EventEditorProps {
  event: EventDefinition;
  allEvents: EventDefinition[];
  onChange: (event: EventDefinition) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SPECIAL_EVENT_OPTIONS: { value: SpecialEventName; label: string }[] = [
  { value: 'lose_apical_adhesion', label: 'Lose Apical Adhesion' },
  { value: 'lose_basal_adhesion', label: 'Lose Basal Adhesion' },
  { value: 'apical_constriction', label: 'Apical Constriction' },
  { value: 'start_running', label: 'Start Running' },
  { value: 'cell_division', label: 'Cell Division' },
  { value: 'cell_cycle_reset', label: 'Cell Cycle Reset' },
];

const CELL_CYCLE_PHASE_OPTIONS: { value: CellCyclePhase; label: string }[] = [
  { value: CellCyclePhase.Any, label: 'Any' },
  { value: CellCyclePhase.Birth, label: 'Birth' },
  { value: CellCyclePhase.G1, label: 'G1' },
  { value: CellCyclePhase.G2, label: 'G2' },
  { value: CellCyclePhase.Mitosis, label: 'Mitosis' },
];

const PARAMETER_OPTIONS: { value: string; label: string }[] = [
  { value: 'stiffness_nuclei_apical', label: 'Stiffness Nuclei-Apical' },
  { value: 'stiffness_nuclei_basal', label: 'Stiffness Nuclei-Basal' },
  { value: 'stiffness_straightness', label: 'Stiffness Straightness' },
  { value: 'stiffness_apical_apical', label: 'Stiffness Apical-Apical' },
  { value: 'R_soft', label: 'R Soft' },
  { value: 'R_hard', label: 'R Hard' },
  { value: 'eta_A', label: 'Eta A (Apical Rest Length)' },
  { value: 'eta_B', label: 'Eta B (Basal Rest Length)' },
  { value: 'running_mode', label: 'Running Mode' },
];

// =============================================================================
// Helper Components
// =============================================================================

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

function NumberInput({ value, onChange, disabled, min, max, label, className }: NumberInputProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-muted-foreground">{label}</label>}
      <NumericTextInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        className="h-7 text-xs"
      />
    </div>
  );
}

interface TimeRangeInputProps {
  start: number;
  end: number;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
  disabled?: boolean;
}

function TimeRangeInput({ start, end, onChangeStart, onChangeEnd, disabled }: TimeRangeInputProps) {
  const isActive = isFinite(start) && isFinite(end);

  const handleActiveToggle = (checked: boolean) => {
    if (checked) {
      onChangeStart(0);
      onChangeEnd(10);
    } else {
      onChangeStart(Infinity);
      onChangeEnd(Infinity);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={isActive}
        onCheckedChange={handleActiveToggle}
        disabled={disabled}
        title="Active"
      />
      {isActive ? (
        <>
          <NumberInput
            value={start}
            onChange={onChangeStart}
            disabled={disabled}
            min={0}
            step={0.1}
            label="Start"
            className="w-20"
          />
          <span className="text-muted-foreground">-</span>
          <NumberInput
            value={end}
            onChange={onChangeEnd}
            disabled={disabled}
            min={0}
            step={0.1}
            label="End"
            className="w-20"
          />
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Inactive</span>
      )}
    </div>
  );
}

// =============================================================================
// Event Editor Component
// =============================================================================

export function EventEditor({
  event,
  allEvents,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: EventEditorProps) {
  // Get available prerequisites (other events except self)
  const prereqOptions = allEvents
    .filter(e => e.id !== event.id)
    .map(e => ({ value: e.id, label: e.name || e.id }));

  const handleBaseFieldChange = <K extends keyof EventDefinition>(
    field: K,
    value: EventDefinition[K]
  ) => {
    onChange({ ...event, [field]: value });
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-card">
      {/* Header: ID, Name, Type, Delete */}
      <div className="flex items-center gap-2">
        <Input
          value={event.id}
          onChange={(e) => handleBaseFieldChange('id', e.target.value)}
          disabled={disabled}
          className="h-7 text-xs w-24"
          placeholder="ID"
          title="Unique identifier"
        />
        <Input
          value={event.name}
          onChange={(e) => handleBaseFieldChange('name', e.target.value)}
          disabled={disabled}
          className="h-7 text-xs flex-1"
          placeholder="Name"
        />
        <Select
          value={event.type}
          onValueChange={(value: 'special' | 'parameter_change') => {
            if (value === 'special') {
              const newEvent: SpecialEvent = {
                ...event,
                type: 'special',
                special_name: 'lose_apical_adhesion',
              };
              // Remove parameter_change fields
              delete (newEvent as any).target_parameter;
              delete (newEvent as any).formula;
              onChange(newEvent);
            } else {
              const newEvent: ParameterChangeEvent = {
                ...event,
                type: 'parameter_change',
                target_parameter: 'stiffness_nuclei_apical',
                formula: 'old_value * 0.1',
              };
              // Remove special fields
              delete (newEvent as any).special_name;
              onChange(newEvent);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="special">Special</SelectItem>
            <SelectItem value="parameter_change">Parameter</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-0.5">
          {onMoveUp && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveUp}
              disabled={disabled}
              className="h-7 w-7"
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={disabled}
              className="h-7 w-7"
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete event"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Type-specific fields */}
      {event.type === 'special' ? (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground w-20">Action:</label>
          <Select
            value={event.special_name}
            onValueChange={(value: SpecialEventName) => {
              onChange({ ...event, special_name: value });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPECIAL_EVENT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <HelpPopover content={getParameterDescription(`events.special.${event.special_name}`) || ''} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-20">Parameter:</label>
            <Select
              value={(event as ParameterChangeEvent).target_parameter}
              onValueChange={(value) => {
                onChange({ ...event, target_parameter: value } as ParameterChangeEvent);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAMETER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-20 flex items-center gap-1">
              Formula:
              <HelpPopover content={getParameterDescription('events.formula') || ''} />
            </label>
            <Input
              value={(event as ParameterChangeEvent).formula}
              onChange={(e) => {
                onChange({ ...event, formula: e.target.value } as ParameterChangeEvent);
              }}
              disabled={disabled}
              className="h-7 flex-1 text-xs font-mono"
              placeholder="old_value * 0.1"
            />
          </div>
        </div>
      )}

      {/* Timing */}
      <div className="flex items-center gap-4">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          Time:
          <HelpPopover content={getParameterDescription('events.time_range') || ''} />
        </label>
        <TimeRangeInput
          start={event.start}
          end={event.end}
          onChangeStart={(v) => handleBaseFieldChange('start', v)}
          onChangeEnd={(v) => handleBaseFieldChange('end', v)}
          disabled={disabled}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Period (0=once)
            <HelpPopover content={getParameterDescription('events.period') || ''} />
          </label>
          <NumericTextInput
            value={event.period}
            onChange={(v) => handleBaseFieldChange('period', v)}
            disabled={disabled}
            min={0}
            className="h-7 text-xs w-24"
          />
        </div>
      </div>

      {/* Probability, Prereq, Phase */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Probability
            <HelpPopover content={getParameterDescription('events.probability') || ''} />
          </label>
          <Input
            type="text"
            value={event.probability}
            onChange={(e) => {
              handleBaseFieldChange('probability', e.target.value);
            }}
            disabled={disabled}
            placeholder="1"
            className="h-7 text-xs w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Prerequisite
            <HelpPopover content={getParameterDescription('events.prereq') || ''} />
          </label>
          <Select
            value={event.prereq || '__none__'}
            onValueChange={(value) => {
              handleBaseFieldChange('prereq', value === '__none__' ? null : value);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">(None)</SelectItem>
              {prereqOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Cell Phase
            <HelpPopover content={getParameterDescription('events.cell_phase') || ''} />
          </label>
          <Select
            value={event.cell_cycle_phase}
            onValueChange={(value: CellCyclePhase) => {
              handleBaseFieldChange('cell_cycle_phase', value);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CELL_CYCLE_PHASE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Events List Component
// =============================================================================

export function EventsEditor({ events, onChange, disabled, cellTypeKey }: EventsEditorProps) {
  const handleEventChange = useCallback((index: number, updatedEvent: EventDefinition) => {
    const newEvents = [...events];
    newEvents[index] = updatedEvent;
    onChange(newEvents);
  }, [events, onChange]);

  const handleEventDelete = useCallback((index: number) => {
    const newEvents = events.filter((_, i) => i !== index);
    onChange(newEvents);
  }, [events, onChange]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const newEvents = [...events];
    [newEvents[index - 1], newEvents[index]] = [newEvents[index], newEvents[index - 1]];
    onChange(newEvents);
  }, [events, onChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= events.length - 1) return;
    const newEvents = [...events];
    [newEvents[index], newEvents[index + 1]] = [newEvents[index + 1], newEvents[index]];
    onChange(newEvents);
  }, [events, onChange]);

  const handleAddEvent = useCallback((type: 'special' | 'parameter_change') => {
    // Generate unique ID
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
      newEvent = {
        ...baseEvent,
        type: 'special',
        special_name: 'lose_apical_adhesion',
      };
    } else {
      newEvent = {
        ...baseEvent,
        type: 'parameter_change',
        target_parameter: 'stiffness_nuclei_apical',
        formula: 'old_value * 0.1',
      };
    }

    onChange([...events, newEvent]);
  }, [events, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Events ({events.length})
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddEvent('special')}
            disabled={disabled}
            className="h-6 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Special
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddEvent('parameter_change')}
            disabled={disabled}
            className="h-6 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Parameter
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4 border rounded-md bg-muted/30">
          No events configured. Add a special event or parameter change.
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-1" defaultValue={events.map((_, i) => `event-${i}`)}>
          {events.map((event, index) => (
            <AccordionItem key={`${cellTypeKey}-${event.id}-${index}`} value={`event-${index}`} className="border-0">
              <AccordionTrigger className="py-1 px-2 text-xs bg-muted/50 rounded-t-md hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    event.type === 'special'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {event.type === 'special' ? 'S' : 'P'}
                  </span>
                  <span className="font-medium">{event.name || event.id}</span>
                  {event.prereq && (
                    <span className="text-muted-foreground">
                      (after: {event.prereq})
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-1">
                <EventEditor
                  event={event}
                  allEvents={events}
                  onChange={(updated) => handleEventChange(index, updated)}
                  onDelete={() => handleEventDelete(index)}
                  onMoveUp={index > 0 ? () => handleMoveUp(index) : undefined}
                  onMoveDown={index < events.length - 1 ? () => handleMoveDown(index) : undefined}
                  disabled={disabled}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

// =============================================================================
// Global Event Editor Component
// =============================================================================

const GLOBAL_PARAMETER_OPTIONS: { value: string; label: string }[] = [
  { value: 'mu', label: 'Friction (mu)' },
  { value: 'perimeter', label: 'Perimeter' },
  { value: 'aspect_ratio', label: 'Aspect Ratio' },
  { value: 'p_div_out', label: 'p_div_out' },
];

interface GlobalEventEditorProps {
  event: GlobalEventDefinition;
  onChange: (event: GlobalEventDefinition) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function GlobalEventEditor({
  event,
  onChange,
  onDelete,
  disabled,
}: GlobalEventEditorProps) {
  const handleFieldChange = <K extends keyof GlobalEventDefinition>(
    field: K,
    value: GlobalEventDefinition[K]
  ) => {
    onChange({ ...event, [field]: value });
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-card">
      {/* Header: ID, Name, Delete */}
      <div className="flex items-center gap-2">
        <Input
          value={event.id}
          onChange={(e) => handleFieldChange('id', e.target.value)}
          disabled={disabled}
          className="h-7 text-xs w-24"
          placeholder="ID"
          title="Unique identifier"
        />
        <Input
          value={event.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          disabled={disabled}
          className="h-7 text-xs flex-1"
          placeholder="Name"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disabled}
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Delete event"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Target parameter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-20">Parameter:</label>
        <Select
          value={event.target_parameter}
          onValueChange={(value) => handleFieldChange('target_parameter', value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GLOBAL_PARAMETER_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Formula */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-20 flex items-center gap-1">
          Formula:
          <HelpPopover content={getParameterDescription('events.formula') || ''} />
        </label>
        <Input
          value={event.formula}
          onChange={(e) => handleFieldChange('formula', e.target.value)}
          disabled={disabled}
          className="h-7 flex-1 text-xs font-mono"
          placeholder="old_value * 0.9"
        />
      </div>

      {/* Timing */}
      <div className="flex items-center gap-4">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          Time:
          <HelpPopover content={getParameterDescription('events.time_range') || ''} />
        </label>
        <TimeRangeInput
          start={event.start}
          end={event.end}
          onChangeStart={(v) => handleFieldChange('start', v)}
          onChangeEnd={(v) => handleFieldChange('end', v)}
          disabled={disabled}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Period (0=once)
            <HelpPopover content={getParameterDescription('events.period') || ''} />
          </label>
          <NumericTextInput
            value={event.period}
            onChange={(v) => handleFieldChange('period', v)}
            disabled={disabled}
            min={0}
            className="h-7 text-xs w-24"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Events Section for CellTypesTab
// =============================================================================

interface EventsSectionProps {
  cellType: EHTCellTypeParams;
  cellTypeKey: string;
  onEventsChange: (events: EventDefinition[]) => void;
  disabled?: boolean;
}

export function EventsSection({ cellType, cellTypeKey, onEventsChange, disabled }: EventsSectionProps) {
  const events = cellType.events_v2 || [];

  return (
    <div className="py-2">
      <EventsEditor
        events={events}
        onChange={onEventsChange}
        disabled={disabled}
        cellTypeKey={cellTypeKey}
      />
    </div>
  );
}
