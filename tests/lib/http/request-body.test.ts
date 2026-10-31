import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/http/request-body";
import { jsonError } from "@/lib/http/api-response";
import { BadRequestError } from "@/lib/errors/app-error";

function post(body: string) {
  return new Request("http://localhost", { method: "POST", body });
}

describe("readJsonBody", () => {
  it("returns the parsed object", async () => {
    await expect(readJsonBody(post('{"a":1}'))).resolves.toEqual({ a: 1 });
  });

  it("turns malformed JSON and non-object bodies into 400", async () => {
    await expect(readJsonBody(post("{not json"))).rejects.toThrow("Invalid JSON body");
    await expect(readJsonBody(post("[1,2]"))).rejects.toBeInstanceOf(BadRequestError);
    await expect(readJsonBody(post("null"))).rejects.toThrow("JSON body must be an object");
  });
});

describe("jsonError", () => {
  it("maps Prisma 'record not found' and 'foreign key' errors to client errors", async () => {
    expect(jsonError({ code: "P2025" }).status).toBe(404);
    expect(jsonError({ code: "P2003" }).status).toBe(400);
  });
});
