import type { EnvelopArmorPlugin } from "@escape.tech/graphql-armor";
import { NoSchemaIntrospectionCustomRule } from "graphql";
import { isAsyncIterable, type Plugin } from "graphql-yoga";
import { TRACE_EXTENSION } from "@/lib/contract";
import type { QueratedContext } from "./context";

// Sized for the deepest query the studio can build (artworks > items > artist > otherWorks >
// field is depth 5) with room for hand-written queries, and tight enough that nesting
// otherWorks inside otherWorks is rejected before a single call reaches The Met.
export const ARMOR_CONFIG: Parameters<typeof EnvelopArmorPlugin>[0] = {
  maxDepth: { n: 6 },
  maxAliases: { n: 4 },
  maxDirectives: { n: 8 },
  maxTokens: { n: 600 },
  costLimit: { maxCost: 1500 },
  blockFieldSuggestion: { enabled: true },
};

export function queryTracePlugin(): Plugin<QueratedContext> {
  return {
    onExecute() {
      return {
        onExecuteDone({ args, result, setResult }) {
          if (isAsyncIterable(result)) return;
          setResult({
            ...result,
            extensions: {
              ...result.extensions,
              [TRACE_EXTENSION]: args.contextValue.trace.summary(),
            },
          });
        },
      };
    },
  };
}

export function disableIntrospectionPlugin(): Plugin {
  return {
    onValidate({ addValidationRule }) {
      addValidationRule(NoSchemaIntrospectionCustomRule);
    },
  };
}
