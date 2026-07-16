import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { parse as parseMrz } from 'mrz';

// Marqueurs et pattern déduits d'un exemplaire réel de CNI togolaise — le
// texte imprimé n'a AUCUN accent ("REPUBLIQUE", "IDENTITE"), contrairement à
// une première hypothèse. Le texte OCR est normalisé (accents retirés) avant
// comparaison pour rester robuste dans les deux sens.
const REQUIRED_MARKERS = ['REPUBLIQUE TOGOLAISE', "CARTE NATIONALE D'IDENTITE"];

// Champ « Numéro » de la CNI togolaise : 3 groupes séparés par un tiret,
// 4-3-4 chiffres (ex. 0000-000-0000). Le séparateur est toléré en espace au
// cas où l'OCR remplace le tiret.
const CNI_NUMBER_PATTERN = /\d{4}[-\s]\d{3}[-\s]\d{4}/;

// Une photo de CNI prise au téléphone arrive très souvent rotée (carte tenue
// en paysage, photo prise en portrait) sans métadonnée EXIF fiable pour la
// redresser automatiquement — Tesseract ne corrige aucune orientation seul
// et produit du texte incompréhensible sur une image de travers. On essaie
// les 4 rotations cardinales et on garde la première qui satisfait les
// règles (0° d'abord, cas le plus courant, sans passer par sharp).
const ROTATIONS_TO_TRY = [0, 90, 180, 270] as const;

// Le verso liste « Personne à prévenir » suivi du nom, de la localité et du
// téléphone sur une même ligne (ex. « BANKATI,DOUTI DJAMBERE,GANDO,90330557 »)
// — on capture toute la ligne après le label, tolérant l'absence d'accent et
// de « : ».
const EMERGENCY_CONTACT_LABEL_PATTERN = /PERSONNE\s*[AÀ]\s*PR[EÉ]VENIR\s*:?\s*(.+)/i;

// Numéros togolais : 8 chiffres, sans indicatif. Le dernier groupe de 8
// trouvé sur la ligne est retenu (le numéro est toujours en fin de ligne sur
// le format observé — nom puis localité puis téléphone).
const PHONE_PATTERN = /\d{8}/g;

// Une ligne MRZ (format TD1) fait 30 caractères, uniquement composée de
// lettres/chiffres/`<` — le remplissage `<` est très caractéristique et
// permet de la distinguer d'une ligne de texte libre du verso.
const MRZ_LINE_PATTERN = /^[A-Z0-9<]{25,35}$/;
const MRZ_MIN_FILLER_CHARS = 3;

export type OcrFrontResult =
  | { status: 'VERIFIED'; rawText: string; reason?: undefined }
  | { status: 'REJECTED'; rawText: string; reason: string };

export type OcrBackResult = {
  rawText: string;
  emergencyContactRaw: string | null;
  emergencyContactPhone: string | null;
  mrzChecksumValid: boolean | null;
};

function normalize(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function findMissingMarkers(rawText: string): string[] {
  const normalizedText = normalize(rawText);
  return REQUIRED_MARKERS.filter((marker) => !normalizedText.includes(normalize(marker)));
}

function extractEmergencyContact(rawText: string): {
  raw: string | null;
  phone: string | null;
} {
  const match = EMERGENCY_CONTACT_LABEL_PATTERN.exec(rawText);
  if (!match) return { raw: null, phone: null };

  const raw = match[1].split('\n')[0].trim();
  if (raw.length === 0) return { raw: null, phone: null };

  const phoneMatches = raw.match(PHONE_PATTERN);
  const phone = phoneMatches ? phoneMatches[phoneMatches.length - 1] : null;
  return { raw, phone };
}

// Signal secondaire — jamais une autorité de décision à lui seul, la police
// dense de la MRZ produit fréquemment du bruit OCR. On se contente de
// localiser 3 lignes candidates (remplissage `<` caractéristique) et de
// tenter un parsing ; toute incapacité à localiser ou parser retourne `null`
// (« pas de signal »), jamais une exception.
function checkMrzChecksum(rawText: string): boolean | null {
  const candidateLines = rawText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ''))
    .filter(
      (line) =>
        MRZ_LINE_PATTERN.test(line) && (line.match(/</g)?.length ?? 0) >= MRZ_MIN_FILLER_CHARS,
    );

  if (candidateLines.length < 3) return null;

  try {
    return parseMrz(candidateLines.slice(-3)).valid;
  } catch {
    return null;
  }
}

