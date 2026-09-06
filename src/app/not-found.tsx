import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase mb-5 font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.8)" }}>
          404
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold mb-4">
          This room does not exist.
        </h1>
        <p className="text-sm font-[family-name:var(--font-body)] mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
          The page you were looking for has moved, or never was. The assessment is still where you left it.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#C41E3A] hover:bg-[#E8526A] text-white font-semibold text-sm py-3.5 px-8 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)]"
        >
          Back to the assessment
        </Link>
      </div>
    </main>
  );
}
