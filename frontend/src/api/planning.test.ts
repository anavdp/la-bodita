import { createCategory, deleteCategory, listCategories, updateCategory } from "./categories";
import { createItem, deleteItem, listItems, updateItem } from "./items";
import { createTask, deleteTask, listTasks, updateTask } from "./tasks";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const categoryPayload = {
  id: 2,
  name: "Photographer",
  emoji: "📸",
  color: "#f39237",
  subcategories: [{ id: 5, category_id: 2, name: "Video", emoji: "🎥", color: "#f39237" }],
};

const itemPayload = {
  id: 7,
  name: "Luz de Agua Foto",
  category_id: 2,
  subcategory_id: null,
  status: "meeting_set",
  contact_name: "Luz",
  phone: "+58 412",
  email: null,
  instagram_url: "https://instagram.com/luzdeagua",
  website_url: null,
  notes: null,
  task_count: 2,
  done_task_count: 1,
  next_task: { id: 9, title: "Video call", due_date: "2026-10-27", due_time: "19:00:00" },
};

const taskPayload = {
  id: 9,
  title: "Video call",
  is_done: false,
  due_date: "2026-10-27",
  due_time: "19:00:00",
  notes: null,
  item_id: 7,
  item_name: "Luz de Agua Foto",
  category_id: 2,
};

describe("the planning API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its categories are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([categoryPayload]));
    vi.stubGlobal("fetch", fetchMock);

    const categories = await listCategories(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/categories");
    expect(categories[0].subcategories[0]).toEqual({
      id: 5,
      categoryId: 2,
      name: "Video",
      emoji: "🎥",
      color: "#f39237",
    });
  });

  it("given a name, emoji and color, when a category is created, then it is posted", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(categoryPayload, 201));
    vi.stubGlobal("fetch", fetchMock);

    const category = await createCategory(3, { name: "Photographer", emoji: "📸", color: "#f39237" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Photographer", emoji: "📸", color: "#f39237" });
    expect(category.name).toBe("Photographer");
  });

  it("given a new color, when a category is updated, then only the color is patched", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(categoryPayload));
    vi.stubGlobal("fetch", fetchMock);

    const category = await updateCategory(3, 2, { color: "#e56399" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/categories/2");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ color: "#e56399" });
    expect(category.subcategories[0].categoryId).toBe(2);
  });

  it("given a category, when it is deleted, then a DELETE is sent", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteCategory(3, 2);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/categories/2");
    expect(init.method).toBe("DELETE");
  });

  it("given a wedding, when its items are listed, then each comes back with its next task in app terms", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse([itemPayload])));

    const [item] = await listItems(3);

    expect(item).toEqual({
      id: 7,
      name: "Luz de Agua Foto",
      categoryId: 2,
      subcategoryId: null,
      status: "meeting_set",
      contactName: "Luz",
      phone: "+58 412",
      email: null,
      instagramUrl: "https://instagram.com/luzdeagua",
      websiteUrl: null,
      notes: null,
      taskCount: 2,
      doneTaskCount: 1,
      nextTask: { id: 9, title: "Video call", dueDate: "2026-10-27", dueTime: "19:00:00" },
    });
  });

  it("given a vendor, when an item is created, then it is posted in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      jsonResponse({ ...itemPayload, next_task: null }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);

    const item = await createItem(3, {
      name: "Luz de Agua Foto",
      categoryId: 2,
      subcategoryId: null,
      status: "idea",
      contactName: "Luz",
      phone: null,
      email: null,
      instagramUrl: "https://instagram.com/luzdeagua",
      websiteUrl: null,
      notes: null,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/items");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Luz de Agua Foto",
      category_id: 2,
      subcategory_id: null,
      status: "idea",
      contact_name: "Luz",
      phone: null,
      email: null,
      instagram_url: "https://instagram.com/luzdeagua",
      website_url: null,
      notes: null,
    });
    expect(item.nextTask).toBeNull();
  });

  it("given a status change, when an item is updated, then only the status is patched", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(itemPayload));
    vi.stubGlobal("fetch", fetchMock);

    await updateItem(3, 7, { status: "booked" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/items/7");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "booked" });
  });

  it("given an item, when it is deleted, then a DELETE is sent", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteItem(3, 7);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/items/7");
    expect(init.method).toBe("DELETE");
  });

  it("given an item, when its tasks are listed, then the item filter is sent and they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([taskPayload]));
    vi.stubGlobal("fetch", fetchMock);

    const tasks = await listTasks(3, { itemId: 7 });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/requirements?item_id=7");
    expect(tasks).toEqual([
      {
        id: 9,
        title: "Video call",
        isDone: false,
        dueDate: "2026-10-27",
        dueTime: "19:00:00",
        notes: null,
        itemId: 7,
        itemName: "Luz de Agua Foto",
        categoryId: 2,
      },
    ]);
  });

  it("given no filter, when tasks are listed, then every task of the wedding is asked for", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await listTasks(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/requirements");
  });

  it("given an appointment, when a task is created, then it is posted in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(taskPayload, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createTask(3, { title: "Video call", itemId: 7, dueDate: "2026-10-27", dueTime: "19:00" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      title: "Video call",
      item_id: 7,
      due_date: "2026-10-27",
      due_time: "19:00",
    });
  });

  it("given a task ticked off, when it is updated, then only is_done is patched", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ ...taskPayload, is_done: true }));
    vi.stubGlobal("fetch", fetchMock);

    const task = await updateTask(3, 9, { isDone: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/requirements/9");
    expect(JSON.parse(init.body as string)).toEqual({ is_done: true });
    expect(task.isDone).toBe(true);
  });

  it("given a task, when it is deleted, then a DELETE is sent", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteTask(3, 9);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
  });
});
