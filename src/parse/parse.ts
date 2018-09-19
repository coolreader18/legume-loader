export interface Parsed {
  content: string;
  deps: string[];
  hadImports: boolean;
}

export { parseScript } from "./parse-script";
export { parseStyle } from "./parse-style";

export interface ParseOptions {
  mapId: (modId: string) => string;
}
