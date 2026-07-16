import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class InviteTenantDto {
  @ApiProperty()
  @IsString()
  propertyId!: string;

  // Canal de livraison de l'invitation — seul canal construit (aucun
  // fournisseur SMS dans ce projet), voir architecture.md.
  @ApiProperty()
  @IsEmail()
  email!: string;

  // Identifiant produit du locataire — fourni par l'inviteur, pas ressaisi
  // par le locataire à l'activation de son compte.
  @ApiProperty({ example: '90330557' })
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'phone doit être un numéro valide' })
  phone!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;
}
