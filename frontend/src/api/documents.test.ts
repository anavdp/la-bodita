import {
  createPaperRequest,
  deleteDocument,
  deletePaperRequest,
  documentFileUrl,
  listDocuments,
  listPaperRequests,
  listPeople,
  updateDocument,
  updatePaperRequest,
  uploadDocument,
} from "./documents";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const documentPayload = {
  id: 9,
  title: "Passport",
  kind: "paper",
  file_name: "passport.pdf",
  content_type: "application/pdf",
  size_bytes: 120000,
  item_id: 7,
  item_name: "Registro civil",
  category_id: 2,
  requirement_id: null,
  requirement_title: null,
  person_id: 1,
  issued_on: null,
  expires_on: "2031-04-02",
  uploaded_by_id: 1,
  created_at: "2026-10-25T18:00:00",
};

const requestPayload = {
  id: 3,
  name: "Baptism certificate",
  item_id: 7,
  item_name: "Iglesia San José",
  category_id: 2,
  requirement_id: null,
  requirement_title: null,
  person_id: null,
  document_id: null,
  document_title: null,
  is_missing: true,
};

describe("the documents API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its documents are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([documentPayload]));
    vi.stubGlobal("fetch", fetchMock);

    const documents = await listDocuments(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/documents");
    expect(documents).toEqual([
      {
        id: 9,
        title: "Passport",
        kind: "paper",
        fileName: "passport.pdf",
        contentType: "application/pdf",
        sizeBytes: 120000,
        itemId: 7,
        itemName: "Registro civil",
        categoryId: 2,
        requirementId: null,
        requirementTitle: null,
        personId: 1,
        issuedOn: null,
        expiresOn: "2031-04-02",
        uploadedById: 1,
        createdAt: "2026-10-25T18:00:00",
      },
    ]);
  });

  it("given an item, when its documents are listed, then only its are asked for", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await listDocuments(3, { itemId: 7 });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/documents?item_id=7");
  });

  it("given a task, when its documents are listed, then only its are asked for", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await listDocuments(3, { requirementId: 4 });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/documents?requirement_id=4");
  });

  it("given a file and where it goes, when it is uploaded, then both travel as a form", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(documentPayload, 201));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["%PDF"], "passport.pdf", { type: "application/pdf" });

    const document = await uploadDocument(3, file, { kind: "paper", itemId: 7, personId: 1, title: null });

    const init = fetchMock.mock.calls[0][1];
    const form = init?.body as FormData;
    expect(init?.method).toBe("POST");
    expect((form.get("file") as File).name).toBe("passport.pdf");
    expect([form.get("kind"), form.get("item_id"), form.get("person_id")]).toEqual(["paper", "7", "1"]);
    expect(form.has("title")).toBe(false);
    expect(document.title).toBe("Passport");
  });

  it("given a document, when its file is opened, then the link goes through the API", () => {
    expect(documentFileUrl(3, 9)).toBe("http://localhost:8000/api/weddings/3/documents/9/file");
  });

  it("given a move to a task, when a document is updated, then only that is sent", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(documentPayload));
    vi.stubGlobal("fetch", fetchMock);

    await updateDocument(3, 9, { requirementId: 4 });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/documents/9");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ requirement_id: 4 });
  });

  it("given a document, when it is deleted, then the API is asked to", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteDocument(3, 9);

    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("given an item, when the papers it asks for are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([requestPayload]));
    vi.stubGlobal("fetch", fetchMock);

    const requests = await listPaperRequests(3, { itemId: 7 });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/paper-requests?item_id=7");
    expect(requests).toEqual([
      {
        id: 3,
        name: "Baptism certificate",
        itemId: 7,
        itemName: "Iglesia San José",
        categoryId: 2,
        requirementId: null,
        requirementTitle: null,
        personId: null,
        documentId: null,
        documentTitle: null,
        isMissing: true,
      },
    ]);
  });

  it("given a paper to ask for, when it is created, then it is sent in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(requestPayload, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createPaperRequest(3, { name: "Baptism certificate", itemId: 7, personId: null });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      name: "Baptism certificate",
      item_id: 7,
      person_id: null,
    });
  });

  it("given a paper that answers a request, when the request is updated, then it points at it", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      jsonResponse({ ...requestPayload, document_id: 9, is_missing: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = await updatePaperRequest(3, 3, { documentId: 9 });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ document_id: 9 });
    expect(request.isMissing).toBe(false);
  });

  it("given a request, when it is deleted, then the API is asked to", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deletePaperRequest(3, 3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/paper-requests/3");
  });

  it("given a wedding, when its people are listed, then they come back in app terms", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse([{ id: 1, display_name: "Vicky" }])));

    expect(await listPeople(3)).toEqual([{ id: 1, displayName: "Vicky" }]);
  });
});
