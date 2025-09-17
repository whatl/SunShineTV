// This layout is now a simple pass-through. 
// The main PageLayout is handled by the page itself.
export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}