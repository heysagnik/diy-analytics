import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { getChatModelSelection } from '@/lib/ai/providerRouter';
import { requireUser } from '@/lib/serverAuth';
import { buildAgentTools } from './services/agentTools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HISTORY_MESSAGES = 12;

interface ChatRequestBody {
  messages: UIMessage[];
  projectId?: string;
  workspaceId?: string;
}

function buildSystemPrompt(context: { projectId?: string; workspaceId?: string }): string {
  const lines = [
    'You are the in-app analytics assistant for DIY Analytics, a privacy-friendly website analytics product.',
    "Answer questions about the user's sites using the available tools — call them rather than guessing at numbers.",
    `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
  ];
  if (context.projectId) {
    lines.push(
      `The user is currently viewing project ${context.projectId}${context.workspaceId ? ` in workspace ${context.workspaceId}` : ''}. Assume tool calls should target this project unless the user names a different one.`,
    );
  }
  lines.push(
    'Keep answers concise and concrete — lead with the number or finding, then a short supporting detail if useful.',
  );
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  const selection = getChatModelSelection();
  return NextResponse.json({
    configured: selection !== null,
    provider: selection?.provider ?? null,
    model: selection?.modelId ?? null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const selection = getChatModelSelection();
  if (!selection) {
    return NextResponse.json(
      {
        error:
          'The AI assistant is not configured. Set a provider API key (e.g. ANTHROPIC_API_KEY) in your environment.',
      },
      { status: 503 },
    );
  }

  const { messages, projectId, workspaceId }: ChatRequestBody = await request.json();
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const result = streamText({
    model: selection.model,
    system: buildSystemPrompt({ projectId, workspaceId }),
    messages: convertToModelMessages(recentMessages),
    tools: buildAgentTools(user.id),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
