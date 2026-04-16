import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { message: "Slug is required" },
        { status: 400 }
      );
    }

    const postsDirectory = path.join(process.cwd(), "content", "posts");
    const filePath = path.join(postsDirectory, `${slug}.md`);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    // Read and parse the file
    const fileContent = await fs.readFile(filePath, "utf8");
    const { data: frontmatter, content } = matter(fileContent);

    const post = {
      title: frontmatter.title || "",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      description: frontmatter.description || "",
      tags: frontmatter.tags || [],
      published: frontmatter.published || false,
      content: content,
    };

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error loading post:", error);
    return NextResponse.json(
      {
        message: "Failed to load post",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