// Service OCR pur — aucune dépendance à Prisma, au stockage ou aux profils.
// Reçoit une image, renvoie une décision. L'orchestration (verrou, upload,
// timeout, persistance) est de la responsabilité d'IdentityService.
@Injectable()
export class IdentityVerificationService {
  async verifyFront(imageBuffer: Buffer): Promise<OcrFrontResult> {
    // errorHandler obligatoire : sans lui, une image illisible/corrompue fait
    // planter tout le process Node (tesseract.js/createWorker.js fait un
    // `throw` synchrone dans son gestionnaire de message si aucun handler
    // n'est fourni, en dehors du chemin promesse de `recognize()`). Avec le
    // handler, la promesse `recognize()` rejette normalement et remonte
    // jusqu'au `catch` de l'appelant.
    const worker = await createWorker('fra+eng', undefined, { errorHandler: () => {} });
    let bestAttempt: { rawText: string; missingMarkers: string[]; hasNumber: boolean } | undefined;

    try {
      for (const rotation of ROTATIONS_TO_TRY) {
        const candidate =
          rotation === 0 ? imageBuffer : await sharp(imageBuffer).rotate(rotation).toBuffer();

        const { data } = await worker.recognize(candidate);
        const missingMarkers = findMissingMarkers(data.text);
        const hasNumber = CNI_NUMBER_PATTERN.test(data.text);

        if (missingMarkers.length === 0 && hasNumber) {
          return { status: 'VERIFIED', rawText: data.text };
        }

        if (!bestAttempt || missingMarkers.length < bestAttempt.missingMarkers.length) {
          bestAttempt = { rawText: data.text, missingMarkers, hasNumber };
        }
      }

      const attempt = bestAttempt as {
        rawText: string;
        missingMarkers: string[];
        hasNumber: boolean;
      };
      if (attempt.missingMarkers.length > 0) {
        return {
          status: 'REJECTED',
          reason: `Marqueurs manquants: ${attempt.missingMarkers.join(', ')}`,
          rawText: attempt.rawText,
        };
      }
      return {
        status: 'REJECTED',
        reason: 'Numéro de CNI introuvable ou format invalide',
        rawText: attempt.rawText,
      };
    } finally {
      await worker.terminate();
    }
  }

  // Best-effort, jamais bloquant : échec de lecture => champs `null`, jamais
  // d'exception qui remonterait jusqu'à impacter la décision VERIFIED/REJECTED
  // du recto (voir IdentityVerificationListener).
  async verifyBack(imageBuffer: Buffer): Promise<OcrBackResult> {
    const worker = await createWorker('fra+eng', undefined, { errorHandler: () => {} });
    let lastText = '';

    try {
      for (const rotation of ROTATIONS_TO_TRY) {
        const candidate =
          rotation === 0 ? imageBuffer : await sharp(imageBuffer).rotate(rotation).toBuffer();

        const { data } = await worker.recognize(candidate);
        lastText = data.text;

        const { raw, phone } = extractEmergencyContact(data.text);
        if (raw) {
          return {
            rawText: data.text,
            emergencyContactRaw: raw,
            emergencyContactPhone: phone,
            mrzChecksumValid: checkMrzChecksum(data.text),
          };
        }
      }

      return {
        rawText: lastText,
        emergencyContactRaw: null,
        emergencyContactPhone: null,
        mrzChecksumValid: checkMrzChecksum(lastText),
      };
    } finally {
      await worker.terminate();
    }
  }
}
