import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const DOCS_ROOT = path.join(process.cwd(), "docs");

function getContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await context.params;

  if (!parts?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const relativeFile = path.normalize(parts.join("/"));
  const fullPath = path.join(DOCS_ROOT, relativeFile);
  const relativeToRoot = path.relative(DOCS_ROOT, fullPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  try {
    const file = await fs.readFile(fullPath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": getContentType(fullPath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
