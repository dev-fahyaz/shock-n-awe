import { Button } from 'components/ui/Button';
import { dashboardUrl } from 'scene/auth/dashboard';

export { dashboardUrl } from 'scene/auth/dashboard';

export function DashboardLink() {
  const href = dashboardUrl();
  if (!href) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href}>Return to dashboard</a>
    </Button>
  );
}
