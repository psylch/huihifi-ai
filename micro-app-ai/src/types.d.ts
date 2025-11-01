// Type declarations for modules that don't have their own type definitions
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Allow importing JSON files
declare module '*.json' {
  const content: any;
  export default content;
}
