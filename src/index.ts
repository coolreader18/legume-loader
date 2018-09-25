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
    hasExports() {
      return hasOwnProp(this, "cjsExports") || hasOwnProp(this, "amdExports");
    }
    get exports() {
      if (hasOwnProp(this, "amdExports")) {
        return this.amdExports;
      }
      if (hasOwnProp(this, "cjsExports")) {
        return this.cjsExports;
      }
      return this.setDefaultExports();
    }
    set exports(exports: any) {
      this.cjsExports = exports;
    }
    cjsExports?: any;
    amdExports?: any;
    setDefaultExports() {
      let exports: any = undefined;
      switch (this.type) {
        case "script":
          exports = {};
          if (this.hadImports) exports.__esModule = true;
          break;
      }
      return (this.cjsExports = exports);
    }
    hadImports: boolean;
    loads: number = 0;
    define(...args: any[]) {
      const amdMod = amd.args(...args);
      amd.run(amdMod);
      if (hasOwnProp(amdMod, "exports")) {
        this.amdExports = amdMod.exports;
      }
    }
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
    if (mod.hasExports()) {
      return mod.exports;
    }
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
        const def = mod.define.bind(mod);
        def.amd = define.amd;
        const passedArgs = {
          module: cjsMod,
          exports: cjsMod.exports,
          require: cjsMod.require,
          Legume,
          define: def
        };
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

  namespace amd {
    interface Module {
      factory: Function;
      deps?: string[];
      id?: string;
      exports?: any;
    }
    export const cache: { [k: string]: Module } = {};
    export const pending: { [k: string]: Module[] } = {};

    export function args(...args: any[]): Module {
      let [arg0, arg1] = args;
      let id: string | undefined;
      let deps: string[] | undefined = [];
      let factory!: Function;

      const factoryArg = (arg: any) => {
        if (typeof arg === "object") {
          factory = () => arg;
        } else if (typeof arg === "function") {
          factory = arg;
        } else {
          throw new Error("Invalid define arguments");
        }
      };

      switch (args.length) {
        case 0:
          throw new Error("No args provided to define");
        case 1:
          factoryArg(arg0);
          break;
        case 2:
          if (Array.isArray(arg0)) {
            deps = arg0;
          } else if (typeof arg0 === "string") {
            id = arg0;
          } else {
            throw new Error("Invalid define arguments");
          }

          factoryArg(arg1);
          break;
        default:
          if (typeof arg0 !== "string" || !Array.isArray(arg1)) {
            throw new Error("Invalid define arguments");
          }
          id = arg0;
          deps = arg1;
          factoryArg(args[2]);
      }

      return { factory, deps, id };
    }

    export function run(mod: Module) {
      const deps = mod.deps || [];
      let isPending = deps.reduce((isPending, depId) => {
        if (!hasOwnProp(cache, depId)) {
          isPending = true;
          if (pending[depId]) {
            pending[depId].push(mod);
          } else {
            pending[depId] = [mod];
          }
        }
        return isPending;
      }, false);

      if (!isPending) {
        const res = mod.factory(...deps.map(depId => getDep(depId, mod)));
        if (res) mod.exports = res;
        if (mod.id) {
          cache[mod.id] = mod;
          if (pending[mod.id]) {
            pending[mod.id].forEach(run);
            delete pending[mod.id];
          }
        }
      }
    }

    export function getDep(depId: string, mod: Module) {
      if (depId === "exports") {
        return (mod.exports = {});
      } else if (depId === "require") {
        return modId => getDep(modId, mod);
      } else if (depId === "module") {
        return {
          require: modId => getDep(modId, mod),
          get exports() {
            return mod.exports;
          },
          set exports(exports) {
            mod.exports = exports;
          },
          legume: {
            loads: 0
          }
        };
      } else {
        return cache[depId].exports;
      }
    }
  }

  export function define(...args: any[]) {
    amd.run(amd.args(...args));
  }

  export namespace define {
    export const amd = {};
  }

  export import parseScript = parse.parseScript;
  export import parseStyle = parse.parseStyle;

  type MediaType = "script" | "style" | "json" | "text" | "unknown";
  interface FetchResult {
    type: MediaType;
    content: string;
  }
  const contentTypeToType: { [k: string]: MediaType } = {
    "application/json": "json",
    "application/javascript": "script",
    "text/css": "style",
    "text/html": "html"
  };
  const extToType: { [k: string]: MediaType } = {
    js: "script",
    css: "style",
    json: "json",
    txt: "text",
    text: "text"
  };
  export async function fetch(url: LegumeUrl): Promise<FetchResult> {
    const res = await window.fetch(url.absUrl.href);
    let contentType = res.headers.get("Content-Type");
    const content = await res.text();

    let type!: MediaType;
    determineType: {
      if (contentType) {
        contentType = contentType.split(";")[0];
        if (hasOwnProp(contentTypeToType, contentType)) {
          type = contentTypeToType[contentType];
          break determineType;
        }
      }
        const match = url.request.pathname.match(/\.(.*)$/);
      if (match && hasOwnProp(extToType, match[1])) {
        type = extToType[match[1]];
        break determineType;
          }
        console.warn(`Media type could not be determined for ${url.absUrl}`);
        type = "unknown";
    }

    return { content, type };
  }
}

const curScript = document.currentScript;
const entry = curScript && curScript.getAttribute("data-legume-entry");

whenDOMReady().then(() => {
  Array.from(document.querySelectorAll("script[type='text/legume']"))
    .reduce((prom, cur, i) => {
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
    }, entry ? Legume(entry).catch(console.error) : Promise.resolve())
    .then(() => {
      if (typeof onLegumeDone === "function") {
        onLegumeDone();
      }
    });
});
declare const onLegumeDone: (() => void) | undefined;

export default Legume;
