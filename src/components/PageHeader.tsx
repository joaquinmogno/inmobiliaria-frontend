import type { ReactNode } from 'react';

export default function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <header className="ui-page-header">
    <div><h1 className="ui-title">{title}</h1>{description && <p className="mt-1 text-sm text-content-muted">{description}</p>}</div>
    {actions && <div className="ui-page-actions">{actions}</div>}
  </header>;
}
