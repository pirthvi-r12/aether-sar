import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="glass max-w-md rounded-3xl px-8 py-8 text-center">
        <p className="font-mono text-[11px] tracking-[0.28em] text-aether-cyan">404 // SIGNAL LOST</p>
        <h1 className="mt-3 font-display text-4xl text-white">No return on this bearing.</h1>
        <Link href="/" className="mt-6 inline-flex text-sm text-aether-cyan">
          Return to AETHER-SAR
        </Link>
      </div>
    </main>
  );
}
