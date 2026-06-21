import { CertificateModel } from '../models/Certificate';
import { QUEUE } from '../queues';
import type { GenerateCertificateJobData, GenerateCertificateJobResult } from '../queues/types';
import { createWorker } from './factory';

export function startCertificateWorker() {
  return createWorker<GenerateCertificateJobData, GenerateCertificateJobResult>({
    queueName: QUEUE.CERTIFICATE,
    concurrency: 2,
    processor: async (job) => {
      const { certificateId, recipientName, eventName, certificateName, issuedAt } = job.data;

      await job.updateProgress(10);

      // TODO: replace with real PDF generation (e.g. Puppeteer / PDFKit) and upload to Cloudinary
      const fileUrl = `/certificates/${certificateId}.pdf`;

      await job.updateProgress(60);

      await CertificateModel.findByIdAndUpdate(certificateId, {
        status: 'issued',
        fileUrl,
        issuedAt: new Date(issuedAt),
        remarks: `Generated for ${recipientName} — ${eventName} — ${certificateName}`,
      });

      await job.updateProgress(100);

      return { certificateId, fileUrl };
    },
  });
}
