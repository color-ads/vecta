import { Resolver } from 'node:dns/promises';
import https from 'node:https';

const prerender = false;
const HUBSPOT_HOST = "api.hsforms.com";
const HUBSPOT_PORTAL_ID = "44459766";
const HUBSPOT_FORM_ID = "f9390f8d-a76b-4b5f-9de1-544a208f4358";
const HUBSPOT_PATH = `/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;
const HUBSPOT_URL = `https://${HUBSPOT_HOST}${HUBSPOT_PATH}`;
let fallbackResolver = null;
function getFallbackResolver() {
  if (!fallbackResolver) {
    fallbackResolver = new Resolver();
    fallbackResolver.setServers(["1.1.1.1", "8.8.8.8"]);
  }
  return fallbackResolver;
}
const FIELD_MAP = {
  nombre: "firstname",
  apellido: "lastname",
  celular: "celular",
  correo: "email",
  comentario: "message",
  proposito: "proposito",
  contactoTelefonico: "contacto_telefonico",
  origenContacto: "origen_contacto"
};
const CONSENT_TEXT = "Autorizo a recibir información del proyecto a mi correo electrónico y autorizo el uso de mis datos según la política de tratamiento de datos personales.";
async function postToHubspot(payload) {
  const body = JSON.stringify(payload);
  try {
    const res = await fetch(HUBSPOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    if (!isDnsError(err)) throw err;
    return postViaManualDns(Buffer.from(body, "utf8"));
  }
}
function isDnsError(err) {
  const code = err?.code;
  const causeCode = err?.cause?.code;
  const dnsCodes = /* @__PURE__ */ new Set(["ENOTFOUND", "EAI_AGAIN", "EAI_NODATA"]);
  return dnsCodes.has(code ?? "") || dnsCodes.has(causeCode ?? "");
}
async function postViaManualDns(body) {
  const addresses = await getFallbackResolver().resolve4(HUBSPOT_HOST);
  const ip = addresses[0];
  if (!ip) throw new Error(`no_a_record_for_${HUBSPOT_HOST}`);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        port: 443,
        method: "POST",
        path: HUBSPOT_PATH,
        servername: HUBSPOT_HOST,
        // SNI for TLS cert validation
        headers: {
          Host: HUBSPOT_HOST,
          "Content-Type": "application/json",
          "Content-Length": String(body.byteLength)
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on(
          "end",
          () => resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8")
          })
        );
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const fields = Object.entries(FIELD_MAP).map(([local, hsName]) => ({
    objectTypeId: "0-1",
    name: hsName,
    value: String(body[local] ?? "").trim()
  })).filter((f) => f.value.length > 0);
  const email = fields.find((f) => f.name === "email")?.value;
  if (!email) {
    return json({ ok: false, error: "missing_email" }, 400);
  }
  const payload = {
    submittedAt: Date.now(),
    fields,
    context: {
      pageUri: typeof body.pageUri === "string" ? body.pageUri : "",
      pageName: typeof body.pageName === "string" ? body.pageName : "Vecta 98"
    },
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: CONSENT_TEXT,
        communications: [
          { value: true, subscriptionTypeId: 999, text: CONSENT_TEXT }
        ]
      }
    }
  };
  try {
    const res = await postToHubspot(payload);
    if (res.status < 200 || res.status >= 300) {
      console.error("HubSpot rejected submit:", res.status, res.body);
      return json(
        { ok: false, error: "hubspot_rejected", status: res.status, detail: res.body },
        502
      );
    }
    return json({ ok: true });
  } catch (err) {
    console.error("Network error reaching HubSpot:", err);
    return json({ ok: false, error: "network_error" }, 502);
  }
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
