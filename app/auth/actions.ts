"use server";

import { redirect } from "next/navigation";

export async function signup() {
  redirect("/dashboard");
}

export async function login() {
  redirect("/dashboard");
}

export async function demoLogin() {
  redirect("/dashboard");
}

export async function forgotPassword() {
  redirect("/login");
}

export async function logout() {
  redirect("/login");
}
