import { Spinner } from '@/components/ui/spinner';

export default function ProjectLoading() {
  return (
    <div className="w-full flex items-center justify-center py-16">
      <Spinner className="size-7 text-accent" />
    </div>
  );
}
