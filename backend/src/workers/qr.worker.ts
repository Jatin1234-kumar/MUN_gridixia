import QRCode from 'qrcode';
import { TicketModel } from '../models/Ticket';
import { QUEUE } from '../queues';
import type { GenerateQrJobData, GenerateQrJobResult } from '../queues/types';
import { createWorker } from './factory';

export function startQrWorker() {
  return createWorker<GenerateQrJobData, GenerateQrJobResult>({
    queueName: QUEUE.QR,
    concurrency: 5,
    processor: async (job) => {
      const { ticketId, ticketNumber, userId, eventId } = job.data;

      await job.updateProgress(10);

      const payload = JSON.stringify({ ticketId, ticketNumber, userId, eventId });
      const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'H', width: 400 });

      await job.updateProgress(70);

      await TicketModel.findByIdAndUpdate(ticketId, { qrCode: qrDataUrl });

      await job.updateProgress(100);

      return { ticketId, qrDataUrl };
    },
  });
}
