"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/onboarding`,
      data: { full_name: fullName }
    }
  });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/onboarding");
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function demoLogin() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: "demo@labelos.com", password: "demo123" });
  if (error) redirect(`/login?error=${encodeURIComponent("Create demo@labelos.com in Supabase Auth first, then seed a demo tenant.")}`);
  redirect("/dashboard");
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Check your email");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
