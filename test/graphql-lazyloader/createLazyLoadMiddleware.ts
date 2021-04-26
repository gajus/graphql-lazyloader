import {
  gql,
} from 'apollo-server-express';
import test from 'ava';
import DataLoader from 'dataloader';
import request from 'graphql-request';
import sinon from 'sinon';
import createGraphqlServer from '../helpers/createGraphqlServer';
import createSchemaWithMiddleware from '../helpers/createSchemaWithMiddleware';

test('uses lazyLoadMap to lazy load the result', async (t) => {
  const schema = createSchemaWithMiddleware({
    lazyLoadMap: {
      Foo: () => {
        return {
          id: '1',
          name: 'foo',
        };
      },
    },
    resolvers: {
      Query: {
        foo: () => {
          return {
            id: '1',
          };
        },
      },
    },
    typeDefs: gql`
      type Foo {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foo {
        id
        name
      }
    }
  `);

  t.deepEqual(response, {
    foo: {
      id: '1',
      name: 'foo',
    },
  });

  await graphqlServer.stop();
});

test('caches fetched data', async (t) => {
  const lazyLoad = sinon
    .stub()
    .returns({
      id: '1',
      name: 'foo',
    });

  const schema = createSchemaWithMiddleware({
    lazyLoadMap: {
      Foo: lazyLoad,
    },
    resolvers: {
      Query: {
        foo: () => {
          return {
            id: '1',
          };
        },
      },
    },
    typeDefs: gql`
      type Foo {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foo {
        id
        name
      }
      foo {
        id
        name
      }
    }
  `);

  t.deepEqual(response, {
    foo: {
      id: '1',
      name: 'foo',
    },
  });

  await graphqlServer.stop();

  t.is(lazyLoad.callCount, 1);
});

test('respects the original resolver', async (t) => {
  const lazyLoad = sinon
    .stub()
    .returns({
      id: '1',
      name: 'foo',
    });

  const schema = createSchemaWithMiddleware({
    lazyLoadMap: {
      Foo: lazyLoad,
    },
    resolvers: {
      Foo: {
        name: (node: any) => {
          return node.name.toUpperCase();
        },
      },
      Query: {
        foo: () => {
          return {
            id: '1',
          };
        },
      },
    },
    typeDefs: gql`
      type Foo {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foo {
        id
        name
      }
    }
  `);

  t.deepEqual(response, {
    foo: {
      id: '1',
      name: 'FOO',
    },
  });

  await graphqlServer.stop();
});

test('does not fetch already available data', async (t) => {
  const lazyLoad = sinon
    .stub()
    .throws();

  const schema = createSchemaWithMiddleware({
    lazyLoadMap: {
      Foo: lazyLoad,
    },
    resolvers: {
      Query: {
        foo: () => {
          return {
            id: '1',
            name: 'foo',
          };
        },
      },
    },
    typeDefs: gql`
      type Foo {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foo {
        id
        name
      }
    }
  `);

  t.deepEqual(response, {
    foo: {
      id: '1',
      name: 'foo',
    },
  });

  await graphqlServer.stop();

  t.is(lazyLoad.callCount, 0);
});

test('batches multiple requests', async (t) => {
  const lazyLoad = sinon
    .stub()
    .resolves([
      {
        id: '1',
        name: 'foo',
      },
      {
        id: '2',
        name: 'bar',
      },
    ]);

  const fooLoader = new DataLoader(lazyLoad);

  const schema = createSchemaWithMiddleware({
    lazyLoadMap: {
      Foo: ({id}: any) => {
        return fooLoader.load(id);
      },
    },
    resolvers: {
      Query: {
        foos: () => {
          return [
            {
              id: '1',
            },
            {
              id: '2',
            },
          ];
        },
      },
    },
    typeDefs: gql`
      type Foo {
        id: ID!
        name: String!
      }

      type Query {
        foos: [Foo!]!
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foos {
        id
        name
      }
    }
  `);

  t.deepEqual(response, {
    foos: [
      {
        id: '1',
        name: 'foo',
      },
      {
        id: '2',
        name: 'bar',
      },
    ],
  });

  await graphqlServer.stop();

  t.deepEqual(lazyLoad.firstCall.firstArg, [
    '1',
    '2',
  ]);

  t.is(lazyLoad.callCount, 1);
});

test('root is null if element does not exist', async (t) => {
  const lazyLoad = sinon
    .stub()
    .returns(null);

  const schema = createSchemaWithMiddleware({
    lazyLoadMap: {
      Foo: lazyLoad,
    },
    resolvers: {
      Query: {
        foo: () => {
          return {
            id: '1',
          };
        },
      },
    },
    typeDefs: gql`
      type Foo {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo
      }
    `,
  });

  const graphqlServer = await createGraphqlServer({
    schema,
  });

  const response = await request(graphqlServer.url, gql`
    {
      foo {
        id
        name
      }
    }
  `);

  t.deepEqual(response, {
    foo: null,
  });

  await graphqlServer.stop();
});
