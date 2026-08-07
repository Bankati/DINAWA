import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Mandate, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateMandateDto } from './dto/create-mandate.dto';

type MandateWithDetails = Prisma.MandateGetPayload<{
  include: {
    property: { select: { id: true; address: true; neighborhood: true; city: true } };
    manager: { select: { id: true; firstName: true; lastName: true; email: true; phone: true } };
    owner: { select: { id: true; firstName: true; lastName: true; email: true; phone: true } };
  };
}>;

@Injectable()
export class MandatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(owner: AuthenticatedUser, dto: CreateMandateDto): Promise<MandateWithDetails[]> {
    // Vérifier que le gestionnaire existe
    const manager = await this.prisma.user.findFirst({
      where: { email: dto.managerEmail, role: 'MANAGER' },
      select: { id: true },
    });
    if (!manager) {
      throw new NotFoundException(
        `Aucun compte gestionnaire trouvé pour l'email ${dto.managerEmail}. Le gestionnaire doit d'abord créer un compte WARAH.`,
      );
    }

    // Vérifier que tous les biens appartiennent bien à l'owner
    const properties = await this.prisma.property.findMany({
      where: { id: { in: dto.propertyIds }, ownerId: owner.id },
      select: { id: true },
    });
    if (properties.length !== dto.propertyIds.length) {
      throw new ForbiddenException('Certains biens sélectionnés ne vous appartiennent pas');
    }

    // Vérifier qu'aucun bien n'a déjà un mandat actif
    const conflict = await this.prisma.mandate.findFirst({
      where: { propertyId: { in: dto.propertyIds }, status: 'ACTIVE' },
      include: { property: { select: { address: true } } },
    });
    if (conflict) {
      throw new ConflictException(
        `Le bien "${conflict.property.address}" a déjà un mandat actif — révoquez-le avant d'en créer un nouveau.`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    const created = await Promise.all(
      dto.propertyIds.map(propertyId =>
        this.prisma.mandate.create({
          data: {
            propertyId,
            ownerId: owner.id,
            managerId: manager.id,
            status: 'ACTIVE',
            feeType: dto.feeType,
            feeValue: dto.feeValue,
            startDate,
            ...(endDate ? { endDate } : {}),
            acceptedAt: new Date(),
          },
          include: {
            property: { select: { id: true, address: true, neighborhood: true, city: true } },
            manager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        }),
      ),
    );

    return created;
  }

  async list(owner: AuthenticatedUser): Promise<MandateWithDetails[]> {
    return this.prisma.mandate.findMany({
      where: { ownerId: owner.id, status: { in: ['ACTIVE', 'PENDING'] } },
      include: {
        property: { select: { id: true, address: true, neighborhood: true, city: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async listReceived(manager: AuthenticatedUser): Promise<MandateWithDetails[]> {
    return this.prisma.mandate.findMany({
      where: { managerId: manager.id, status: { in: ['ACTIVE', 'PENDING'] } },
      include: {
        property: { select: { id: true, address: true, neighborhood: true, city: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async revoke(owner: AuthenticatedUser, mandateId: string): Promise<Mandate> {
    const mandate = await this.prisma.mandate.findUnique({ where: { id: mandateId } });
    if (!mandate) throw new NotFoundException('Mandat introuvable');
    if (mandate.ownerId !== owner.id) throw new ForbiddenException('Accès refusé à ce mandat');
    if (mandate.status !== 'ACTIVE' && mandate.status !== 'PENDING') {
      throw new ConflictException('Ce mandat ne peut plus être révoqué (déjà révoqué ou expiré)');
    }

    return this.prisma.mandate.update({
      where: { id: mandateId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }
}
