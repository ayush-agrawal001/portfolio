import { readFileSync } from 'fs';
import { join } from 'path';
import { Desktop } from '@/components/desktop';

export default function Home() {
  const asciiArt = readFileSync(join(process.cwd(), 'ascii-text.txt'), 'utf-8');

  return (
    <main className="h-screen w-full overflow-hidden">
      <Desktop asciiArt={asciiArt} />
    </main>
  );
}
