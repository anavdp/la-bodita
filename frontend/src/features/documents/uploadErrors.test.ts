import { ApiError } from "../../api/client";
import { failedTo } from "../../components/feedback/problems";
import { uploadErrorKey } from "./uploadErrors";

describe("uploadErrorKey", () => {
  it("given each refusal, when it is explained, then the bucket, size and type each get their own message", () => {
    expect(uploadErrorKey(new ApiError("x", 503))).toBe("documents.form.notSetUp");
    expect(uploadErrorKey(new ApiError("x", 413))).toBe("documents.form.tooLarge");
    expect(uploadErrorKey(new ApiError("x", 415))).toBe("documents.form.wrongType");
  });

  it("given any other failure, when it is explained, then it is a failed save that says why", () => {
    const crash = new ApiError("x", 500, { requestId: "1a2b3c4d" });
    const offline = new ApiError("offline", 0);

    expect(uploadErrorKey(crash)).toEqual(failedTo("errors.save", crash));
    expect(uploadErrorKey(offline)).toEqual(failedTo("errors.save", offline));
  });
});
