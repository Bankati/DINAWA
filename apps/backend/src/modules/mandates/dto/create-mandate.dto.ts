import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMandateDto {
  @ApiProperty({ description: 'Email du gestionnaire à qui déléguer' })
  @IsEmail()
  managerEmail!: string;

  @ApiProperty({ description: 'IDs des biens à déléguer', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  propertyIds!: string[];

  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT'] })
  @IsIn(['PERCENTAGE', 'FLAT'])
  feeType!: 'PERCENTAGE' | 'FLAT';

  @ApiProperty({ description: '% ou montant fixe (entier)' })
  @IsInt()
  @Min(0)
  feeValue!: number;

  @ApiProperty({ description: 'Date de début (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Date de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
