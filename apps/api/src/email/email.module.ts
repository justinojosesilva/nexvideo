import { Module } from '@nestjs/common';
import { SendConfirmationEmailUseCase } from './use-cases/send-confirmation-email.use-case';
import { SendWelcomeEmailUseCase } from './use-cases/send-welcome-email.use-case';
import { SendInviteEmailUseCase } from './use-cases/send-invite-email.use-case';
import { SendPaymentFailedEmailUseCase } from './use-cases/send-payment-failed-email.use-case';
import { SendCancellationWarningEmailUseCase } from './use-cases/send-cancellation-warning-email.use-case';
import { SendUsageWarningEmailUseCase } from './use-cases/send-usage-warning-email.use-case';

@Module({
  providers: [
    SendConfirmationEmailUseCase,
    SendWelcomeEmailUseCase,
    SendInviteEmailUseCase,
    SendPaymentFailedEmailUseCase,
    SendCancellationWarningEmailUseCase,
    SendUsageWarningEmailUseCase,
  ],
  exports: [
    SendConfirmationEmailUseCase,
    SendWelcomeEmailUseCase,
    SendInviteEmailUseCase,
    SendPaymentFailedEmailUseCase,
    SendCancellationWarningEmailUseCase,
    SendUsageWarningEmailUseCase,
  ],
})
export class EmailModule {}
