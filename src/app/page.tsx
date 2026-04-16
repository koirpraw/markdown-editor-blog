import Link from "next/link";
import { getPostList } from "@/lib/posts";
import Footer from "@/components/layout/Footer";

export default async function Home() {
  const posts = await getPostList();

  const publishedPosts = posts.filter((post) => post.published);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Markdown Blog</h1>
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

      <main className="max-w-6xl mx-auto px-6 py-12">
        {publishedPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No published posts yet
            </h3>
            <p className="text-gray-600 mb-6">
              Visit the admin dashboard to create and publish some blog posts
            </p>
            <Link
              href="/admin"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Admin
            </Link>
          </div>
        ) : (
          <div className="grid gap-10">
            {publishedPosts.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="hover:text-blue-600"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📅 {post.date}</span>
                    {post.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mb-4">
                  {post.description || post.excerpt}
                </p>

                <Link
                  href={`/posts/${post.slug}`}
                  className="inline-block text-blue-600 hover:underline"
                >
                  Read More →
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
