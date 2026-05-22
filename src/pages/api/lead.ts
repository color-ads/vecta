import type { APIRoute } from 'astro';
import { Resolver } from 'node:dns/promises';
import https from 'node:https';

// Serverless route — never prerender.
export const prerender = false;

const HUBSPOT_HOST = 'api.hsforms.com';
const HUBSPOT_PORTAL_ID = '44459766';
const HUBSPOT_FORM_ID = 'f9390f8d-a76b-4b5f-9de1-544a208f4358';
const HUBSPOT_PATH = `/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;

// Node's global fetch resolves hostnames via the OS resolver (dns.lookup).
// Some local networks (pi-hole, AdGuard, corporate filters) NXDOMAIN
// api.hsforms.com, breaking `pnpm dev`. Resolve via Cloudflare/Google
// explicitly so the proxy works regardless of the box's DNS.
const resolver = new Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);

// Internal names del form en HubSpot. Algunos están en español
// (auto-generados desde el label) en vez de los estándar en inglés.
// Confirmado vía test brute-force contra el form f9390f8d:
//   - "Número de teléfono" → celular (no `phone`)
const FIELD_MAP: Record<string, string> = {
  nombre: 'firstname',
  apellido: 'lastname',
  celular: 'celular',
  correo: 'email',
  comentario: 'message',
  proposito: 'proposito',
  contactoTelefonico: 'contacto_telefonico',
  origenContacto: 'origen_contacto',
};

const CONSENT_TEXT =
  'Autorizo a recibir información del proyecto a mi correo electrónico y autorizo el uso de mis datos según la política de tratamiento de datos personales.';

function postToHubspot(payload: unknown): Promise<{ status: number; body: string }> {
  return resolver.resolve4(HUBSPOT_HOST).then(
    (addresses) =>
      new Promise((resolve, reject) => {
        const ip = addresses[0];
        if (!ip) {
          reject(new Error(`no_a_record_for_${HUBSPOT_HOST}`));
          return;
        }
        const data = Buffer.from(JSON.stringify(payload), 'utf8');
        const req = https.request(
          {
            host: ip,
            port: 443,
            method: 'POST',
            path: HUBSPOT_PATH,
            // SNI must be the real hostname so TLS cert validation succeeds.
            servername: HUBSPOT_HOST,
            headers: {
              Host: HUBSPOT_HOST,
              'Content-Type': 'application/json',
              'Content-Length': String(data.byteLength),
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
        req.write(data);
        req.end();
      }),
  );
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const fields = Object.entries(FIELD_MAP)
    .map(([local, hsName]) => ({
      objectTypeId: '0-1',
      name: hsName,
      value: String(body[local] ?? '').trim(),
    }))
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
    return json({ ok: true });
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
