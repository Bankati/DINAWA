import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Artisan, ArtisanDirectoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  ARTISAN_DIRECTORY_NOTICE_TEXT,
  ARTISAN_DIRECTORY_NOTICE_VERSION,
  ARTISAN_INVITATION_TTL_MS,
} from '../../common/constants';
import { signToken, verifyToken } from '../../common/utils/signed-token';
import { toWhatsappNumber } from '../../common/utils/phone';
import { CreateArtisanDto } from './dto/create-artisan.dto';
import { UpdateArtisanDto } from './dto/update-artisan.dto';
import {
  AdminListArtisansQueryDto,
  ListArtisansQueryDto,
  ListPublicArtisansQueryDto,
} from './dto/list-artisans-query.dto';
import { ArtisanConsentDecisionDto } from './dto/artisan-decisions.dto';
import { maskPhone, normalizeZone, normalizeZones, shortName } from './artisan-utils';
import {
  AdminArtisanView,
  ArtisanConsentView,
  ArtisanContactView,
  ArtisanInvitationView,
  PaginatedAdminArtisans,
  PaginatedArtisanContacts,
  PaginatedPublicArtisans,
  PublicArtisanDetail,
  PublicArtisanSummary,
} from './artisans.types';

type InvitationTokenData = { i: string };

type UsableInvitation = Prisma.ArtisanInvitationGetPayload<{
  include: { artisan: true; createdBy: { select: { firstName: true; lastName: true } } };
}>;

// Fiches modifiables par leur créateur : tant que l'artisan n'a pas accepté
// l'annuaire. Une fiche publique ne change plus que par l'admin (plus tard
// par l'artisan lui-même), pour que la fiche acceptée reste celle affichée.
const EDITABLE_BY_CREATOR: ArtisanDirectoryStatus[] = ['PRIVATE', 'REFUSED'];

