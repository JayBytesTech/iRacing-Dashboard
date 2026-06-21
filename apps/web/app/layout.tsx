import type { ReactNode } from 'react';

export const metadata = {
  title: 'iRacing Engineer Dashboard',
  description: 'Mission Control for iRacing teams',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0b0e14',
          color: '#e6e6e6',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
