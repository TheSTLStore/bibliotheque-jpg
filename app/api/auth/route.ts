import { NextRequest, NextResponse } from "next/server";
import { verifyFamilyPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password, prenom } = await request.json();

  if (!prenom || typeof prenom !== "string" || prenom.trim().length === 0) {
    return NextResponse.json({ error: "Prenom requis" }, { status: 400 });
  }

  if (!verifyFamilyPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  const token = await createSession(prenom.trim());

  const response = NextResponse.json({ ok: true, prenom: prenom.trim() });
  response.cookies.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}