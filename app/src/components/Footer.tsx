import { Coffee } from 'lucide-react';

const AUTHOR_URL = 'https://github.com/ViniRosario';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6">
      <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
        Criado com <Coffee className="size-4 text-amber-700" aria-label="café" /> por
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 underline-offset-2 hover:underline"
        >
          Vini Rosário
        </a>
      </p>
    </footer>
  );
}
