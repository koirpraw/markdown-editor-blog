"use client";
import React, { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import MDEditor, { commands } from "@uiw/react-md-editor";

// Dynamically import the editor to avoid SSR issues
// const MDEditor = dynamic(
//   () => import("@uiw/react-md-editor").then((mod) => mod.default),
//   { ssr: false }
// );
// // const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface BlogPost {
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  content: string;
}

interface MarkdownEditorProps {
  initialPost?: BlogPost;
  onSave?: (post: BlogPost) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialPost,
  onSave,
}) => {
  const [post, setPost] = useState<BlogPost>({
    title: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    tags: [],
    published: false,
    content: "",
    ...initialPost,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (initialPost) {
      setPost(initialPost);
    }
  }, [initialPost]);

  const handleMetaChange = (
    field: keyof BlogPost,
    value: string | boolean | string[],
  ) => {
    setPost((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setPost((prev) => ({ ...prev, tags }));
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSave = async () => {
    if (!post.title || !post.content) {
      toast.error("Title and content are required");
      return;
    }

    setIsLoading(true);

    try {
      const slug = fileName || generateSlug(post.title);

      const response = await fetch("/api/posts/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...post,
          slug,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      const result = await response.json();
      toast.success(`Post saved successfully: ${result.fileName}`);
      setFileName(slug);

      if (onSave) {
        onSave(post);
      }
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save post");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    // Open preview in new tab/window
    const previewData = encodeURIComponent(JSON.stringify(post));
    window.open(`/api/posts/preview?data=${previewData}`, "_blank");
  };

  return (
    <div className="w-[80%] mx-auto p-6 space-y-6">
      <Toaster position="top-right" />
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold mb-6">Markdown Blog Editor</h1>

        {/* Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={post.title}
              onChange={(e) => handleMetaChange("title", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter post title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={post.date}
              onChange={(e) => handleMetaChange("date", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={post.description}
              onChange={(e) => handleMetaChange("description", e.target.value)}
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the post"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={post.tags.join(", ")}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={post.published}
                onChange={(e) =>
                  handleMetaChange("published", e.target.checked)
                }
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Published
              </span>
            </label>
          </div>
        </div>

        {/* File Name Override */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Name (optional)
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="my-blog-post (auto-generated from title if empty)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Will be saved as:{" "}
            {fileName || generateSlug(post.title) || "untitled"}.md
          </p>
        </div>
      </div>

      {/* Markdown Editor */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Content</h2>
        </div>

        <div className="p-4">
          <MDEditor
            value={post.content}
            onChange={(value) => handleMetaChange("content", value || "")}
            autoFocus={true}
            height={600}
            // height="100%"
            preview="edit"
            hideToolbar={false}
            // data-color-mode="light"
            extraCommands={[commands.fullscreen]}
            textareaProps={{
              placeholder:
                "Start writing your markdown content...\n\n# Example Heading\n\nThis editor supports **GitHub Flavored Markdown**:\n\n- [x] Task lists\n- Tables\n- Code blocks with syntax highlighting\n- And much more!",
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={handlePreview}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Preview
        </button>

        <button
          onClick={handleSave}
          disabled={isLoading || !post.title || !post.content}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Saving..." : "Save Post"}
        </button>
      </div>
    </div>
  );
};

export default MarkdownEditor;
