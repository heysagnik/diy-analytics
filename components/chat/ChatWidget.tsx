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

export default function ChatWidget({ projectId, workspaceId }: ChatWidgetProps) {
  const configured = useAssistantConfigured();
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { projectId, workspaceId },
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
    setMessages([]);
    sendMessage({ text });
  };

  if (configured === false) return null;

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 z-30 backdrop-blur-md transition-opacity duration-300',
          isFocused ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          maskImage: 'radial-gradient(ellipse 1000px 760px at 50% 100%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 1000px 760px at 50% 100%, black 0%, transparent 75%)',
        }}
        onClick={() => inputRef.current?.blur()}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex flex-col-reverse items-center gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
        <form
          onSubmit={handleSubmit}
          className={cn(
            'pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-popover p-1.5 pl-4 shadow-lg transition-all duration-300 ease-out',
            isFocused || input ? 'w-full max-w-xl' : 'w-56 sm:w-64 max-w-xl',
          )}
        >
          <AsteriskIcon className="size-5 shrink-0 text-primary" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={configured ? 'Ask about your site…' : 'Assistant not configured'}
            disabled={!configured || configured === null}
            className="h-8 w-0 min-w-0 flex-1 truncate bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm"
          />
          <Button
            type="submit"
            size="icon-sm"
            className="rounded-full"
            disabled={!configured || isBusy || !input.trim()}
            aria-label="Send message"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        </form>

        {isFocused && isBusy && (
          <div className="flex w-full max-w-xl justify-start">
            <div className="pointer-events-auto flex items-center gap-1 rounded-2xl bg-muted px-3.5 py-3 shadow-lg">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}

        {isFocused && !isBusy && latestAnswer && (
          <div className="flex w-full max-w-xl justify-start">
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
