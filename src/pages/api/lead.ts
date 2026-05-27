import type { APIRoute } from 'astro';
import { Resolver } from 'node:dns/promises';
import https from 'node:https';

// Serverless route — never prerender.
export const prerender = false;

const HUBSPOT_HOST = 'api.hsforms.com';
const HUBSPOT_PORTAL_ID = '19575552';
const HUBSPOT_FORM_ID = '8db66949-101b-4205-8602-84d360d28bab';
const HUBSPOT_PATH = `/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;
const HUBSPOT_URL = `https://${HUBSPOT_HOST}${HUBSPOT_PATH}`;

// Manual resolver only used as fallback when the system DNS can't resolve
// api.hsforms.com (e.g. `pnpm dev` behind a pi-hole / corporate filter).
// In production (Vercel) system DNS works fine and the fallback is never hit.
// Lazy-instantiated because some serverless runtimes don't allow UDP DNS
// queries to public resolvers — touching it at module load would crash boot.
let fallbackResolver: Resolver | null = null;
function getFallbackResolver(): Resolver {
  if (!fallbackResolver) {
    fallbackResolver = new Resolver();
    fallbackResolver.setServers(['1.1.1.1', '8.8.8.8']);
  }
  return fallbackResolver;
}

// Internal names del form en HubSpot. Algunos están en español
// (auto-generados desde el label) en vez de los estándar en inglés.
// Confirmado vía test brute-force contra el form f9390f8d:
//   - "Número de teléfono" → celular (no `phone`)
const FIELD_MAP: Record<string, string> = {
  nombre: 'firstname',
  apellido: 'lastname',
  celular: 'phone',
  correo: 'email',
  comentario: 'message',
  proposito: 'tipologia_proyecto',
  contactoTelefonico: 'contacto_telefonico',
  origenContacto: 'origen_contacto',
  consent: 'acepto_el_tratamiento_de_mis_datos_personales__las__a_href__http___iactual_co_wp_content_uploads_20',
};

const CONSENT_TEXT =
  'Autorizo a recibir información del proyecto a mi correo electrónico y autorizo el uso de mis datos según la política de tratamiento de datos personales.';

async function postToHubspot(
  payload: unknown,
): Promise<{ status: number; body: string }> {
  const body = JSON.stringify(payload);
  // Primary path: Node's global fetch (uses system DNS). Works on Vercel.
  try {
    const res = await fetch(HUBSPOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    if (!isDnsError(err)) throw err;
    // Fallback: manual https with hostname resolved via 1.1.1.1.
    // Only hit when the box's DNS NXDOMAINs api.hsforms.com.
    return postViaManualDns(Buffer.from(body, 'utf8'));
  }
}

function isDnsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  const causeCode = (
    (err as { cause?: NodeJS.ErrnoException })?.cause as
      | NodeJS.ErrnoException
      | undefined
  )?.code;
  const dnsCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'EAI_NODATA']);
  return dnsCodes.has(code ?? '') || dnsCodes.has(causeCode ?? '');
}

async function postViaManualDns(
  body: Buffer,
): Promise<{ status: number; body: string }> {
  const addresses = await getFallbackResolver().resolve4(HUBSPOT_HOST);
  const ip = addresses[0];
  if (!ip) throw new Error(`no_a_record_for_${HUBSPOT_HOST}`);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        port: 443,
        method: 'POST',
        path: HUBSPOT_PATH,
        servername: HUBSPOT_HOST, // SNI for TLS cert validation
        headers: {
          Host: HUBSPOT_HOST,
          'Content-Type': 'application/json',
          'Content-Length': String(body.byteLength),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const fields = Object.entries(FIELD_MAP)
    .map(([local, hsName]) => {
      let value = String(body[local] ?? '').trim();
      if (local === 'consent') value = value ? 'true' : '';
      return { objectTypeId: '0-1', name: hsName, value };
    })
    .filter((f) => f.value.length > 0);

  const email = fields.find((f) => f.name === 'email')?.value;
  if (!email) {
    return json({ ok: false, error: 'missing_email' }, 400);
  }

  const payload = {
    submittedAt: Date.now(),
    fields,
    context: {
      pageUri: typeof body.pageUri === 'string' ? body.pageUri : '',
      pageName: typeof body.pageName === 'string' ? body.pageName : 'Vecta 98',
    },
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: CONSENT_TEXT,
        communications: [
          { value: true, subscriptionTypeId: 999, text: CONSENT_TEXT },
        ],
      },
    },
  };

  try {
    const res = await postToHubspot(payload);
    if (res.status < 200 || res.status >= 300) {
      console.error('HubSpot rejected submit:', res.status, res.body);
      return json(
        { ok: false, error: 'hubspot_rejected', status: res.status, detail: res.body },
        502,
      );
    }
    console.log('HubSpot accepted submit:', res.status, res.body);
    return json({ ok: true, hs_status: res.status, hs_body: res.body });
  } catch (err) {
    console.error('Network error reaching HubSpot:', err);
    return json({ ok: false, error: 'network_error' }, 502);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
