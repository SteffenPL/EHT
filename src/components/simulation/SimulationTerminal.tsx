/**
 * Terminal-style message display for simulation information and warnings.
 */
import { useEffect, useRef } from 'react';
import { useMessages, type Message } from '@/contexts';
import { cn } from '@/lib/utils';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function MessageLine({ message }: { message: Message }) {
  const colorClass = {
    info: 'text-muted-foreground',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
  }[message.type];

  const prefix = {
    info: '',
    warning: '[WARN] ',
    error: '[ERROR] ',
  }[message.type];

  return (
    <div className={cn('font-mono text-xs leading-relaxed', colorClass)}>
      <span className="text-muted-foreground/60">[{formatTime(message.timestamp)}]</span>{' '}
      {prefix}{message.text}
    </div>
  );
}

export function SimulationTerminal() {
  const { messages } = useMessages();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'h-[5lh] overflow-y-auto',
        'bg-muted/30 rounded-md border',
        'px-2 py-1',
        'font-mono text-xs'
      )}
    >
      {messages.length === 0 ? (
        <div className="text-muted-foreground/50 italic">No messages</div>
      ) : (
        messages.map((msg) => <MessageLine key={msg.id} message={msg} />)
      )}
    </div>
  );
}
