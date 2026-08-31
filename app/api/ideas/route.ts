import { NextRequest, NextResponse } from "next/server";

import { captureIdea, discardIdea, editIdea, IdeaInputError } from "@/lib/ideas";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = field(form, "action");

  try {
    switch (action) {
      case "capture":
        await captureIdea(field(form, "title"), field(form, "notes"));
        break;
      case "edit":
        await editIdea(field(form, "id"), field(form, "title"), field(form, "notes"));
        break;
      case "discard":
        await discardIdea(field(form, "id"));
        break;
      default:
        return new NextResponse("Unknown Idea action", { status: 400 });
    }
  } catch (error) {
    if (error instanceof IdeaInputError) {
      return new NextResponse(error.message, { status: 400 });
    }
    throw error;
  }

  return new NextResponse(null, { headers: { location: "/" }, status: 303 });
}

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
