// Liefert alle Easyverein-Termine, deren Name (nach trim) mit "JF" beginnt
// (z.B. "JF", "JF mit Stephan", "JF mit Christiane", "JF telefonisch", ...),
// chronologisch sortiert samt Beschreibung. Läuft server-seitig, weil der
// Easyverein-API-Key (EV_API_KEY, als Function-Secret gesetzt) niemals im
// Browser landen darf - siehe gleiches Prinzip in llp-schulkontakte-editor
// und llp-termine-suche.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EV_BASE_URL = "https://easyverein.com/api/v2.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

interface EvEvent {
  id: number;
  name: string;
  start: string | null;
  description: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return jsonResponse({ error: "Nur GET erlaubt." }, 405);
  }

  const evApiKey = Deno.env.get("EV_API_KEY");
  if (!evApiKey) {
    return jsonResponse({ error: "EV_API_KEY ist als Function-Secret nicht konfiguriert." }, 500);
  }

  const evHeaders = { Authorization: `Bearer ${evApiKey}` };

  let url: string | null = `${EV_BASE_URL}/event/?search=JF&limit=100`;
  const all: EvEvent[] = [];

  try {
    while (url) {
      const resp = await fetch(url, { headers: evHeaders });
      if (!resp.ok) {
        return jsonResponse({ error: `Easyverein-Fehler (${resp.status})` }, 502);
      }
      const data = await resp.json();
      for (const e of data.results ?? []) {
        all.push({
          id: e.id,
          name: e.name ?? "",
          start: e.start ?? null,
          description: e.description ?? "",
        });
      }
      url = data.next ?? null;
    }
  } catch (err) {
    return jsonResponse({ error: `Verbindungsfehler zu Easyverein: ${err}` }, 502);
  }

  const jfEvents = all
    .filter((e) => e.name.trim().toLowerCase().startsWith("jf"))
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));

  return jsonResponse({ events: jfEvents }, 200);
});
