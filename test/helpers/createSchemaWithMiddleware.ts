import {
  makeExecutableSchema,
} from 'apollo-server-express';
import {
  applyMiddleware,
} from 'graphql-middleware';
import {
  createLazyLoadMiddleware,
} from '../../src';

export default ({lazyLoadMap, typeDefs, resolvers}) => {
  const originalSchema = makeExecutableSchema({
    resolvers,
    typeDefs,
  });
  const lazyLoadMiddleware = createLazyLoadMiddleware(lazyLoadMap);

  return applyMiddleware(originalSchema, lazyLoadMiddleware);
};
