import './styles.css';

export const metadata = { title: 'Relief Operations', description: 'Disaster relief coordination and field reporting' };

export default function Layout({ children }) {
  // Dark Reader can add attributes to the root element before React hydrates.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
