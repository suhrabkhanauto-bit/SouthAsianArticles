import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// All routes require a valid JWT
router.use(requireAuth);

// Maps frontend target keys → n8n webhook paths
const WEBHOOK_PATHS: Record<string, string> = {
  generate_image: "/generate-image-lovable",
  make_video:     "/reels-lovable",
  own_cover_image: "/own-cover-image",
};

// Targets that should return immediately while workflow continues upstream.
const FAST_ACK_TARGETS = new Set(["generate_image"]);

async function callWebhook(fullUrl: string, params: unknown): Promise<{ status: number; data: unknown }> {
  const upstream = await fetch(fullUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const text = await upstream.text();
  console.log(`[proxy-n8n] response: ${upstream.status} ${text.substring(0, 500)}`);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: upstream.status, data };
}

// POST /proxy-n8n
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { target, params } = req.body;

  const webhookPath = WEBHOOK_PATHS[target];
  if (!webhookPath) {
    console.error(`[proxy-n8n] Unknown target: "${target}"`);
    res.status(400).json({ error: `Unknown target: ${target}` });
    return;
  }

  const base = (process.env.N8N_WEBHOOK_BASE ?? "").replace(/\/+$/, "");
  const fullUrl = `${base}${webhookPath}`;

  console.log(`[proxy-n8n] target="${target}" → POST ${fullUrl}`);
  console.log(`[proxy-n8n] params:`, JSON.stringify(params));

  if (FAST_ACK_TARGETS.has(target)) {
    // Fast path for image generation: acknowledge immediately so UI stays snappy.
    void callWebhook(fullUrl, params)
      .then(({ status, data }) => {
        if (status >= 400) {
          console.error(`[proxy-n8n] async webhook error ${status}:`, data);
        }
      })
      .catch((e: any) => {
        console.error("[proxy-n8n] async fetch error:", e?.message || e);
      });

    res.status(202).json({ accepted: true, target, mode: "async" });
    return;
  }

  try {
    const { status, data } = await callWebhook(fullUrl, params);

    if (status >= 400) {
      res
        .status(status)
        .json({ error: `Webhook returned ${status}`, details: data });
      return;
    }

    res.json(data);
  } catch (e: any) {
    console.error("[proxy-n8n] fetch error:", e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

export default router;
