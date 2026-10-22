interface PageHeaderProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

/** The title card the planning screens open with, with their one main action on the right. */
export function PageHeader({ title, subtitle, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="organic-shape-1 mb-6 flex flex-wrap items-center justify-between gap-4 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <div>
        <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">{title}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-full bg-primary px-8 py-4 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90"
      >
        {actionLabel}
      </button>
    </div>
  );
}
