# graphql-lazyloader 🚠

[![Travis build status](http://img.shields.io/travis/gajus/graphql-lazyloader/master.svg?style=flat-square)](https://travis-ci.org/gajus/graphql-lazyloader)
[![Coveralls](https://img.shields.io/coveralls/gajus/graphql-lazyloader.svg?style=flat-square)](https://coveralls.io/github/gajus/graphql-lazyloader)
[![NPM version](http://img.shields.io/npm/v/graphql-lazyloader.svg?style=flat-square)](https://www.npmjs.org/package/graphql-lazyloader)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

GraphQL directive that adds Object-level data resolvers.

* [Motivation](#motivation)
* [Usage](#usage)
  * [Usage Example](#usage-example)

## Motivation

Several years ago I read [GraphQL Resolvers: Best Practices] (2018), an article written by PayPal team, that changed my view about where / when data resolution should happen.

Let's start with an example GraphQL schema:

```graphql
type Query {
  person(id: ID) Person!
}

type Person {
  id: ID!
  givenName: String!
  familyName: String!
}

```

A typical GraphQL server uses "top-heavy" (parent-to-child) resolvers, i.e. in the above example, `Query.person` is responsible for fetching data for `Person` object. It may look something like this:

```js
{
  Query: {
    person: (root, args) => {
      return getPerson(args.id);
    },
  },
};

```

PayPal team argues that this pattern is prone to data over-fetching. Instead, they propose to move data fetching logic to _every_ field of `Person`, e.g.

```js
{
  Query: {
    person: (root, args) => {
      return {
        id: args.id,
      };
    },
  },
  Person: {
    givenName: async ({id}) => {
      const {
        givenName,
      } = await getPerson(id);

      return givenName;
    },
    familyName: async ({id}) => {
      const {
        familyName,
      } = await getPerson(id);

      return givenName;
    },
  },
};

```

It is important to note that the above example assume that `getPerson` is implemented using a [DataLoader](https://github.com/graphql/dataloader) pattern, i.e. data is fetched only once.

According to the original authors, this pattern is better because:

> * This code is easy to reason about. You know exactly where [givenName] is fetched. This makes for easy debugging.
> * This code is more testable. You don't have to test the [person] resolver when you really just wanted to test the [givenName] resolver.
>
> To some, the [getPerson] duplication might look like a code smell. But, having code that is simple, easy to reason about, and is more testable is worth a little bit of duplication.

For this and other reasons, I became a fan ❤️ of this pattern and have since implemented it in multiple projects. However, the particular implementation proposed by PayPal is pretty verbose. `graphql-lazyloader` abstracts the above logic into a single `@lazyLoad` directive and an Object-level `__lazyLoad` resolver (see [Usage Example](#usage-example)).

## Usage

1. Register `LazyLoaderSchemaDirective` schema directive class.
1. Register `@lazyLoad` schema directive.
1. Implement `__lazyLoad` method for data-types that implement `@lazyLoad`.

Refer to Apollo [Using schema directives](https://www.apollographql.com/docs/apollo-server/schema/directives/) guide for additional guidance.

### Usage Example

```js
import {
  ApolloServer,
  gql,
} from 'apollo-server';
import {
  LazyLoaderSchemaDirective,
} from 'graphql-lazyloader';

const typeDefs = gql`
  directive @lazyLoad on OBJECT

  type Query {
    person(id: ID!): Person!
  }

  type Person @lazyLoad {
    id: ID!
    givenName: String!
    familyName: String!
  }
`;

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Person: {
      __lazyLoad: ({id}) => {
        return getPerson(id);
      },
    },
    Query: {
      person: () => {
        return {
          id: '1',
        };
      },
    },
  },
  schemaDirectives: {
    lazyLoad: LazyLoaderSchemaDirective
  }
});

```
