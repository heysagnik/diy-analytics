import { QueueClient } from '@vercel/queue';

// Pinned to Singapore to match the Neon (ap-southeast-1) database region —
// keeps the queue and the DB writes it triggers close together instead of
// defaulting to iad1 (Washington, D.C.).
const queue = new QueueClient({ region: 'sin1' });

export const { send, handleCallback } = queue;
