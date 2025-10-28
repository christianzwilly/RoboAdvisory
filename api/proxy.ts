import type { VercelRequest, VercelResponse } from '@vercel/node'

// Forward /api/proxy/* to TARGET_API_BASE
const TARGET = process.env.TARGET_API_BASE!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!TARGET) {
    res.status(500).json({ error: 'TARGET_API_BASE is not set' });
    return;
  }
  const forwardPath = req.url?.replace(/^\/api\/proxy/, '') || '';
  const url = TARGET.replace(/\/$/, '') + forwardPath;

  const init: RequestInit = {
    method: req.method,
    headers: {
      'content-type': (req.headers['content-type'] as string) || 'application/json',
      // pass through basic authz headers if present (optional)
      ...(req.headers.authorization ? { authorization: req.headers.authorization as string } : {}),
    },
    body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : (req as any).rawBody,
  };

  try {
    const r = await fetch(url, init);
    const ab = await r.arrayBuffer();
    res.status(r.status);
    r.headers.forEach((v, k) => {
      if (!/^transfer-encoding|content-encoding$/i.test(k)) res.setHeader(k, v);
    });
    res.send(Buffer.from(ab));
  } catch (e: any) {
    res.status(502).json({ error: 'Upstream error', detail: e?.message });
  }
}
