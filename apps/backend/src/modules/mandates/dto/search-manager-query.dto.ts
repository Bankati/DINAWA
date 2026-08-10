import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

// Un propriétaire retrouve un gestionnaire par email OU téléphone exact — au
// moins un des deux est requis (vérifié dans le service, pas ici : les deux
// champs sont individuellement optionnels par nature d'une query GET).
export class SearchManagerQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
