import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Property, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AllowWhileSuspended } from '../../common/decorators/allow-while-suspended.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_PROPERTY,
  MAX_PHOTOS_PER_PROPERTY,
  MAX_PHOTO_BYTES,
} from '../../common/constants';
import { createMimeTypeFilter } from '../storage/mime-type-filter';
import {
  PropertiesService,
  PaginatedProperties,
  PropertyWithPhotos,
  PropertyPhotoResponse,
  PropertyDocumentResponse,
} from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto';
import { UploadPropertyDocumentDto } from './dto/upload-property-document.dto';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  // Doit rester accessible même à un compte SUSPENDED_INACTIVITY — c'est
  // justement l'action qui le débloque (voir build-plan.md unité 11).
  @AllowWhileSuspended()
  @ApiOperation({
    summary:
      "Enregistrer un nouveau bien — toujours VACANT, toujours l'appelant comme propriétaire",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "Liste paginée des biens visibles par l'utilisateur courant" })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPropertiesQueryDto,
  ): Promise<PaginatedProperties> {
    return this.propertiesService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un bien, avec ses photos (URLs signées)" })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PropertyWithPhotos> {
    return this.propertiesService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier la fiche ou le statut d'un bien" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archiver un bien (jamais de suppression physique)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Property> {
    return this.propertiesService.remove(user, id);
  }

  @Post(':id/photos')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: `Ajoute jusqu'à ${MAX_PHOTOS_PER_PROPERTY} photos (plafond cumulatif) — compression WebP automatique`,
  })
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS_PER_PROPERTY, {
      limits: { fileSize: MAX_PHOTO_BYTES },
      fileFilter: createMimeTypeFilter('property-photos'),
    }),
  )
  addPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFiles() photos: Express.Multer.File[] = [],
  ): Promise<PropertyPhotoResponse[]> {
    return this.propertiesService.addPhotos(user, id, photos);
  }

  @Delete(':id/photos/:photoId')
  @ApiOperation({ summary: 'Supprime une photo (Storage puis Prisma)' })
  removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    return this.propertiesService.removePhoto(user, id, photoId);
  }

  @Post(':id/documents')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: `Ajoute des documents d'un même type (plafond cumulatif de ${MAX_DOCUMENTS_PER_PROPERTY}) — jamais compressés`,
  })
  @UseInterceptors(
    FilesInterceptor('documents', MAX_DOCUMENTS_PER_PROPERTY, {
      limits: { fileSize: MAX_DOCUMENT_BYTES },
      fileFilter: createMimeTypeFilter('property-documents'),
    }),
  )
  addDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UploadPropertyDocumentDto,
    @UploadedFiles() documents: Express.Multer.File[] = [],
  ): Promise<PropertyDocumentResponse[]> {
    return this.propertiesService.addDocuments(user, id, dto.type, documents);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Liste les documents du bien avec URLs signées (15 min)' })
  listDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PropertyDocumentResponse[]> {
    return this.propertiesService.listDocuments(user, id);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({ summary: 'Supprime un document (Storage puis Prisma)' })
  removeDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    return this.propertiesService.removeDocument(user, id, documentId);
  }
}
