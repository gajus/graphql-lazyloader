import type {
  IMiddlewareResolver,
} from 'graphql-middleware/dist/types';

type LazyLoadMap<TContext> = {
  [key: string]: (source: any, context: TContext) => any,
};

const lazyLoadedSymbol = Symbol('LAZY_LOADED');

export default <TContext = any>(
  lazyLoadMap: LazyLoadMap<TContext>,
): IMiddlewareResolver<any, TContext> => {
  return async (resolve, node, args, context, info) => {
    const lazyLoad = lazyLoadMap[info.parentType.name];

    if (!lazyLoad) {
      return resolve(node, args, context, info);
    }

    const currentValue = node[info.fieldName];

    if (currentValue !== undefined) {
      return resolve(node, args, context, info);
    }

    if (!node[lazyLoadedSymbol]) {
      node[lazyLoadedSymbol] = lazyLoad(node, context);
    }

    const newNode = await node[lazyLoadedSymbol];

    return resolve(newNode, args, context, info);
  };
};
