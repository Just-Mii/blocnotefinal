// Helper functions for encoding/decoding widget secrets.
// Each secret value is base64-encoded at rest.
// Production could use AES-256 with WIDGET_ENCRYPTION_KEY.

export function encodeSecrets(
  secrets: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(secrets)) {
    out[k] = Buffer.from(v, 'utf8').toString('base64')
  }
  return out
}

export function decodeSecrets(
  encoded: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(encoded)) {
    try {
      out[k] = Buffer.from(v, 'base64').toString('utf8')
    } catch {
      out[k] = v
    }
  }
  return out
}
