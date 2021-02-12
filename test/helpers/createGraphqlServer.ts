import {
  ApolloServer,
} from 'apollo-server-express';
import express from 'express';
import {
  createHttpTerminator,
} from 'http-terminator';

export default async ({schema}: any) => {
  const apolloServer = new ApolloServer({
    schema,
  });

  const expressApp = express();

  apolloServer.applyMiddleware({
    app: expressApp,
  });

  const httpServer: any = await new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention, id-match
    const httpServer_ = expressApp.listen(() => {
      resolve(httpServer_);
    });
  });

  const httpTerminator = createHttpTerminator({
    server: httpServer,
  });

  return {
    stop: () => {
      return httpTerminator.terminate();
    },
    url: 'http://127.0.0.1:' + httpServer.address().port + apolloServer.graphqlPath,
  };
};
