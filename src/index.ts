import parseUrl, { LegumeUrl } from "./parse-url";
import * as parse from "./parse";

const hasOwnProp = <O extends { [k in PropertyKey]: any }, K extends keyof O>(
  obj: O,
  key: K
): obj is O & { [k in K]-?: O[k] } =>
  Object.prototype.hasOwnProperty.call(obj, key);

interface LegumeOpts<R extends boolean | null | undefined = boolean | null> {
  urlRef?: string | URL | LegumeUrl;
  run?: R;
}

async function Legume(input: string, opts?: LegumeOpts<false>): Promise<string>;
async function Legume(
  input: string,
  opts?: LegumeOpts<true | null | undefined>
): Promise<any>;

async function Legume(input: string, { urlRef, run = null }: LegumeOpts = {}) {
  const url = parseUrl(input, urlRef);
  const { newUrl, content, type } = await Legume.fetch(url);
  if (newUrl) url.absUrl = newUrl;
  const id = url.absUrl!.href;

  await Legume.load(content, { id, type, url });
  if (run == null) {
    return Legume.require(id);
  } else if (run) {
    return Legume.run(id);
  } else {
    return url.absUrl!.href;
  }
}

namespace Legume {
  export const version = "dev";

  export interface ModuleInput {
    url?: LegumeUrl;
    code: string;
    deps: string[];
    type: MediaType;
    id: string;
    hadImports: boolean;
  }
  export const cache: { [id: string]: Module } = {};

  interface LoadOpts {
    id: string;
    type: MediaType;
    url?: LegumeUrl;
  }
  export async function load(input: string, { id, url, type }: LoadOpts) {
    const importsResult = await Legume.parseImports(input, {
      mapId: modId => parseUrl(modId).absUrl.href
    });
    const mod = new Module({
      ...importsResult,
      type,
      id,
      url
    });
    Legume.cache[id] = mod;

    await Promise.all(
      mod.deps.map(dep => Legume(dep, { urlRef: url, run: false }))
    );
  }
  export class Module implements ModuleInput {
    constructor(mod: ModuleInput) {
      Object.assign(this, mod);
      if (this.type === "unknown") {
        url: if (this.url) {
          const match = this.url.request.pathname.match(/\.(.*)$/);
          if (!match) break url;
          switch (match[1]) {
            case "js":
              this.type = "script";
              break;
            case "css":
              this.type = "style";
              break;
            case "json":
              this.type = "json";
              break;
            case "txt":
            case "text":
              this.type = "text";
              break;
          }
        }
        console.warn(`Media type could not be determined for ${this.id}`);
      }
    }
    url?: LegumeUrl | undefined;
    code: string;
    deps: string[];
    type: MediaType;
    id: string;
    exports?: any;
    setDefaultExports() {
      const exports: any = {};
      if (this.hadImports) exports.__esModule = true;
      return (this.exports = exports);
    }
    hadImports: boolean;
    loads: number = 0;
    getCJSModule(): CommonJSModule {
      const self = this;
      return {
        get exports() {
          return self.exports;
        },
        set exports(exports: any) {
          self.exports = exports;
        },
        legume: {
          loads: this.loads
        },
        require: (modId: string) => Legume.require(modId)
      };
    }
  }
  interface CommonJSModule {
    exports: any;
    legume: {
      loads: number;
    };
    require(modId: string): any;
  }
  const getMod = (modId: string): Module => {
    if (!hasOwnProp(Legume.cache, modId)) {
      throw new Error(
        `Module \`${modId}\` not loaded, call Legume.load() first`
      );
    }
    return Legume.cache[modId];
  };
  export const require = (modId: string): any => {
    const mod = getMod(modId);
    if (hasOwnProp(mod, "exports")) {
      return mod.exports;
    }
    mod.setDefaultExports();
    return Legume.run(modId);
  };
  export function run(modId: string) {
    const mod = getMod(modId);
    const code = `${mod.code}\n//# sourceURL=${
      mod.url ? mod.url.absUrl || mod.url.request : `legume:${mod.id}`
    }`;

    switch (mod.type) {
      case "script":
        const cjsMod = mod.getCJSModule();
        const passedArgs = {
          module: cjsMod,
          exports: cjsMod.exports,
          require: cjsMod.require
        };
        Function.apply(0, Object.keys(passedArgs).concat(code)).apply(
          window,
          Object.keys(passedArgs).map(cur => passedArgs[cur])
        );
        return mod.exports;
      case "style":
        const elem = document.createElement("link");
        elem.rel = "stylesheet";
        elem.href = mod.url!.absUrl!.href;
        document.head.appendChild(elem);
        return elem;
    }
  }

  export import parseImports = parse.parseImports;

  type MediaType = "script" | "style" | "json" | "text" | "unknown";
  interface FetchResult {
    type: MediaType;
    content: string;
    newUrl?: URL;
  }
  export async function fetch(url: LegumeUrl): Promise<FetchResult> {
    let newUrl: URL | undefined = undefined;

    const res = await window.fetch(url.absUrl.href);
    const contentType = res.headers.get("Content-Type") || "unknown";
    const content = await res.text();

    let type: MediaType;
    switch (contentType.split(";")[0]) {
      case "application/json":
        type = "json";
        break;
      case "application/javascript":
        type = "script";
        break;
      case "text/css":
        type = "style";
        break;
      default:
        type = "unknown";
        break;
    }

    return { content, type, newUrl };
  }
}

const curScript = document.currentScript;
const entry = curScript && curScript.getAttribute("data-legume-entry");

Array.from(document.querySelectorAll("script[type='text/legume']")).reduce(
  (prom, cur, i) => {
    const processfn = () =>
      Legume.load(cur.textContent || "", {
        id: `document-script-${i}`,
        type: "script"
      });

    if (cur.getAttribute("async") === null) {
      processfn();
    } else {
      prom = prom.then(processfn).then(console.error);
    }

    return prom;
  },
  entry ? Legume(entry).catch(console.error) : Promise.resolve()
);

export default Legume;
