"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetupForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        toast.error(data.error?.message ?? "Could not create the account.");
        return;
      }
      toast.success("Account created.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            {showPassword ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
