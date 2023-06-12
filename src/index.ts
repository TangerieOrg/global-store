import { useEffect, useState } from "preact/hooks";
import { produce, Draft, Immutable } from "immer";

type StoreGet<Store extends object> = () => Store;
type StoreSetter<Store extends object> = (s : Store) => Store;
type StoreSet<Store extends object> = (setter : StoreSetter<Store>) => void;

export type StoreInit<Store extends object> = (get : StoreGet<Store>, set : StoreSet<Store>) => Store;
export type StoreOperation<Store extends object> = (store : Store) => Store;
export type StoreCallback<Store extends object> = (v : Store) => any;

export interface StoreEmitter<Store extends object> {
    emit(v : Store): void;
    subscribe(fn : StoreCallback<Store>): () => boolean;
}

const createEmitter = <Store extends object>() : StoreEmitter<Store> => {
    const subs = new Map<Symbol, StoreCallback<Store>>();
    return {
        emit: (v : Store) => subs.forEach(fn => fn(v)),
        subscribe: (fn : StoreCallback<Store>) => {
            const key = Symbol();
            subs.set(key, fn);
            return () => subs.delete(key);
        }
    }
}

type UseStore<Store extends object> = () => Store;

type ImmerStoreSetter<Store extends object> = (s : Draft<Store>) => void;
type ImmerStoreSet<Store extends object> = (setter : ImmerStoreSetter<Store>) => void;
type ImmerStoreInit<Store extends object> = (get : StoreGet<Store>, set : ImmerStoreSet<Store>) => Store;
type ImmerStoreCreateReturn<S extends object> = [useStore : UseStore<S>, get : StoreGet<S>, emitter : StoreEmitter<S>];
export type ImmerStore<S extends object> = Immutable<S>;

export const createImmerStore = <Store extends Immutable<object>>(init : ImmerStoreInit<Store>) : ImmerStoreCreateReturn<Store> => {
    const emitter = createEmitter<Store>();

    let store : Store;
    const get : StoreGet<Store> = () => store;
    const set : ImmerStoreSet<Store> = (op) => {
        store = produce(store, op);
        emitter.emit(store);
    };

    store = init(get, set);

    const useStore = () => {
        const [localStore, setLocalStore] = useState(get());

        useEffect(() => emitter.subscribe(setLocalStore), []);

        return localStore;
    };

    return [useStore, get, emitter];
}