const CONTACT_SELECT = {
  privateNote: true,
  createdAt: true,
  artisan: {
    include: {
      invitations: {
        where: { usedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { expiresAt: true },
      },
    },
  },
} satisfies Prisma.ArtisanContactSelect;

type ContactRow = Prisma.ArtisanContactGetPayload<{ select: typeof CONTACT_SELECT }>;

// Artisans (Phase 13, unités 51-52 — contexte/artisans-pannes.md) : carnet
// des propriétaires et gestionnaires, accord de l'artisan par lien, annuaire
// public, modération admin.
@Injectable()
export class ArtisansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Carnet ────────────────────────────────────────────────────────────

  async listContacts(
    user: AuthenticatedUser,
    query: ListArtisansQueryDto,
  ): Promise<PaginatedArtisanContacts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: Prisma.ArtisanContactWhereInput = {
      userId: user.id,
      artisan: this.artisanFilter(query),
    };
    const [rows, total] = await Promise.all([
      this.prisma.artisanContact.findMany({
        where,
        select: CONTACT_SELECT,
        orderBy: { artisan: { displayName: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.artisanContact.count({ where }),
    ]);
    return { data: rows.map((row) => this.toContactView(user, row)), page, limit, total };
  }

  // Un numéro = un artisan : s'il existe déjà (ajouté par un autre
  // propriétaire), on l'ajoute simplement au carnet, sans toucher à sa fiche
  // et sans dire qui d'autre l'a ajouté.
  async create(user: AuthenticatedUser, dto: CreateArtisanDto): Promise<ArtisanContactView> {
    const existing = await this.prisma.artisan.findUnique({ where: { phone: dto.phone } });
    if (existing) return this.addExistingToContacts(user, existing, dto.privateNote);

    try {
      await this.prisma.artisan.create({
        data: {
          phone: dto.phone,
          displayName: dto.displayName,
          trades: dto.trades,
          zones: normalizeZones(dto.zones),
          createdById: user.id,
          contacts: { create: { userId: user.id, privateNote: emptyToNull(dto.privateNote) } },
        },
      });
    } catch (error) {
      // Même numéro ajouté au même instant par quelqu'un d'autre.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.artisan.findUnique({ where: { phone: dto.phone } });
        if (raced) return this.addExistingToContacts(user, raced, dto.privateNote);
      }
      throw error;
    }
    return this.getContactView(user, (await this.prisma.artisan.findUniqueOrThrow({ where: { phone: dto.phone } })).id);
  }

  async update(
    user: AuthenticatedUser,
    artisanId: string,
    dto: UpdateArtisanDto,
  ): Promise<ArtisanContactView> {
    const contact = await this.getContactOrThrow(user, artisanId);
    const changesDetails =
      dto.displayName !== undefined || dto.trades !== undefined || dto.zones !== undefined;

    if (changesDetails) {
      if (!this.canEditDetails(user, contact.artisan)) {
        throw new ForbiddenException(
          "Cette fiche est publique ou a été créée par quelqu'un d'autre : vous pouvez seulement modifier votre note privée.",
        );
      }
      // Garde en base : la fiche peut être devenue publique entre-temps.
      const { count } = await this.prisma.artisan.updateMany({
        where: { id: artisanId, createdById: user.id, directoryStatus: { in: EDITABLE_BY_CREATOR } },
        data: {
          ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
          ...(dto.trades !== undefined ? { trades: dto.trades } : {}),
          ...(dto.zones !== undefined ? { zones: normalizeZones(dto.zones) } : {}),
        },
      });
      if (count === 0) throw new ConflictException("La fiche vient d'être publiée : rechargez la page.");
    }

    if (dto.privateNote !== undefined) {
      await this.prisma.artisanContact.update({
        where: { userId_artisanId: { userId: user.id, artisanId } },
        data: { privateNote: emptyToNull(dto.privateNote) },
      });
    }
    return this.getContactView(user, artisanId);
  }

  // Retire l'artisan du carnet seulement : sa fiche, ses avis et ses
  // interventions passées restent.
  async removeContact(user: AuthenticatedUser, artisanId: string): Promise<void> {
    const { count } = await this.prisma.artisanContact.deleteMany({
      where: { userId: user.id, artisanId },
    });
    if (count === 0) throw new NotFoundException('Artisan absent de votre carnet');
  }

  // ── Accord de l'artisan (annuaire public) ────────────────────────────

  async createInvitation(user: AuthenticatedUser, artisanId: string): Promise<ArtisanInvitationView> {
    const { artisan } = await this.getContactOrThrow(user, artisanId);
    if (artisan.directoryStatus === 'SUSPENDED') {
      throw new ConflictException("Cet artisan a été retiré de l'annuaire par l'équipe WARAH.");
    }
    if (artisan.directoryStatus === 'PUBLIC') {
      throw new ConflictException("Cet artisan est déjà dans l'annuaire.");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ARTISAN_INVITATION_TTL_MS);
    // Une seule invitation valable à la fois : les précédentes non utilisées
    // sont closes (un ancien lien transféré ne sert plus à rien).
    const invitation = await this.prisma.$transaction(async (tx) => {
      await tx.artisanInvitation.updateMany({
        where: { artisanId, usedAt: null, expiresAt: { gt: now } },
        data: { expiresAt: now },
      });
      return tx.artisanInvitation.create({
        data: { artisanId, expiresAt, createdById: user.id },
        select: { id: true, expiresAt: true },
      });
    });

    const token = signToken<InvitationTokenData>(
      { purpose: 'artisan-consent', data: { i: invitation.id }, expiresAt: invitation.expiresAt },
      this.secret(),
    );
    const url = `${this.frontendUrl()}/artisans/accord/${token}`;
    const inviter = `${user.firstName} ${user.lastName}`.trim();
    const message =
      `Bonjour ${artisan.displayName}, c'est ${inviter}. Je vous ai ajouté à mon carnet d'artisans sur WARAH. ` +
      `Si vous le souhaitez, vous pouvez aussi apparaître dans l'annuaire public des artisans WARAH ` +
      `(gratuit) pour recevoir d'autres clients. Il suffit d'ouvrir ce lien (valable 7 jours) : ${url}`;
    const whatsappNumber = toWhatsappNumber(artisan.phone);
    return {
      url,
      expiresAt: invitation.expiresAt,
      message,
      whatsappUrl: whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
        : null,
    };
  }

  async getConsent(token: string): Promise<ArtisanConsentView> {
    const invitation = await this.getUsableInvitation(token);
    const { artisan, createdBy } = invitation;
    return {
      displayName: artisan.displayName,
      phoneMasked: maskPhone(artisan.phone),
      trades: artisan.trades,
      zones: artisan.zones,
      directoryStatus: artisan.directoryStatus,
      invitedBy: shortName(createdBy.firstName, createdBy.lastName),
      expiresAt: invitation.expiresAt,
      notice: { version: ARTISAN_DIRECTORY_NOTICE_VERSION, text: ARTISAN_DIRECTORY_NOTICE_TEXT },
    };
  }

  // Réponse de l'artisan. Le lien ne sert qu'une fois (écriture
  // conditionnelle sur usedAt), et la preuve est gardée avec la version du
  // texte accepté.
  async decideConsent(
    token: string,
    dto: ArtisanConsentDecisionDto,
  ): Promise<{ directoryStatus: ArtisanDirectoryStatus }> {
    if (dto.noticeVersion !== ARTISAN_DIRECTORY_NOTICE_VERSION) {
      throw new ConflictException('Le texte a changé depuis l’ouverture de la page : rechargez-la.');
    }
    const invitation = await this.getUsableInvitation(token);
    if (invitation.artisan.directoryStatus === 'SUSPENDED') {
      throw new ConflictException("Votre fiche a été retirée de l'annuaire. Contactez WARAH.");
    }
    const next: ArtisanDirectoryStatus = dto.decision === 'ACCEPT' ? 'PUBLIC' : 'REFUSED';
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.artisanInvitation.updateMany({
        where: { id: invitation.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (count === 0) throw new GoneException('Ce lien a déjà été utilisé ou a expiré.');

      const artisan = await tx.artisan.findUniqueOrThrow({
        where: { id: invitation.artisanId },
        select: { directoryStatus: true, phone: true },
      });
      if (artisan.directoryStatus === 'SUSPENDED') {
        throw new ConflictException("Votre fiche a été retirée de l'annuaire. Contactez WARAH.");
      }
      await tx.artisan.update({
        where: { id: invitation.artisanId },
        data: {
          directoryStatus: next,
          consentChangedAt: now,
          consentNoticeVersion: ARTISAN_DIRECTORY_NOTICE_VERSION,
        },
      });
      await tx.artisanConsentEvent.create({
        data: {
          artisanId: invitation.artisanId,
          previousStatus: artisan.directoryStatus,
          newStatus: next,
          source: 'INVITATION_LINK',
          noticeVersion: ARTISAN_DIRECTORY_NOTICE_VERSION,
          invitationId: invitation.id,
          phoneLast2: artisan.phone.slice(-2),
        },
      });
    });
    return { directoryStatus: next };
  }

  // ── Annuaire public ──────────────────────────────────────────────────

  // withPhone : seulement pour un propriétaire, un gestionnaire ou l'admin
  // connecté (ArtisansController) — jamais depuis la route publique.
  async findAllPublic(query: ListPublicArtisansQueryDto, withPhone = false): Promise<PaginatedPublicArtisans> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ArtisanWhereInput = { ...this.artisanFilter(query), directoryStatus: 'PUBLIC' };
    const [artisans, total] = await Promise.all([
      this.prisma.artisan.findMany({
        where,
        orderBy: [{ verifiedAt: { sort: 'desc', nulls: 'last' } }, { ratingAverage: 'desc' }, { displayName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.artisan.count({ where }),
    ]);
    return { data: artisans.map((a) => toPublicSummary(a, withPhone)), page, limit, total };
  }

  async findOnePublic(id: string, withPhone = false): Promise<PublicArtisanDetail> {
    const artisan = await this.prisma.artisan.findFirst({
      where: { id, directoryStatus: 'PUBLIC' },
      include: {
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            author: { select: { firstName: true, lastName: true } },
            supportRequest: { select: { trade: true } },
          },
        },
      },
    });
    if (!artisan) throw new NotFoundException('Artisan introuvable');
    return {
      ...toPublicSummary(artisan, withPhone),
      reviews: artisan.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        trade: r.supportRequest.trade,
        authorName: shortName(r.author.firstName, r.author.lastName),
      })),
    };
  }

  // ── Administration ───────────────────────────────────────────────────

  async adminList(query: AdminListArtisansQueryDto): Promise<PaginatedAdminArtisans> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: Prisma.ArtisanWhereInput = {
      ...this.artisanFilter(query),
      ...(query.status ? { directoryStatus: query.status } : {}),
    };
    const [artisans, total] = await Promise.all([
      this.prisma.artisan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { contacts: true } },
        },
      }),
      this.prisma.artisan.count({ where }),
    ]);
    const data: AdminArtisanView[] = artisans.map((a) => ({
      ...toPublicSummary(a, true),
      phone: a.phone,
      directoryStatus: a.directoryStatus,
      suspensionReason: a.suspensionReason,
      consentChangedAt: a.consentChangedAt,
      contactsCount: a._count.contacts,
      createdByName: `${a.createdBy.firstName} ${a.createdBy.lastName}`.trim(),
      createdAt: a.createdAt,
    }));
    return { data, page, limit, total };
  }

  async adminSetVerified(admin: AuthenticatedUser, id: string, verified: boolean): Promise<Artisan> {
    await this.getArtisanOrThrow(id);
    return this.prisma.artisan.update({
      where: { id },
      data: verified ? { verifiedAt: new Date(), verifiedById: admin.id } : { verifiedAt: null, verifiedById: null },
    });
  }

  async adminSuspend(admin: AuthenticatedUser, id: string, reason: string): Promise<Artisan> {
    const artisan = await this.getArtisanOrThrow(id);
    if (artisan.directoryStatus === 'SUSPENDED') throw new ConflictException('Artisan déjà retiré');
    return this.prisma.$transaction(async (tx) => {
      await tx.artisanConsentEvent.create({
        data: {
          artisanId: id,
          previousStatus: artisan.directoryStatus,
          newStatus: 'SUSPENDED',
          source: 'ADMIN',
          actorUserId: admin.id,
        },
      });
      return tx.artisan.update({
        where: { id },
        data: { directoryStatus: 'SUSPENDED', suspensionReason: reason },
      });
    });
  }

  // Remet l'artisan dans l'état d'avant le retrait (public seulement s'il
  // avait lui-même accepté) — jamais une publication sans son accord.
  async adminReinstate(admin: AuthenticatedUser, id: string): Promise<Artisan> {
    const artisan = await this.getArtisanOrThrow(id);
    if (artisan.directoryStatus !== 'SUSPENDED') throw new ConflictException("Cet artisan n'est pas retiré");
    const lastSuspension = await this.prisma.artisanConsentEvent.findFirst({
      where: { artisanId: id, newStatus: 'SUSPENDED' },
      orderBy: { createdAt: 'desc' },
      select: { previousStatus: true },
    });
    const restored = lastSuspension?.previousStatus ?? 'PRIVATE';
    return this.prisma.$transaction(async (tx) => {
      await tx.artisanConsentEvent.create({
        data: {
          artisanId: id,
          previousStatus: 'SUSPENDED',
          newStatus: restored,
          source: 'ADMIN',
          actorUserId: admin.id,
        },
      });
      return tx.artisan.update({
        where: { id },
        data: { directoryStatus: restored, suspensionReason: null },
      });
    });
  }

  // ── Interne ──────────────────────────────────────────────────────────

  private artisanFilter(query: { trade?: ListArtisansQueryDto['trade']; zone?: string; search?: string }): Prisma.ArtisanWhereInput {
    return {
      ...(query.trade ? { trades: { has: query.trade } } : {}),
      ...(query.zone ? { zones: { has: normalizeZone(query.zone) } } : {}),
      ...(query.search ? { displayName: { contains: query.search, mode: 'insensitive' } } : {}),
    };
  }

  private async addExistingToContacts(
    user: AuthenticatedUser,
    artisan: Artisan,
    privateNote: string | undefined,
  ): Promise<ArtisanContactView> {
    try {
      await this.prisma.artisanContact.create({
        data: { userId: user.id, artisanId: artisan.id, privateNote: emptyToNull(privateNote) },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`${artisan.displayName} est déjà dans votre carnet (même numéro).`);
      }
      throw error;
    }
    return this.getContactView(user, artisan.id);
  }

  private async getContactOrThrow(user: AuthenticatedUser, artisanId: string): Promise<ContactRow> {
    const contact = await this.prisma.artisanContact.findUnique({
      where: { userId_artisanId: { userId: user.id, artisanId } },
      select: CONTACT_SELECT,
    });
    if (!contact) throw new NotFoundException('Artisan absent de votre carnet');
    return contact;
  }

  private async getContactView(user: AuthenticatedUser, artisanId: string): Promise<ArtisanContactView> {
    return this.toContactView(user, await this.getContactOrThrow(user, artisanId));
  }

  private async getArtisanOrThrow(id: string): Promise<Artisan> {
    const artisan = await this.prisma.artisan.findUnique({ where: { id } });
    if (!artisan) throw new NotFoundException('Artisan introuvable');
    return artisan;
  }

  private async getUsableInvitation(token: string): Promise<UsableInvitation> {
    const data = verifyToken<InvitationTokenData>(token, 'artisan-consent', this.secret());
    if (!data || typeof data.i !== 'string') throw new BadRequestException('Lien invalide');
    const invitation = await this.prisma.artisanInvitation.findUnique({
      where: { id: data.i },
      include: {
        artisan: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!invitation) throw new BadRequestException('Lien invalide');
    if (invitation.usedAt) throw new GoneException('Ce lien a déjà été utilisé.');
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Ce lien a expiré : demandez-en un nouveau à la personne qui vous l’a envoyé.');
    }
    return invitation;
  }

  private canEditDetails(user: AuthenticatedUser, artisan: Artisan): boolean {
    return artisan.createdById === user.id && EDITABLE_BY_CREATOR.includes(artisan.directoryStatus);
  }

  private toContactView(user: AuthenticatedUser, row: ContactRow): ArtisanContactView {
    const { artisan } = row;
    const pending = artisan.invitations[0];
    return {
      id: artisan.id,
      displayName: artisan.displayName,
      phone: artisan.phone,
      trades: artisan.trades,
      zones: artisan.zones,
      directoryStatus: artisan.directoryStatus,
      verified: artisan.verifiedAt !== null,
      ratingAverage: artisan.ratingAverage,
      ratingCount: artisan.ratingCount,
      privateNote: row.privateNote,
      canEditDetails: this.canEditDetails(user, artisan),
      addedAt: row.createdAt,
      invitationPendingUntil:
        pending && pending.expiresAt.getTime() > Date.now() ? pending.expiresAt : null,
    };
  }

  private secret(): string {
    return this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
  }

  private frontendUrl(): string {
    return this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/+$/, '');
  }
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toPublicSummary(a: Artisan, withPhone: boolean): PublicArtisanSummary {
  return {
    id: a.id,
    displayName: a.displayName,
    phone: withPhone ? a.phone : null,
    trades: a.trades,
    zones: a.zones,
    verified: a.verifiedAt !== null,
    ratingAverage: a.ratingAverage,
    ratingCount: a.ratingCount,
  };
}

