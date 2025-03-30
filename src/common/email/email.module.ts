import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
    BullBoardModule.forFeature({ name: 'email', adapter: BullMQAdapter }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
