import {
  makeExecutableSchema,
} from 'apollo-server-express';
import {
  LazyLoaderSchemaDirective,
} from '../../src';

export default ({resolvers, typeDefs}) => {
  return makeExecutableSchema({
    resolvers,
    schemaDirectives: {
      lazyLoad: LazyLoaderSchemaDirective,
    },
    typeDefs,
  });
};
