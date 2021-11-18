import {
  makeExecutableSchema,
} from '@graphql-tools/schema';
import {
  applyMiddleware,
} from 'graphql-middleware';
import {
  createLazyLoadMiddleware,
} from '../../src';

export default ({lazyLoadMap, typeDefs, resolvers}: any): any => {
  const originalSchema = makeExecutableSchema({
    resolvers,
    typeDefs,
  });

  const lazyLoadMiddleware = createLazyLoadMiddleware(lazyLoadMap);

  return applyMiddleware(
    originalSchema,
    lazyLoadMiddleware,
  );
};
