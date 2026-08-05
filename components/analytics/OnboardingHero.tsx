"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckIcon, CopyIcon, CheckCircleIcon } from '@phosphor-icons/react';
import type { Project } from '@/types/analytics';

interface OnboardingHeroProps {
  project: Project;
}

export default function OnboardingHero({ project }: OnboardingHeroProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3000';

  const snippet = `<script async defer src="${baseUrl}/api/tracker.js?site-id=${project.trackingCode}"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      showToast('success', 'Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Please copy manually');
    }
  };

  return (
    <Card className="p-8 sm:p-12 text-center bg-surface-secondary">
      <div className="max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-surface text-foreground mb-6 border border-border">
          <CheckCircleIcon size={28} />
        </div>

        <h2 className="text-balance font-display font-semibold text-2xl text-foreground mb-3">Your dashboard is ready!</h2>
        <p className="text-pretty text-sm text-muted-foreground mb-8 font-body">
          No data yet — complete the next steps to start seeing analytics.
        </p>

        <Card className="p-6 mb-8 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-label mb-3">
            Add this snippet to your site's <span className="font-mono text-foreground bg-surface-secondary px-1.5 py-0.5 rounded text-xs">&lt;head&gt;</span>:
          </p>
          <div className="bg-surface-secondary rounded-xl p-4 font-mono text-xs text-foreground break-all whitespace-pre-wrap mb-4 border border-border">
            {snippet}
          </div>
          <Button onClick={handleCopy}>
            <span className="icon-crossfade size-4" data-icon="inline-start">
              <CopyIcon className={`size-4 ${copied ? 'icon-crossfade-hidden' : ''}`} />
              <CheckIcon className={`size-4 ${copied ? '' : 'icon-crossfade-hidden'}`} />
            </span>
            <span>{copied ? 'Copied!' : 'Copy snippet'}</span>
          </Button>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left" aria-label="Getting started">
          <StepCard number={1} title="Add the snippet" description="Paste the code inside your website's <head> tag." />
          <StepCard number={2} title="Wait a moment" description="First page views arrive in seconds. Refresh this page." />
          <StepCard number={3} title="Explore charts" description="Your dashboard fills with real-time traffic data over time." />
        </div>
      </div>
    </Card>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <Card className="p-5 text-left">
      <div className="inline-flex items-center justify-center size-6 rounded-full bg-accent text-accent-foreground text-xs font-bold mb-3">
        {number}
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}
