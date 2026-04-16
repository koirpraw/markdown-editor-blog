import { NextApiRequest, NextApiResponse } from "next";
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const post: BlogPost = req.body;

    if (!post.title || !post.content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
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

    res.status(200).json({
      message: "Post saved successfully",
      fileName: fileName,
      path: filePath,
    });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).json({
      message: "Failed to save post",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
