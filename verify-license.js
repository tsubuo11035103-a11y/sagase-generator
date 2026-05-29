export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, error: 'Method Not Allowed' });
  }

  const expected = process.env.LICENSE_KEY;
  if (!expected) {
    return res.status(500).json({ valid: false, error: 'LICENSE_KEY is not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const input = String(body.licenseKey || '').trim().toUpperCase();
  const normalizedExpected = String(expected).trim().toUpperCase();

  if (input === normalizedExpected) {
    return res.status(200).json({ valid: true });
  }

  return res.status(401).json({ valid: false });
}
