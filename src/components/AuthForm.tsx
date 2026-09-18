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
  // uncontrolled email/password on any validation error.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isSignup = mode === "signup";

  return (
    <div className="w-full max-w-sm rounded-lg border border-line bg-paper p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Flow Habit System</h1>
      <p className="mt-1 text-sm text-ink-3">
        {isSignup
          ? "Crea tu cuenta para empezar."
          : "Inicia sesion para continuar."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-medium text-ink-2"
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
            className="w-full rounded-md border border-line-2 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium text-ink-2"
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
            className="w-full rounded-md border border-line-2 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </div>


        {state?.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
        >
          {pending
            ? "Un momento..."
            : isSignup
              ? "Crear cuenta"
              : "Iniciar sesion"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-2">
        {isSignup ? "Ya tienes cuenta?" : "No tienes cuenta?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          className="font-medium text-ink underline underline-offset-4 hover:text-ink-2"
        >
          {isSignup ? "Iniciar sesion" : "Crear cuenta"}
        </button>
      </p>
    </div>
  );
}
