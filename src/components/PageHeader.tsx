import type { ReactNode } from 'react';

export default function PageHeader({ title, description, help, actions }: { title: ReactNode; description?: ReactNode; help?: ReactNode; actions?: ReactNode }) {
  return <header className="ui-page-header">
    <div>
      <div className="flex items-center gap-2"><h1 className="ui-title">{title}</h1>{help}</div>
      {description && <p className="mt-1 text-sm text-content-muted">{description}</p>}
    </div>
    {actions && <div className="ui-page-actions">{actions}</div>}
  </header>;
}
