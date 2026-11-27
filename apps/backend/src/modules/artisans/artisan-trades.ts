import { ArtisanTrade } from '@prisma/client';

// Libellés français des métiers — utilisés dans les emails et les messages
// préremplis (le frontend a sa propre copie pour l'affichage).
export const ARTISAN_TRADE_LABELS: Record<ArtisanTrade, string> = {
  PLUMBER: 'Plomberie',
  ELECTRICIAN: 'Électricité',
  MASON: 'Maçonnerie',
  CARPENTER: 'Menuiserie',
  PAINTER: 'Peinture',
  AIR_CONDITIONING: 'Climatisation',
  LOCKSMITH: 'Serrurerie',
  GLAZIER: 'Vitrerie',
  WELDER: 'Soudure',
  TILER: 'Carrelage',
  OTHER: 'Autre',
};

export function tradeLabel(trade: ArtisanTrade | null | undefined): string {
  return trade ? ARTISAN_TRADE_LABELS[trade] : 'Non précisé';
}
