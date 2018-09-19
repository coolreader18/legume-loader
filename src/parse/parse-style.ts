import { ParseOptions, Parsed } from "./parse";
import { parseString } from "./common";

export const parseStyle = (input: string, { mapId }: ParseOptions): Parsed => ({
  content: input.replace(
    /\burl\((?:("(?:[^\r\n"]|\\")*"|'(?:[^\r\n']|\\')*")|([^\)"']+))\)/g,
    (_, quoted, noQuotes) =>
      `url(${JSON.stringify(mapId(noQuotes || parseString(quoted)))})`
  ),
  deps: [],
  hadImports: false
});
