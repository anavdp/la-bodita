interface PageHeaderProps {
  title: string;
  /** The screen's own main action, when it has one besides the top bar's Add Task. */
  action?: { label: string; onClick: () => void };
}

/** A slim title row, so the list below starts near the top of the screen. */
export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-full bg-primary px-6 py-3 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
