import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

export async function GET() {
  try {
    const postsDirectory = path.join(process.cwd(), "content", "posts");

    // Ensure directory exists
    const exists = await fs.pathExists(postsDirectory);
    if (!exists) {
      return NextResponse.json({ posts: [] });
    }

    // Read all markdown files
    const files = await fs.readdir(postsDirectory);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const filePath = path.join(postsDirectory, file);
        const fileContent = await fs.readFile(filePath, "utf8");
        const { data: frontmatter } = matter(fileContent);

        const slug = file.replace(".md", "");

        return {
          slug,
          title: frontmatter.title || slug,
          date: frontmatter.date || "",
          description: frontmatter.description || "",
          tags: frontmatter.tags || [],
          published: frontmatter.published || false,
          fileName: file,
        };
      })
    );

    // Sort by date (newest first)
    posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error listing posts:", error);
    return NextResponse.json(
      {
        message: "Failed to list posts",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
