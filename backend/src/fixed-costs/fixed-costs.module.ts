import { Module } from '@nestjs/common';
import { FixedCostsService } from './fixed-costs.service';
import { FixedCostsController } from './fixed-costs.controller';

@Module({
  controllers: [FixedCostsController],
  providers: [FixedCostsService],
  exports: [FixedCostsService],
})
export class FixedCostsModule {}
