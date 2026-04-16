import React from "react";
import Link from "next/link";

interface BlogLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function BlogLayout({
  children,
  title = "Markdown Blog",
}: BlogLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <Link
              href="/"
              className="text-3xl font-bold text-gray-900 hover:text-blue-600"
            >
              {title}
            </Link>
            <p className="text-gray-600 mt-2">
              A simple blog with markdown support
            </p>
          </div>
          <nav>
            <Link
              href="/admin"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Admin Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="bg-white border-t py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-600">
          <p>
            © {new Date().getFullYear()} Markdown Blog. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
