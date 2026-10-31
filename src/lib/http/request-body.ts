import { BadRequestError } from "@/lib/errors/app-error";

/**
 * Lê o corpo JSON da requisição. JSON malformado ou que não seja um objeto vira 400
 * (antes estourava como 500). Os campos são validados depois, em cada service.
 */
export async function readJsonBody<T>(request: Request): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new BadRequestError("JSON body must be an object");
  }

  return body as T;
}
