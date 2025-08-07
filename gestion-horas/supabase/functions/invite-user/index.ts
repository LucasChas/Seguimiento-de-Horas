import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization"
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim();
    const redirectTo = (body?.redirectTo || "").trim();

    if (!email || !redirectTo) {
      return new Response(JSON.stringify({
        error: !email ? "email es requerido" : "redirectTo es requerido"
      }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({
        error: "faltan secrets SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
      }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    console.log("🔗 redirectTo recibido:", redirectTo);

    // 1. Invitar usuario
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const userId = data.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({
        error: "No se pudo obtener el user.id"
      }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    // 2. Insertar en profiles (con retries si la FK aún no está lista)
    let retries = 10;
    let inserted = false;
    let insertError = null;

    while (retries > 0 && !inserted) {
      const result = await admin.from("profiles").insert({
        id: userId,
        email,
        nombre: "",
        apellido: "",
        telefono: ""
      });

      if (!result.error) {
        inserted = true;
        break;
      }

      if (result.error.code === "23503") {
        insertError = result.error;
        retries--;
        await new Promise((res) => setTimeout(res, 1500));
      } else {
        insertError = result.error;
        break;
      }
    }

    if (!inserted) {
      console.error("Error al insertar en profiles:", insertError?.message);
      return new Response(JSON.stringify({
        error: "No se pudo insertar en profiles: " + insertError?.message
      }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    // ✅ Éxito
    return new Response(JSON.stringify({
      ok: true,
      userId
    }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("❌ invite-user:", e);
    return new Response(JSON.stringify({
      error: e?.message || "Error inesperado"
    }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});
