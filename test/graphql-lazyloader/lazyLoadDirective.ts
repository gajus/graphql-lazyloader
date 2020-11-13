import {
  gql,
} from 'apollo-server-express';
import test from 'ava';
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
