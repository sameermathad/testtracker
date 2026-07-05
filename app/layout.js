import "./globals.css";

export const metadata = {
  title: "Weekend Test Tracker",
  description: "JEE / EAMCET weekend test tracker — upload graded papers, track subject and topic trends",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
