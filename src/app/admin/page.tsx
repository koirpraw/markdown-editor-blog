"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { toast, Toaster } from "react-hot-toast";

// Dynamically import to avoid SSR issues
const MarkdownEditor = dynamic(
  () => import("../../components/MarkdownEditor"),
  {
    ssr: false,
  }
);

interface PostSummary {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  fileName: string;
}

interface BlogPost {
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  content: string;
}

const EditorPage: React.FC = () => {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [showEditor, setShowEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await fetch("/api/posts/list");
      if (response.ok) {
        const { posts } = await response.json();
        setPosts(posts);
      } else {
        toast.error("Failed to load posts");
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPost = async (slug: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts/load?slug=${slug}`);
      if (response.ok) {
        const { post } = await response.json();
        setSelectedPost(post);
        setCurrentSlug(slug);
        setShowEditor(true);
      } else {
        toast.error("Failed to load post");
      }
    } catch (error) {
      console.error("Error loading post:", error);
      toast.error("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPost = () => {
    setSelectedPost(null);
    setCurrentSlug("");
    setShowEditor(true);
  };

  const handlePostSaved = async () => {
    await loadPosts();
    setShowEditor(false);
    setSelectedPost(null);
    setCurrentSlug("");
  };

  const handleBackToList = () => {
    setShowEditor(false);
    setSelectedPost(null);
    setCurrentSlug("");
  };

  if (isLoading && !showEditor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">
                {currentSlug ? `Editing: ${currentSlug}` : "New Post"}
              </h1>
              <button
                onClick={handleBackToList}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                ← Back to Posts
              </button>
            </div>
          </div>
        </div>

        <div className="py-6">
          <MarkdownEditor
            initialPost={selectedPost || undefined}
            onSave={handlePostSaved}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
              <p className="text-gray-600 mt-2">
                Manage your markdown blog posts
              </p>
            </div>
            <button
              onClick={handleNewPost}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Post
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first blog post
            </p>
            <button
              onClick={handleNewPost}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <div
                key={post.slug}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {post.title}
                      </h3>
                      {post.published ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">{post.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📅 {post.date}</span>
                      <span>📁 {post.fileName}</span>
                      {post.tags.length > 0 && (
                        <div className="flex gap-1">
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

                  <button
                    onClick={() => loadPost(post.slug)}
                    className="ml-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;
