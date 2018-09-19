const identReg = /([a-zA-Z_$][a-zA-Z_$0-9]*)/.source;
const buildRegex = (
  parts,
  flags = "" //(parts: Array<string | RegExp>, flags?: string) =>
) =>
  RegExp(
    parts.map(cur => (cur instanceof RegExp ? cur.source : cur)).join(""),
    flags
  );
const nspImpComp = buildRegex([/\*\s*as\s+/, identReg]).source;
const restReg = /\s*,?\s*((?:.|\r|\n)+)/;
function reqDefault(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
}
function importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null)
    for (var k in mod)
      if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
  result["default"] = mod;
  return result;
}

export interface ImportStatement {
  defaultImport?: string;
  namedImports?: NamedImport[];
  nspImport?: string;
  source: string;
}

interface Parsed {
  code: string;
  deps: string[];
  hadImports: boolean;
}

interface ParseOptions {
  mapId: (modId: string) => string;
}

/**
 * Parse a script into its imports and exports
 * @param script - The script text to parse
 */
export const parseImports = async (
  script: string,
  { mapId }: ParseOptions
): Promise<Parsed> => {
  const reg = /(^|;|\*\/)\s*import\s*((?:.|\r|\n)+?(?:"|'))(?=;|$)/gm;

  let hadImports = false;

  const deps: string[] = [];

  const code = script.replace(reg, (_, prefix, match) => {
    hadImports = true;

    const cur: ImportStatement = {
      source: ""
    };

    ident: {
      const ident = match.match(buildRegex(["^", identReg, restReg]));
      if (!ident) break ident;
      cur.defaultImport = ident[1];
      match = ident[2];
    }

    if (match[0] === "*") [cur.nspImport, match] = parseNamespace(match);
    else if (match[0] === "{") [cur.namedImports, match] = parseNamed(match);

    cur.source = parseEnd(match);

    deps.push(cur.source);
    if (mapId) cur.source = mapId(cur.source);

    return `${prefix}${transformDep(cur)}`;
  });

  return {
    code,
    deps,
    hadImports
  };
};

const transformDep = (dep: ImportStatement) => {
  let out = "\n";
  const src = JSON.stringify(dep.source);

  if (dep.defaultImport) {
    out += `;var ${dep.defaultImport}=(${reqDefault})(module.require(${src}));`;
  }
  if (dep.namedImports) {
    out += dep.namedImports
      .map(
        ({ imp, as }) =>
          `;var ${as || imp}=module.require(${src})[${JSON.stringify(imp)}];`
      )
      .join("");
  }
  if (dep.nspImport) {
    const imp = dep.nspImport;
    out += `;var ${imp}=(${importStar})(module.require(${src}));`;
  }

  if (!dep.defaultImport && !dep.namedImports && !dep.nspImport) {
    out = `;module.require(${src});`;
  }

  return out;
};

const parseNamespace = (str: string): [string, string] => {
  const nspMatch = str.match(buildRegex(["^", nspImpComp, restReg]));

  if (!nspMatch) throw new Error("Invalid namespace import statement");
  return [nspMatch[1], nspMatch[2]];
};

interface NamedImport {
  imp: string;
  as?: string;
}

const parseNamed = (str: string): [NamedImport[], string] => {
  const initMatch = buildRegex(["{", restReg, "}", restReg]).exec(str);
  if (!initMatch) throw new Error("Invalid named parameters.");
  str = initMatch[1];

  const reg = buildRegex(
    [identReg, "(?:\\s+as\\s+", identReg, ")?\\s*(?:,|$)"],
    "g"
  );
  let match;
  const out: NamedImport[] = [];

  while ((match = reg.exec(str))) {
    const imp = match[1];
    const as = match[2];
    out.push(as ? { imp, as } : { imp });
  }
  return [out, initMatch[2]];
};

const parseEnd = (str: string): string => {
  const srcMatch = str.match(buildRegex([/(?:from)?\s*/, restReg]));
  if (!srcMatch) throw new Error("Invalid end of import statement");
  const source = srcMatch[1];
  return JSON.parse(
    source[0] === "'"
      ? `"${source
          .replace(/"/g, '\\"')
          .replace(/\\'/g, "'")
          .slice(1, -2)}"`
      : source
  );
};
