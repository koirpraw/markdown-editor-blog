import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

interface BlogPost {
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  content: string;
  slug: string;
}

export async function POST(request: Request) {
  try {
    const post: BlogPost = await request.json();

    if (!post.title || !post.content) {
      return NextResponse.json(
        {
          message: "Title and content are required",
        },
        { status: 400 }
      );
    }

    // Define the posts directory - adjust this path as needed
    const postsDirectory = path.join(process.cwd(), "content", "posts");

    // Ensure the directory exists
    await fs.ensureDir(postsDirectory);

    // Create the filename
    const fileName = `${post.slug}.md`;
    const filePath = path.join(postsDirectory, fileName);

    // Prepare frontmatter
    const frontmatter = {
      title: post.title,
      date: post.date,
      description: post.description,
      tags: post.tags,
      published: post.published,
    };

    // Create the markdown file with frontmatter
    const fileContent = matter.stringify(post.content, frontmatter);

    // Write the file
    await fs.writeFile(filePath, fileContent, "utf8");

    return NextResponse.json({
      message: "Post saved successfully",
      fileName: fileName,
      path: filePath,
    });
  } catch (error) {
    console.error("Error saving post:", error);
    return NextResponse.json(
      {
        message: "Failed to save post",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
