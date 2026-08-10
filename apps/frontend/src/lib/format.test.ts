import { describe, it, expect } from "vitest";
import { formatNumber, formatFcfa, initiales } from "./format";

describe("formatNumber", () => {
  it("sépare les milliers avec un espace normal", () => {
    expect(formatNumber(1000)).toBe("1 000");
    expect(formatNumber(1234567)).toBe("1 234 567");
  });

  it("ne touche pas aux nombres de moins de 4 chiffres", () => {
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(0)).toBe("0");
  });

  it("arrondit les décimales", () => {
    expect(formatNumber(1000.6)).toBe("1 001");
  });

  it("n'utilise jamais l'espace fine insécable U+202F", () => {
    expect(formatNumber(1000)).not.toContain(" ");
  });
});

describe("formatFcfa", () => {
  it("ajoute le suffixe FCFA", () => {
    expect(formatFcfa(30000)).toBe("30 000 FCFA");
  });

  it("gère zéro", () => {
    expect(formatFcfa(0)).toBe("0 FCFA");
  });
});

describe("initiales", () => {
  it("combine la première lettre du prénom et du nom en majuscules", () => {
    expect(initiales("ama", "kodjo")).toBe("AK");
  });

  it("gère un seul nom fourni", () => {
    expect(initiales("Jean", undefined)).toBe("J");
    expect(initiales(undefined, "Dupont")).toBe("D");
  });

  it("retourne le fallback par défaut si rien n’est fourni", () => {
    expect(initiales(undefined, undefined)).toBe("?");
  });

  it("accepte un fallback personnalisé", () => {
    expect(initiales(undefined, undefined, "AD")).toBe("AD");
  });
});
