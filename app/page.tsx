import { CliTerminal } from '@/components/cli-terminal';

export default function Home() {
  return (
    <main className="font-terminal w-full h-screen bg-background">
      <CliTerminal />
    </main>
  );
}
