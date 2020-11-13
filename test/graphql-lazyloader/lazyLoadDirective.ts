import {
  gql,
} from 'apollo-server-express';
import test from 'ava';
import DataLoader from 'dataloader';
import request from 'graphql-request';
import sinon from 'sinon';
import createGraphqlServer from '../helpers/createGraphqlServer';

test('fetches data using __lazyLoad directive', async (t) => {
  const graphqlServer = await createGraphqlServer({
    resolvers: {
      Foo: {
        __lazyLoad: () => {
          return {
            id: '1',
            name: 'foo',
          };
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
      directive @lazyLoad on OBJECT

      type Foo @lazyLoad {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
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

  const graphqlServer = await createGraphqlServer({
    resolvers: {
      Foo: {
        __lazyLoad: lazyLoad,
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
      directive @lazyLoad on OBJECT

      type Foo @lazyLoad {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
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

  t.is(lazyLoad.callCount, 1);
});

test('respects the original resolver', async (t) => {
  const lazyLoad = sinon
    .stub()
    .returns({
      id: '1',
      name: 'foo',
    });

  const graphqlServer = await createGraphqlServer({
    resolvers: {
      Foo: {
        __lazyLoad: lazyLoad,
        name: (node) => {
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
      directive @lazyLoad on OBJECT

      type Foo @lazyLoad {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
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

  const graphqlServer = await createGraphqlServer({
    resolvers: {
      Foo: {
        __lazyLoad: lazyLoad,
      },
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
      directive @lazyLoad on OBJECT

      type Foo @lazyLoad {
        id: ID!
        name: String!
      }

      type Query {
        foo: Foo!
      }
    `,
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

  const graphqlServer = await createGraphqlServer({
    resolvers: {
      Foo: {
        __lazyLoad: ({ id }) => {
          return fooLoader.load(id);
        },
      },
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
      directive @lazyLoad on OBJECT

      type Foo @lazyLoad {
        id: ID!
        name: String!
      }

      type Query {
        foos: [Foo!]!
      }
    `,
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

  t.deepEqual(lazyLoad.firstCall.firstArg, ['1', '2']);

  t.is(lazyLoad.callCount, 1);
});
