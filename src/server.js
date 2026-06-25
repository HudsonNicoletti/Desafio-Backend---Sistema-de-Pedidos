import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { config } from './config.js';
import { migrate } from './db.js';
import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/schema.js';

export async function createApolloServer() {
  await migrate();
  return new ApolloServer({ typeDefs, resolvers });
}

if (process.env.NODE_ENV !== 'test') {
  const server = await createApolloServer();
  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port }
  });
  console.log(`GraphQL API disponível em ${url}`);
}
