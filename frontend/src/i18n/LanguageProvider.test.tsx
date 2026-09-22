import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LanguageProvider, useTranslation } from "./LanguageProvider";

function Probe() {
  const { t, language, toggleLanguage } = useTranslation();
  return (
    <div>
      <p>{t("guests.title")}</p>
      <p data-testid="language">{language}</p>
      <button onClick={toggleLanguage}>switch</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  it("given no choice yet, when a key is translated, then English is used", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getByText("Guest List")).toBeInTheDocument();
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });

  it("given English, when the language is toggled, then the Spanish copy is shown", async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "switch" }));

    expect(screen.getByText("Lista de Invitados")).toBeInTheDocument();
    expect(screen.getByTestId("language")).toHaveTextContent("es");
  });

  it("given Spanish, when the language is toggled again, then it goes back to English", async () => {
    render(
      <LanguageProvider initialLanguage="es">
        <Probe />
      </LanguageProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "switch" }));

    expect(screen.getByText("Guest List")).toBeInTheDocument();
  });

  it("given every English key, when the Spanish catalogue is compared, then none is missing", async () => {
    const { translations } = await import("./translations");

    expect(Object.keys(translations.es).sort()).toEqual(Object.keys(translations.en).sort());
  });
});

describe("useTranslation", () => {
  it("given no provider above it, when a component translates, then the mistake is loud", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(/LanguageProvider/);

    vi.restoreAllMocks();
  });
});
