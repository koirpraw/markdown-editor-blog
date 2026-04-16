import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested post could not be found.",
    };
  }

  return {
    title: post.title,
    description: post.description || post.excerpt,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <Link
              href="/"
              className="text-3xl font-bold text-gray-900 hover:text-blue-600"
            >
              Markdown Blog
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white rounded-lg shadow-sm border p-8">
          {/* Post Header */}
          <div className="mb-8 border-b pb-8">
            <Link href="/" className="text-blue-600 hover:underline mb-4 block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-gray-600">
              <span>📅 {post.date}</span>
              {post.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>

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
