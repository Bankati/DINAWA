import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MandatesController } from './mandates.controller';
import { MandatesService } from './mandates.service';

@Module({
  imports: [PrismaModule],
  controllers: [MandatesController],
  providers: [MandatesService],
})
export class MandatesModule {}
