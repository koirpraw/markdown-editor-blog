import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ message: "Slug is required" });
    }

    const postsDirectory = path.join(process.cwd(), "content", "posts");
    const filePath = path.join(postsDirectory, `${slug}.md`);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ message: "Post not found" });
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

    res.status(200).json({ post });
  } catch (error) {
    console.error("Error loading post:", error);
    res.status(500).json({
      message: "Failed to load post",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
