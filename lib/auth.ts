import { cookies } from "next/headers";
import { createServerClient } from "./supabase-server";
import { Session } from "@/types";

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const supabase = createServerClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  return data as Session | null;
}

export async function createSession(prenom: string): Promise<string> {
  const supabase = createServerClient();
  const token = crypto.randomUUID();
  const expires_at = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toISOString();

  await supabase.from("sessions").insert({ prenom, token, expires_at });

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("sessions").delete().eq("token", token);
}

export function verifyFamilyPassword(password: string): boolean {
  return password === process.env.FAMILY_PASSWORD;
}

export function verifyAdminPassword(password: string): boolean {
  return password === process.env.ADMIN_PASSWORD;
}

export function parseAssociationSlugs(): Map<string, string> {
  const raw = process.env.ASSOCIATION_SLUGS || "";
  const map = new Map<string, string>();
  for (const entry of raw.split(",")) {
    const [slug, name] = entry.split(":");
    if (slug && name) map.set(slug.trim(), name.trim());
  }
  return map;
}
