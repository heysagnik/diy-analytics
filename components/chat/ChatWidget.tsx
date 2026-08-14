'use client';

import { useChat } from '@ai-sdk/react';
import { ArrowUpIcon, AsteriskIcon } from '@phosphor-icons/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatWidgetProps {
  projectId: string;
  workspaceId: string;
  projectName?: string;
}

const EXIT_DURATION_MS = 150;

// Keeps a block mounted through its exit animation instead of unmounting the instant `show` flips false.
function usePresence(show: boolean) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      return;
    }
    const timeout = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [show]);

  return { shouldRender, dataState: show ? 'open' : 'closed' } as const;
}

const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  get_analytics: 'Checking analytics…',
  get_realtime: 'Checking live visitors…',
  list_errors: 'Looking up errors…',
  get_error_occurrences: 'Digging into that error…',
  list_funnels: 'Looking up funnels…',
  get_funnel_analysis: 'Analyzing the funnel…',
  get_retention: 'Checking retention…',
  get_flow: 'Mapping page flow…',
  get_segments: 'Checking visitor segments…',
  explore: 'Searching sessions…',
  get_event_properties: 'Checking event data…',
  list_goals: 'Looking up goals…',
  list_projects: 'Looking up projects…',
  list_workspaces: 'Looking up workspaces…',
  get_project: 'Loading project…',
};

function activeToolLabel(message: { parts: { type: string; state?: string }[] } | undefined): string | null {
  if (!message) return null;
  const active = message.parts.findLast(
    (part) => part.type.startsWith('tool-') && part.state !== 'output-available' && part.state !== 'output-error',
  );
  if (!active) return null;
  const toolName = active.type.slice('tool-'.length);
  return TOOL_ACTIVITY_LABELS[toolName] ?? 'Working on it…';
}

function useAssistantConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/chat')
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((data) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return configured;
}

export default function ChatWidget({ projectId, workspaceId, projectName }: ChatWidgetProps) {
  const configured = useAssistantConfigured();
  const [input, setInput] = useState('');
  const [isActive, setIsActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { projectId, workspaceId, projectName },
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';
  const latestMessage = messages.findLast((message) => message.role === 'assistant');
  const latestAnswer = latestMessage?.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  useEffect(() => {
    if (!latestAnswer) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [latestAnswer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput('');
    sendMessage({ text });
  };

  const close = () => {
    setIsActive(false);
    inputRef.current?.blur();
  };

  const toolLabel = isBusy ? activeToolLabel(latestMessage) : null;
  const showDots = isActive && isBusy;
  const showAnswer = isActive && !isBusy && !!latestAnswer;
  const dotsPresence = usePresence(showDots);
  const answerPresence = usePresence(showAnswer);

  if (configured === false) return null;

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 z-30 backdrop-blur-md transition-opacity duration-200 ease-out',
          isActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          maskImage: 'radial-gradient(ellipse 1000px 760px at 50% 100%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 1000px 760px at 50% 100%, black 0%, transparent 75%)',
        }}
        onClick={close}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex flex-col-reverse items-center gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
        <form
          onSubmit={handleSubmit}
          className={cn(
            'pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-popover p-1.5 pl-4 shadow-lg transition-[width] duration-300 ease-out',
            isActive || input ? 'w-full max-w-xl' : 'w-56 sm:w-64 max-w-xl',
          )}
        >
          <AsteriskIcon className="size-5 shrink-0 text-primary" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsActive(true)}
            onKeyDown={(e) => e.key === 'Escape' && close()}
            placeholder={configured ? 'Ask about your site…' : 'Assistant not configured'}
            disabled={!configured || configured === null}
            className="h-8 w-0 min-w-0 flex-1 truncate bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm"
          />
          <Button
            type="submit"
            size="icon-sm"
            className="rounded-full transition-transform duration-150 ease-out active:scale-[0.95]"
            disabled={!configured || isBusy || !input.trim()}
            aria-label="Send message"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        </form>

        {dotsPresence.shouldRender && (
          <div
            data-state={dotsPresence.dataState}
            className="flex w-full max-w-xl origin-bottom-left justify-start duration-150 ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
          >
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-3 shadow-lg">
              {toolLabel && <span className="text-xs text-muted-foreground">{toolLabel}</span>}
              <span className="flex items-center gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            </div>
          </div>
        )}

        {answerPresence.shouldRender && (
          <div
            data-state={answerPresence.dataState}
            className="flex w-full max-w-xl origin-bottom-left justify-start duration-150 ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
          >
            <div
              ref={scrollRef}
              className="pointer-events-auto max-h-[50vh] w-fit max-w-full overflow-y-auto scrollbar-thin whitespace-pre-wrap rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-foreground shadow-lg"
            >
              {latestAnswer}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
