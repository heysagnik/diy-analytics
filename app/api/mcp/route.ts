import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { NextResponse } from 'next/server';
import { requireApiKeyUser } from '@/lib/mcpAuth';
import { registerTools } from './tools';

/**
 * Fresh McpServer + transport per request (sessionIdGenerator: undefined =
 * stateless mode) — no in-memory session store, safe for a serverless
 * deployment. Every self-hosted deployment of this app serves its own MCP
 * endpoint here, at its own domain, rather than a central hosted server.
 */
async function handle(request: Request) {
  const user = await requireApiKeyUser(request);
  if (user instanceof NextResponse) return user;

  const server = new McpServer({ name: 'diy-analytics', version: '1.0.0' });
  registerTools(server, user.id);

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
