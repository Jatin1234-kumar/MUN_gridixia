import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { DelegateForm } from '@/features/delegates/DelegateForm';

export default function Delegates() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delegate Application"
        subtitle="Premium multi-step application flow with autosave and resume support"
        actions={
          <Button size="sm" variant="outline">
            <Rocket size={14} />
            Resume Draft
          </Button>
        }
      />
      <DelegateForm />
    </div>
  );
}
