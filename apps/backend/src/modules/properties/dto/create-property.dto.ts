import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PropertyType } from '@prisma/client';

// Jamais de `status` ni `ownerId` ici — voir /architect unité 12 : un bien
// démarre toujours VACANT (aucun bail ne peut exister avant sa création) et
// appartient toujours à l'utilisateur authentifié, jamais à un tiers désigné
// par le client.
export class CreatePropertyDto {
  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  neighborhood!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  city!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0.01)
  surfaceArea!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomsCount?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthlyRent!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyCharges?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
