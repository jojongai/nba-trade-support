import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-gray-400 mb-6">Page not found</p>
        <Link
          href="/"
          className="text-orange-400 hover:text-orange-300"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
