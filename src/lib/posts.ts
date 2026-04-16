import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

export interface PostSummary {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  fileName: string;
  excerpt: string;
}

export interface FullPost extends PostSummary {
  content: string;
}

export async function getPostList(): Promise<PostSummary[]> {
  try {
    const postsDirectory = path.join(process.cwd(), "content", "posts");

    // Ensure directory exists
    const exists = await fs.pathExists(postsDirectory);
    if (!exists) {
      return [];
    }

    // Read all markdown files
    const files = await fs.readdir(postsDirectory);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const filePath = path.join(postsDirectory, file);
        const fileContent = await fs.readFile(filePath, "utf8");
        const { data: frontmatter, content } = matter(fileContent);

        const slug = file.replace(".md", "");

        // Create a short excerpt from the content
        const excerpt =
          content
            .trim()
            .replace(/^#.*$/m, "") // Remove headings
            .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
            .replace(/```[\s\S]*?```/g, "") // Remove code blocks
            .replace(/\[.*?\]\(.*?\)/g, "$1") // Replace links with just the text
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim()
            .slice(0, 150) + "...";

        return {
          slug,
          title: frontmatter.title || slug,
          date: frontmatter.date || "",
          description: frontmatter.description || "",
          tags: frontmatter.tags || [],
          published: frontmatter.published !== false, // Default to true if not specified
          fileName: file,
          excerpt,
        };
      })
    );

    // Sort by date (newest first)
    return posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<FullPost | null> {
  try {
    const postsDirectory = path.join(process.cwd(), "content", "posts");
    const filePath = path.join(postsDirectory, `${slug}.md`);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return null;
    }

    // Read and parse the file
    const fileContent = await fs.readFile(filePath, "utf8");
    const { data: frontmatter, content } = matter(fileContent);

    // Create a short excerpt from the content
    const excerpt =
      content
        .trim()
        .replace(/^#.*$/m, "") // Remove headings
        .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks
        .replace(/\[.*?\]\(.*?\)/g, "$1") // Replace links with just the text
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
        .slice(0, 150) + "...";

    return {
      slug,
      title: frontmatter.title || slug,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      description: frontmatter.description || "",
      tags: frontmatter.tags || [],
      published: frontmatter.published !== false, // Default to true if not specified
      fileName: `${slug}.md`,
      content,
      excerpt,
    };
  } catch (error) {
    console.error(`Error getting post ${slug}:`, error);
    return null;
  }
}
