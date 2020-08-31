import Pulse, { Collection } from '.';
import State from './state';

export function cleanState<T>(state: State<T>): object {
  return {
    value: state.value,
    previousState: state.previousState,
    isSet: state.isSet,
    dependents: state.dep.deps.size,
    subscribers: state.dep.subs.size,
    name: state.name
  };
}

export function resetState(items: Iterable<State | Collection | any>) {
  for (const item of items) {
    if (item instanceof Collection) item.reset();
    if (item instanceof State) return item.reset();
    const stateSet = extractAll(State, item);
    stateSet.forEach(state => state.reset());
  }
}

/**
 * A helper function to extract all instances of a target instance from an object
 * If this function fails, it will do so silently, so it can be safely used without much knowledge of `inObj`.
 * @param findClass Class to extract instances of
 * @param inObj Object to find all instances of `findType` within
 */
export function extractAll<I extends new (...args: any) => any, O>(findClass: I, inObj: O): Set<InstanceType<I>> {
  // safety net: object passed is not an obj, but rather an instance of the testClass in question, return that
  if (inObj instanceof findClass) return new Set([findClass]) as Set<InstanceType<I>>;
  // safety net: if type passed is not iterable, return empty set
  if (typeof inObj !== 'object') return new Set<InstanceType<I>>();

  // define return Set with typeof testClass
  const found: Set<InstanceType<I>> = new Set();
  // storage for the look function's state
  let next = [inObj];
  function look() {
    let _next = [...next]; // copy last state
    next = []; // reset the original state
    _next.forEach(o => {
      const typelessObject: any = o;
      // look at every property in object
      for (let property in o) {
        // check if instance type of class
        if (o[property] instanceof findClass) found.add(typelessObject[property]);
        // otherwise if object, store child object for next loop
        else if (isWatchableObject(o[property]) && !(typelessObject[property] instanceof Pulse)) next.push(typelessObject[property]);
      }
    });
    // if next state has items, loop function
    if (next.length > 0) look();
  }
  look();
  return found;
}

export function getPulseInstance(state: State): Pulse {
  try {
    if (state.instance) return state.instance();
    else return globalThis.__pulse;
  } catch (e) {}
}

export function normalizeDeps(deps: Array<State> | State) {
  return Array.isArray(deps) ? (deps as Array<State>) : [deps as State];
}

export const copy = val => {
  if (isWatchableObject(val)) val = { ...val };
  else if (Array.isArray(val)) val = [...val];

  return val;
};

// groups are defined by the user as an array of strings, this converts them into object/keys
export function normalizeGroups(groupsAsArray: any = []) {
  const groups: object = {};
  for (let i = 0; i < groupsAsArray.length; i++) {
    const groupName = groupsAsArray[i];
    groups[groupName] = [];
  }
  return groups;
}

export function shallowmerge(source, changes) {
  let keys = Object.keys(changes);
  keys.forEach(property => {
    source[property] = changes[property];
  });

  return source;
}

export function defineConfig<C>(config: C, defaults): C {
  return { ...defaults, ...config };
}

export function genId(): string {
  return Math.random().toString().split('.')[1] + Date.now();
}

export function isFunction(func: () => any) {
  return typeof func === 'function';
}

export function isAsync(func: () => any) {
  return func.constructor.name === 'AsyncFunction';
}

export function isWatchableObject(value) {
  function isHTMLElement(obj) {
    try {
      return obj instanceof HTMLElement;
    } catch (e) {
      return typeof obj === 'object' && obj.nodeType === 1 && typeof obj.style === 'object' && typeof obj.ownerDocument === 'object';
    }
  }
  let type = typeof value;
  return value != null && type == 'object' && !isHTMLElement(value) && !Array.isArray(value);
}

export function normalizeMap(map) {
  return Array.isArray(map) ? map.map(key => ({ key, val: key })) : Object.keys(map).map(key => ({ key, val: map[key] }));
}

export function cleanse(object: any) {
  if (!isWatchableObject(object)) return object;
  const clean = Object.assign({}, object);
  const properties = Object.keys(clean);

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];

    if (isWatchableObject(clean[property])) {
      clean[property] = cleanse(clean[property]);
    }
  }
  return clean;
}

export function validateNumber(mutable, amount) {
  if (typeof amount !== 'number' || typeof mutable !== 'number') {
    return false;
  }
  return true;
}