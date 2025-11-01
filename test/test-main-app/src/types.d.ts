// Custom type declarations for the application

// Declare module for App component
declare module './App' {
  import { FC } from 'react';
  const App: FC;
  export default App;
}

// Allow importing CSS files
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Allow importing SVG files
declare module '*.svg' {
  const content: string;
  export default content;
}

// Allow importing JSON files
declare module '*.json' {
  const content: any;
  export default content;
}
