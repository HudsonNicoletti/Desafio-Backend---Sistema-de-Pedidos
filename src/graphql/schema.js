export const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    orders: [Order!]!
  }

  type Product {
    id: ID!
    name: String!
    price: String!
    stock: Int!
    createdAt: String
  }

  type Order {
    id: ID!
    userId: ID!
    total: String!
    createdAt: String!
    items: [OrderItem!]!
  }

  type OrderItem {
    id: ID!
    productId: ID!
    quantity: Int!
    price: String!
    product: Product!
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  input CreateProductInput {
    name: String!
    price: String!
    stock: Int!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  input CreateOrderInput {
    userId: ID!
    items: [OrderItemInput!]!
  }

  type Query {
    users: [User!]!
    products: [Product!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    createProduct(input: CreateProductInput!): Product!
    createOrder(input: CreateOrderInput!): Order!
  }
`;
