import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

// EmailModule est @Global() — pas besoin de l'importer explicitement ici.
@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
