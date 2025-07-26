// @ts-ignore: Deno env
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Deno env
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    const { user_id } = await req.json();

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: notifError } = await supabase
      .from("notification_preferences")
      .delete()
      .eq("user_id", user_id);
    if (notifError) throw notifError;

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user_id);
    if (profileError) throw profileError;

    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
    if (authError) throw authError;

    return new Response(JSON.stringify({ message: "Usuario eliminado exitosamente." }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("❌ Error al eliminar usuario:", err);
    return new Response(JSON.stringify({
      error: "No se pudo eliminar el usuario."
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
