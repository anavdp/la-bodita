import { ApiError } from "../../api/client";
import { uploadErrorKey } from "./uploadErrors";

describe("uploadErrorKey", () => {
  it("given each refusal, when it is explained, then the bucket, size and type each get their own message", () => {
    expect(uploadErrorKey(new ApiError("x", 503))).toBe("documents.form.notSetUp");
    expect(uploadErrorKey(new ApiError("x", 413))).toBe("documents.form.tooLarge");
    expect(uploadErrorKey(new ApiError("x", 415))).toBe("documents.form.wrongType");
    expect(uploadErrorKey(new ApiError("x", 500))).toBe("planning.saveFailed");
    expect(uploadErrorKey(new Error("offline"))).toBe("planning.saveFailed");
  });
});
