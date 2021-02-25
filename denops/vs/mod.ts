import { v4 } from "https://deno.land/std@0.88.0/uuid/mod.ts";
import { Vim } from "https://deno.land/x/denops_std@v0.3/mod.ts";

const vim = Vim.get();

const callbacks = new Map<string, (...args: unknown[]) => unknown>();

await vim.execute(`
  let s:denops_vs = { 'initialized': v:true }

  let s:denops_vs.win = {}
  function! s:denops_vs.win.do(winid) abort
  endfunction
`, {
  name: vim.name
});

vim.register({
  async callback(id: unknown, ...args: unknown[]) {
    const callback = callbacks.get(id as string);
    if (!callback) {
      throw new Error('callback does not exists.');
    }
    return await Promise.resolve(callback(...args));
  }
});

export const script = async <T>(strings: TemplateStringsArray, ...args: unknown[]) => {
  const script = strings.reduce((script, part, i) => {
    if (args.length <= i) {
      return script + part;
    }

    const a = args[i];
    if (typeof a === 'function') {
      const id = v4.generate();
      callbacks.set(id, (...args: unknown[]) => {
        return a(...args);
      });
      return `${script}___denops_vs('${vim.name}', '${id}')`
    } else {
      return script + part + a;
    }
  }, '');
  return (await vim.eval(script)) as T;
};

