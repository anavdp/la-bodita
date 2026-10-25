import { screen } from "@testing-library/react";
import type { ReactElement } from "react";

import { renderWithProviders } from "../testing/renderWithProviders";
import { ProfilePanel } from "./account/ProfilePanel";
import { BudgetLineForm } from "./budget/BudgetLineForm";
import { CalendarEventForm } from "./calendar/CalendarEventForm";
import { AddFilesForm } from "./documents/AddFilesForm";
import { AskForPaperForm } from "./documents/AskForPaperForm";
import { GuestFormDialog } from "./guests/GuestFormDialog";
import { GuestImportDialog } from "./guests/GuestImportDialog";
import { HouseholdFormDialog } from "./households/HouseholdFormDialog";
import { ItemFormDialog } from "./items/ItemFormDialog";
import { CategoryFormDialog } from "./planning/CategoryFormDialog";
import { TaskForm } from "./planning/TaskForm";
import { SettingsPanel } from "./settings/SettingsPanel";

const save = () => Promise.resolve();
const close = () => {};

// Every drawer wears its screen's own illustration, the one beside that
// screen's title, so a drawer always says which screen it belongs to.
const drawers: [string, ReactElement, string][] = [
  ["Add guest", <GuestFormDialog guest={null} onSave={save} onClose={close} />, "title-cheers.png"],
  [
    "Add household",
    <HouseholdFormDialog household={null} guests={[]} households={[]} onSave={save} onClose={close} />,
    "title-cheers.png",
  ],
  ["Import CSV", <GuestImportDialog weddingId={1} onImport={save} onClose={close} />, "title-cheers.png"],
  ["Add item", <ItemFormDialog item={null} categories={[]} onSave={save} onClose={close} />, "title-car.png"],
  ["Add task", <TaskForm onSave={() => new Promise(() => {})} onClose={close} />, "title-checklist.png"],
  ["Add event", <CalendarEventForm event={null} items={[]} onSave={save} onClose={close} />, "title-calendar.png"],
  [
    "Add cost",
    <BudgetLineForm line={null} items={[]} defaultCurrency="EUR" onSave={save} onClose={close} />,
    "title-budget.png",
  ],
  [
    "Upload",
    <AddFilesForm
      weddingId={1}
      items={[]}
      people={[]}
      document={null}
      onUpload={save}
      onSave={save}
      onClose={close}
    />,
    "title-documents.png",
  ],
  [
    "Ask for a paper",
    <AskForPaperForm weddingId={1} items={[]} people={[]} onSave={save} onClose={close} />,
    "title-documents.png",
  ],
  ["Add category", <CategoryFormDialog existingCount={0} onSave={save} onClose={close} />, "generic.png"],
  ["Settings", <SettingsPanel onClose={close} />, "engagement.png"],
  // Opened from the top bar too, beside Settings, so it wears the same ring.
  ["Your profile", <ProfilePanel onClose={close} />, "engagement.png"],
];

describe("drawer titles", () => {
  it.each(drawers)("given the %s drawer, when it opens, then its title band shows its screen's icon", (_name, drawer, icon) => {
    renderWithProviders(drawer);

    const header = screen.getByRole("dialog").querySelector("header");
    expect(header?.querySelector("img")).toHaveAttribute("src", `/icons/${icon}`);
    // One icon, never an emoji beside or instead of it.
    expect(header?.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
