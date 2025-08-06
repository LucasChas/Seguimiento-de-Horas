// index.ts (sirve igual como .js)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",                 // si querés, restringí a http://localhost:5173
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim();
    const redirectTo = (body?.redirectTo || "").trim();

    if (!email) {
      return new Response(JSON.stringify({ error: "email es requerido" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    if (!redirectTo) {
      return new Response(JSON.stringify({ error: "redirectTo es requerido" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "faltan secrets SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    console.log("🔗 redirectTo recibido:", redirectTo); // DEBUG
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo, // 👈 clave: /register?invited=...
    });

    if (error) {
      // devolvé el detalle para ver exactamente qué falla
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, userId: data.user?.id }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("❌ invite-user:", e);
    return new Response(JSON.stringify({ error: e?.message || "Error inesperado" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});
