import { GraphQLError } from 'graphql';
import { createProduct, listProducts } from '../repositories/products.js';
import { createUser, listUsers } from '../repositories/users.js';
import { createOrder } from '../services/orders.js';
import { DomainError } from '../errors.js';

function toGraphQLError(error) {
  if (error instanceof DomainError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        ...error.extensions
      }
    });
  }
  return error;
}

async function safe(fn) {
  try {
    return await fn();
  } catch (error) {
    throw toGraphQLError(error);
  }
}

export const resolvers = {
  Query: {
    users: () => safe(() => listUsers()),
    products: () => safe(() => listProducts())
  },
  Mutation: {
    createUser: (_parent, { input }) => safe(() => createUser(input)),
    createProduct: (_parent, { input }) => safe(() => createProduct(input)),
    createOrder: (_parent, { input }) => safe(() => createOrder(input))
  }
};
