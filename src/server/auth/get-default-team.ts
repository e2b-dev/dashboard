import { supabaseAdmin } from "@/lib/clients/supabase/admin";
import "server-only";

export async function getDefaultTeamRelation(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users_teams")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();

  if (error || !data) {
    throw new Error("No default team found");
  }

  return data;
}
