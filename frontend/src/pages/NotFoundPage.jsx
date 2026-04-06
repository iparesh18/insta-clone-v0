import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-ig-gray">Sorry, this page isn't available.</p>
      <Link to="/" className="text-ig-blue font-semibold hover:underline">
        Go back to Instagram
      </Link>
    </div>
  );
}
