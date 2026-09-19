// Assembles the GraphQL server. Security posture lives here: no CORS, no batching, error masking
// on, Armor limits on every operation, and introspection and GraphiQL off in production.

import { EnvelopArmorPlugin } from "@escape.tech/graphql-armor";
import { createSchema, createYoga } from "graphql-yoga";
import { GRAPHQL_ENDPOINT } from "@/lib/contract";
import type { MetClient } from "@/server/met/client";
import { createContextFactory, type QueratedContext } from "./context";
import { ARMOR_CONFIG, disableIntrospectionPlugin, queryTracePlugin } from "./plugins";
import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";

type QueratedYogaOptions = {
  met: MetClient;
  production: boolean;
};

export function createQueratedYoga({ met, production }: QueratedYogaOptions) {
  return createYoga<object, QueratedContext>({
    schema: createSchema<QueratedContext>({ typeDefs, resolvers }),
    graphqlEndpoint: GRAPHQL_ENDPOINT,
    fetchAPI: { Response },
    context: createContextFactory(met),
    cors: false,
    batching: false,
    graphiql: !production,
    landingPage: false,
    maskedErrors: { isDev: !production },
    plugins: [
      EnvelopArmorPlugin(ARMOR_CONFIG),
      ...(production ? [disableIntrospectionPlugin()] : []),
      queryTracePlugin(),
    ],
  });
}
