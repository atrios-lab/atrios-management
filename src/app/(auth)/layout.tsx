// Fundo compartilhado das telas de auth (mockup 07–10): radial + grade.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, rgba(94,106,210,0.12), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage:
            "radial-gradient(70% 55% at 50% 40%, #000 20%, transparent 75%)",
        }}
      />
      <div className="relative py-10">{children}</div>
    </div>
  );
}
