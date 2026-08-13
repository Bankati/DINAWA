import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { THROTTLE_CONTACT } from '../../common/constants';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  @Throttle(THROTTLE_CONTACT)
  @HttpCode(200)
  @ApiOperation({ summary: 'Envoie un message depuis le formulaire de contact public' })
  submit(@Body() dto: CreateContactMessageDto): Promise<{ message: string }> {
    return this.contactService.submit(dto);
  }
}
