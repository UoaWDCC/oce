import { NextRequest } from "next/server";
import { setFavourite } from "../_setFavourite";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return setFavourite(req, id, true);
}
