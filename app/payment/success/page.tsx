import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-[#252525]">You&apos;re all set!</h1>
        <p className="text-gray-500">
          Your subscription is now active. An invoice has been sent to your email.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/watchlist"
            className="font-bold py-3 px-6 rounded-xl text-white text-sm"
            style={{ background: "#2e8b57" }}
          >
            Go to Watchlist →
          </Link>
          <Link
            href="/profile"
            className="font-semibold py-3 px-6 rounded-xl text-sm"
            style={{ background: "#f3f4f6", color: "#374151" }}
          >
            View Account
          </Link>
        </div>
      </div>
    </div>
  );
}
