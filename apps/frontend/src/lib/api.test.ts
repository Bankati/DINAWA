import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError, API_URL, subscribeApiLoading, getBlob } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("api", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get() renvoie le corps JSON parsé sur une réponse 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.get<{ id: string }>("/properties/1");

    expect(result).toEqual({ id: "1" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/properties/1`,
      expect.any(Object),
    );
  });

  it("lève une ApiError avec le message du corps sur une réponse non-ok", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Bien introuvable" }, 404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/properties/absent")).rejects.toMatchObject(
      new ApiError(404, { message: "Bien introuvable" }),
    );
  });

  it("ApiError retombe sur un message générique si le corps n’a pas de message", () => {
    const err = new ApiError(500, null);
    expect(err.message).toBe("Erreur API (500)");
    expect(err.status).toBe(500);
  });

  it("ajoute le Bearer token depuis localStorage si présent", async () => {
    localStorage.setItem("warah_access_token", "tok-123");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/auth/me");

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("post() sérialise un objet en JSON mais laisse passer FormData tel quel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await api.post("/properties", { address: "1 rue Test" });
    const [, jsonOptions] = fetchMock.mock.calls[0];
    expect(jsonOptions.body).toBe(JSON.stringify({ address: "1 rue Test" }));

    const fd = new FormData();
    fd.append("file", "x");
    await api.post("/properties/1/photos", fd);
    const [, fdOptions] = fetchMock.mock.calls[1];
    expect(fdOptions.body).toBe(fd);
  });

  it("rafraîchit le token une seule fois sur un 401 puis réessaie la requête", async () => {
    localStorage.setItem("warah_access_token", "expired-tok");
    localStorage.setItem("warah_refresh_token", "refresh-tok");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === `${API_URL}/auth/refresh`) {
        return Promise.resolve(
          jsonResponse({ accessToken: "new-tok", refreshToken: "new-refresh" }),
        );
      }
      if (url === `${API_URL}/properties/1`) {
        const alreadyRetried =
          fetchMock.mock.calls.filter((c: unknown[]) => c[0] === url).length >
          1;
        return Promise.resolve(
          alreadyRetried ? jsonResponse({ id: "1" }) : jsonResponse(null, 401),
        );
      }
      throw new Error(`URL inattendue dans le test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.get<{ id: string }>("/properties/1");

    expect(result).toEqual({ id: "1" });
    expect(localStorage.getItem("warah_access_token")).toBe("new-tok");
  });

  it("subscribeApiLoading notifie true puis false autour d’une requête", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const states: boolean[] = [];
    const unsubscribe = subscribeApiLoading((loading) => states.push(loading));

    await api.get("/health");
    unsubscribe();

    expect(states).toEqual([true, false]);
  });

  it("getBlob() renvoie un Blob authentifié pour une réponse binaire", async () => {
    localStorage.setItem("warah_access_token", "tok-123");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("%PDF-1.4", {
          status: 200,
          headers: { "content-type": "application/pdf" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBlob("/payments/1/receipt.pdf");

    // Pas de toBeInstanceOf(Blob) ici : jsdom et le fetch natif de Node
    // exposent chacun leur propre constructeur Blob (deux réalités JS
    // différentes) — on vérifie la forme plutôt que l'identité de classe.
    expect(result.size).toBeGreaterThan(0);
    expect(typeof result.arrayBuffer).toBe("function");
    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok-123");
  });
});
