// Speichert das Beschreibungsfeld eines einzelnen JF-Termins zurueck nach
// Easyverein. Prueft vor dem Schreiben erneut, dass der Termin-Name mit "JF"
// beginnt (Schutz, falls die id clientseitig manipuliert wird) - siehe
// jf-list/index.ts fuer den gleichen Filter.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EV_BASE_URL = "https://easyverein.com/api/v2.0";
const MAX_DESCRIPTION_LENGTH = 200000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "PATCH") {
    return jsonResponse({ error: "Nur PATCH erlaubt." }, 405);
  }

  let body: { id?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Ungueltiger Request-Body (JSON erwartet)." }, 400);
  }

  const id = typeof body.id === "number" ? body.id : Number(body.id);
  const description = typeof body.description === "string" ? body.description : null;

  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse({ error: "id fehlt oder ist ungueltig." }, 400);
  }
  if (description === null) {
    return jsonResponse({ error: "description fehlt oder ist kein String." }, 400);
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return jsonResponse({ error: "description ist zu lang." }, 400);
  }

  const evApiKey = Deno.env.get("EV_API_KEY");
  if (!evApiKey) {
    return jsonResponse({ error: "EV_API_KEY ist als Function-Secret nicht konfiguriert." }, 500);
  }

  const evHeaders = { Authorization: `Bearer ${evApiKey}` };
  const eventUrl = `${EV_BASE_URL}/event/${id}/`;

  let currentName = "";
  try {
    const getResp = await fetch(eventUrl, { headers: evHeaders });
    if (getResp.status === 404) {
      return jsonResponse({ error: "Termin nicht gefunden." }, 404);
    }
    if (!getResp.ok) {
      return jsonResponse({ error: `Easyverein-Fehler beim Lesen (${getResp.status})` }, 502);
    }
    const current = await getResp.json();
    currentName = String(current.name ?? "");
  } catch (err) {
    return jsonResponse({ error: `Verbindungsfehler zu Easyverein: ${err}` }, 502);
  }

  if (!currentName.trim().toLowerCase().startsWith("jf")) {
    return jsonResponse({ error: "Dieser Termin ist kein JF-Termin." }, 403);
  }

  try {
    const patchResp = await fetch(eventUrl, {
      method: "PATCH",
      headers: { ...evHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    if (!patchResp.ok) {
      const text = await patchResp.text();
      return jsonResponse({ error: `Easyverein-Fehler beim Speichern (${patchResp.status}): ${text}` }, 502);
    }
    const updated = await patchResp.json();
    return jsonResponse({ id: updated.id, description: updated.description }, 200);
  } catch (err) {
    return jsonResponse({ error: `Verbindungsfehler zu Easyverein: ${err}` }, 502);
  }
});
