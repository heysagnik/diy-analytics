import { handleCallback } from '@vercel/queue';
import type { TrackingContext, TrackingPayload } from '../../analytics/services/trackingService';
import { trackingService } from '../../analytics/services/trackingService';

interface TrackWriteMessage {
  payload: TrackingPayload;
  context: TrackingContext;
}

export const POST = handleCallback(async (message: TrackWriteMessage) => {
  const result = await trackingService.processTracking(message.payload, message.context);
  if (!result.success) {
    console.error('Tracking queue consumer rejected message:', result.error, result.details);
  }
});
