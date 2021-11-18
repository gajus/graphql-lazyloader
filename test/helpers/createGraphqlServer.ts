import http from 'http';
import {
  ApolloServerPluginDrainHttpServer,
} from 'apollo-server-core';
import {
  ApolloServer,
} from 'apollo-server-express';
import express from 'express';

export default async ({schema}: any) => {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    schema,
  });

  await server.start();

  server.applyMiddleware({
    app,
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(resolve);
  });

  // @ts-expect-error lazy
  const {port} = httpServer.address();

  return {
    stop: () => {
      return server.stop();
    },
    url: 'http://127.0.0.1:' + port + server.graphqlPath,
  };
};
