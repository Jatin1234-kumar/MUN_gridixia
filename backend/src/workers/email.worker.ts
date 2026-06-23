import { Resend } from 'resend';
import { config } from '../config';
import { QUEUE } from '../queues';
import { renderEmailTemplate } from '../services/email/templates';
import type { QueuedEmail } from '../services/email/types';
import { encodeDisplayName } from '../utils/rfc2047';
import { createWorker } from './factory';

let resendClient: Resend | undefined;

function getResend() {
  return (resendClient ??= new Resend(config.email.resendApiKey));
}

export function startEmailWorker() {
  return createWorker<QueuedEmail>({
    queueName: QUEUE.EMAIL,
    concurrency: 3,
    processor: async (job) => {
      const { template, to, data } = job.data;

      await job.updateProgress(10);

      const rendered = renderEmailTemplate(template, data as never);

      await job.updateProgress(40);

      const result = await getResend().emails.send({
        from: config.email.from,
        to: `${encodeDisplayName(to.name)} <${to.email}>`,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      await job.updateProgress(100);

      return { resendId: result.data?.id ?? null };
    },
  });
}
