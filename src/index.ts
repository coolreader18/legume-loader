import parseUrl, { LegumeUrl } from "./parse-url";
import * as parse from "./parse/parse";
import whenDOMReady from "./when-dom-ready";

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
  const { content, type } = await Legume.fetch(url);
  const id = url.absUrl.href;

  await Legume.load(content, { id, type, url });
  if (run == null) {
    return Legume.require(id);
  } else if (run) {
    return Legume.run(id);
  } else {
    return url.absUrl.href;
  }
}

namespace Legume {
  export const version = "dev";

  export interface ModuleInput {
    url?: LegumeUrl;
    content: string;
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
    let importsResult: parse.Parsed = {
      content: input,
      deps: [],
      hadImports: false
    };
    switch (type) {
      case "script":
        importsResult = Legume.parseScript(input, {
          mapId: modId => parseUrl(modId, url).absUrl.href
        });
        break;
      case "style":
        importsResult = Legume.parseStyle(input, {
          mapId: modId => parseUrl(modId, url).absUrl.href
        });
        break;
    }
    const mod = new Module({
      ...importsResult,
      type,
      id,
      url
    });
    Legume.cache[id] = mod;
    if (mod.deps)
      await Promise.all(
        mod.deps.map(dep => Legume(dep, { urlRef: url, run: false }))
      );
  }
  export class Module implements ModuleInput {
    constructor(mod: ModuleInput) {
      Object.assign(this, mod);
    }
    url?: LegumeUrl | undefined;
    content: string;
    deps: string[];
    type: MediaType;
    id: string;
    exports?: any;
    setDefaultExports() {
      let exports: any = undefined;
      switch (this.type) {
        case "script":
          exports = {};
          if (this.hadImports) exports.__esModule = true;
          break;
      }
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
          get loads() {
            return self.loads;
          }
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

    const sourceURL = mod.url
      ? mod.url.absUrl || mod.url.request
      : `legume:${mod.id}`;

    switch (mod.type) {
      case "script":
        const code = `${mod.content}\n//# sourceURL=${sourceURL}`;
        const cjsMod = mod.getCJSModule();
        const passedArgs = {
          module: cjsMod,
          exports: cjsMod.exports,
          require: cjsMod.require,
          Legume
        };
        mod.id.includes("script") && console.log(code);
        const modFunc = Function.apply(
          undefined,
          Object.keys(passedArgs).concat(code)
        );
        modFunc.apply(
          window,
          Object.keys(passedArgs).map(cur => passedArgs[cur])
        );
        return mod.exports;
      case "style":
        const elem = document.createElement("style");
        elem.innerHTML = `${mod.content}\n/*# sourceUrl=${sourceURL} */`;
        if (mod.exports) {
          const prev = mod.exports as HTMLStyleElement;
          prev.parentNode!.replaceChild(elem, prev);
        } else {
          document.head.appendChild(elem);
        }
        return elem;
    }
  }

  export import parseScript = parse.parseScript;
  export import parseStyle = parse.parseStyle;

  type MediaType = "script" | "style" | "json" | "text" | "unknown";
  interface FetchResult {
    type: MediaType;
    content: string;
  }
  export async function fetch(url: LegumeUrl): Promise<FetchResult> {
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
        const match = url.request.pathname.match(/\.(.*)$/);
        if (match)
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
        console.warn(`Media type could not be determined for ${url.absUrl}`);
        type = "unknown";
        break;
    }

    return { content, type };
  }
}

const curScript = document.currentScript;
const entry = curScript && curScript.getAttribute("data-legume-entry");

whenDOMReady().then(() => {
  Array.from(document.querySelectorAll("script[type='text/legume']")).reduce(
    (prom, cur, i) => {
      console.log("AAA");
      const processfn = async () => {
        const id = `inline-script-${i}`;
        await Legume.load(cur.textContent || "", {
          id,
          type: "script"
        });
        Legume.run(id);
      };

      if (cur.getAttribute("async") === null) {
        processfn();
      } else {
        prom = prom.then(processfn).then(console.error);
      }

      return prom;
    },
    entry ? Legume(entry).catch(console.error) : Promise.resolve()
  );
});

export default Legume;
