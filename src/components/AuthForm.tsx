"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null
  );

  // Controlled so values survive a failed submit — React 19 resets a
  // <form action> after the action runs, which would otherwise wipe an
  // uncontrolled email/password when only the invite code was wrong.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");

  const isSignup = mode === "signup";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-orange-100/70 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold text-stone-800">Mi Dashboard</h1>
      <p className="mt-1 text-sm text-stone-400">
        {isSignup
          ? "Crea tu cuenta para empezar."
          : "Inicia sesion para continuar."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-semibold text-stone-600"
          >
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2 text-base text-stone-800 outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-semibold text-stone-600"
          >
            Contrasena
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2 text-base text-stone-800 outline-none focus:border-orange-400"
          />
        </div>

        {isSignup && (
          <div>
            <label
              htmlFor="invite"
              className="mb-1 block text-sm font-semibold text-stone-600"
            >
              Codigo de invitacion
            </label>
            <input
              id="invite"
              name="invite"
              type="text"
              required
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              className="w-full rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2 text-base text-stone-800 outline-none focus:border-orange-400"
            />
          </div>
        )}

        {state?.error && (
          <p className="text-sm text-red-500" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-orange-500 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {pending
            ? "Un momento..."
            : isSignup
              ? "Crear cuenta"
              : "Iniciar sesion"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-stone-500">
        {isSignup ? "Ya tienes cuenta?" : "No tienes cuenta?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          className="font-semibold text-orange-600 hover:text-orange-700"
        >
          {isSignup ? "Iniciar sesion" : "Crear cuenta"}
        </button>
      </p>
    </div>
  );
}
