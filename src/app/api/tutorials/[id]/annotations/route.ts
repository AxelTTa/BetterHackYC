import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { annotation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, x, y, z, order } = body;

    if (!title || x === undefined || y === undefined || z === undefined) {
      return NextResponse.json(
        { error: "title, x, y, z are required" },
        { status: 400 }
      );
    }

    // Auto-calculate order if not provided or if it's 1 (default)
    let finalOrder = order;
    if (!order || order === 1) {
      const existingAnnotations = await db.query.annotation.findMany({
        where: (a, { eq }) => eq(a.tutorialId, tutorialId),
      });
      finalOrder = existingAnnotations.length + 1;
    }

    const [newAnnotation] = await db
      .insert(annotation)
      .values({
        tutorialId,
        title,
        content: content || "",
        x,
        y,
        z,
        order: finalOrder,
      })
      .returning();

    return NextResponse.json({ annotation: newAnnotation });
  } catch (error) {
    console.error("Create annotation error:", error);
    return NextResponse.json(
      { error: "Failed to create annotation" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const annotations = await db.query.annotation.findMany({
      where: (a, { eq }) => eq(a.tutorialId, tutorialId),
      orderBy: (a, { asc }) => [asc(a.order)],
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("Get annotations error:", error);
    return NextResponse.json(
      { error: "Failed to get annotations" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { annotationId, title, content, x, y, z, order } = body;

    if (!annotationId) {
      return NextResponse.json(
        { error: "annotationId is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(annotation)
      .set({
        title,
        content,
        x,
        y,
        z,
        order,
        updatedAt: new Date(),
      })
      .where(
        and(eq(annotation.id, annotationId), eq(annotation.tutorialId, tutorialId))
      )
      .returning();

    return NextResponse.json({ annotation: updated });
  } catch (error) {
    console.error("Update annotation error:", error);
    return NextResponse.json(
      { error: "Failed to update annotation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const annotationId = searchParams.get("annotationId");

    if (!annotationId) {
      return NextResponse.json(
        { error: "annotationId is required" },
        { status: 400 }
      );
    }

    await db
      .delete(annotation)
      .where(
        and(eq(annotation.id, annotationId), eq(annotation.tutorialId, tutorialId))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete annotation error:", error);
    return NextResponse.json(
      { error: "Failed to delete annotation" },
      { status: 500 }
    );
  }
}
