import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description: string | React.ReactNode;
  className?: string;
  /** Extra slot for things like filter chips or action buttons beside the title */
  actions?: React.ReactNode;
}

/**
 * Shared page header used across all Tuner pages.
 * Matches the Compass / Studio info-toggle pattern:
 * — Title + italic ⓘ button side-by-side
 * — Description slides in beneath on click (hidden by default)
 */
export default function PageHeader({ icon, title, description, className, actions }: PageHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("page-header mb-6", className)}>
      {/* Title row */}
      <div className="flex items-center gap-2 mb-0">
        {icon && <span className="text-primary flex-shrink-0">{icon}</span>}
        <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
        <button
          className="info-toggle-btn"
          onClick={() => setOpen(o => !o)}
          title={open ? "Hide info" : "About this page"}
          aria-expanded={open}
        >
          <span>i</span>
        </button>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {/* Collapsible description */}
      {open && (
        <div className="info-panel">
          <div className="info-panel-body">
            {typeof description === "string" ? (
              <p className="info-panel-text">{description}</p>
            ) : (
              description
            )}
          </div>
        </div>
      )}
    </div>
  );
}
