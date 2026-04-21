import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { usageWarningEmailTemplate } from '../templates/usage-warning-email';

export interface SendUsageWarningEmailInput {
  userName: string;
  userEmail: string;
  organizationName: string;
  maxPercent: number;
}

@Injectable()
export class SendUsageWarningEmailUseCase {
  private readonly logger = new Logger(SendUsageWarningEmailUseCase.name);
  private resend: Resend;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
  }

  async execute(input: SendUsageWarningEmailInput): Promise<void> {
    const { userName, userEmail, organizationName, maxPercent } = input;

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const upgradeUrl = `${appUrl}/plans`;

    const html = usageWarningEmailTemplate({
      userName,
      userEmail,
      organizationName,
      maxPercent,
      upgradeUrl,
    });

    try {
      await this.resend.emails.send({
        from: 'noreply@nexvideo.app',
        to: userEmail,
        subject: `⚡ Você usou ${maxPercent}% do seu limite mensal — nexvideo`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send usage warning email to ${userEmail}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
