import {
  makeExecutableSchema,
} from '@graphql-tools/schema';
import test from 'ava';
import request from 'graphql-request';
import {
  gql,
} from 'graphql-tag';
import createGraphqlServer from '../helpers/createGraphqlServer';

test('test GraphQL server', async (t) => {
  const schema = makeExecutableSchema({
    resolvers: {
      Query: {
        foo: () => {
          return 'bar';
        },
      },
    },
    typeDefs: gql`
      type Query {
        foo: String
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foo
    }
  `);

  t.deepEqual(response, {
    foo: 'bar',
  });

  await graphqlServer.stop();
});
