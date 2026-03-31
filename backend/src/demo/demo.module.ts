import { Module } from '@nestjs/common';
import { DemoService } from './demo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
