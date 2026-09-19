// Builds the GraphQL document the studio sends, as tokens rather than a string, so the preview can
// colour every token exactly and the send animation can fly each one. User input only ever lands
// in `variables`, never in the document text.

import { DEFAULT_RESULT_COUNT, OTHER_WORKS_COUNT } from "./contract";

export const ARTWORK_FIELDS = [
  { key: "date", label: "Date" },
  { key: "medium", label: "Medium" },
  { key: "dimensions", label: "Dimensions" },
  { key: "department", label: "Department" },
  { key: "culture", label: "Culture" },
  { key: "creditLine", label: "Credit line" },
  { key: "tags", label: "Subjects" },
  { key: "image", label: "Image" },
  { key: "url", label: "Link to the Met" },
] as const;

export type ArtworkField = (typeof ARTWORK_FIELDS)[number]["key"];

export const ARTIST_FIELDS = [
  { key: "nationality", label: "Nationality", selects: ["nationality"] },
  { key: "lifespan", label: "Life dates", selects: ["born", "died"] },
  { key: "bio", label: "Biography", selects: ["bio"] },
] as const;

export type ArtistField = (typeof ARTIST_FIELDS)[number]["key"];

export type QueryOptions = {
  search: string;
  departmentId: number | null;
  from: number | null;
  to: number | null;
  highlightsOnly: boolean;
  first: number;
  after: string | null;
  artworkFields: readonly ArtworkField[];
  includeArtist: boolean;
  artistFields: readonly ArtistField[];
  includeOtherWorks: boolean;
  explainEmpty: boolean;
};

export const DEFAULT_QUERY_OPTIONS: QueryOptions = {
  search: "sunflowers",
  departmentId: null,
  from: null,
  to: null,
  highlightsOnly: false,
  first: DEFAULT_RESULT_COUNT,
  after: null,
  artworkFields: ["date", "medium", "tags", "image", "url"],
  includeArtist: true,
  artistFields: ["nationality", "lifespan"],
  includeOtherWorks: false,
  explainEmpty: true,
};

export type TokenKind =
  | "keyword"
  | "operation"
  | "variable"
  | "type"
  | "field"
  | "argument"
  | "enum"
  | "number"
  | "punctuation";

type Token = { kind: TokenKind; text: string };

type QueryLine = { depth: number; tokens: Token[] };

type RenderedLine = {
  key: string;
  depth: number;
  tokens: Array<Token & { key: string }>;
};

export type QueryVariables = {
  search?: string;
  departmentId?: number;
  from?: number;
  to?: number;
  highlightsOnly?: boolean;
  first: number;
  after?: string;
};

export type BuiltQuery = {
  operationName: string;
  text: string;
  lines: RenderedLine[];
  variables: QueryVariables;
};

type Argument = {
  name: keyof QueryVariables;
  type: string;
  value: (options: QueryOptions) => string | number | boolean | undefined;
};

// In declaration order. An argument without a value is left out of the document entirely, so the
// query only ever shows the search and the filters actually in use.
const ARGUMENTS: Argument[] = [
  { name: "search", type: "String", value: ({ search }) => search.trim() || undefined },
  { name: "departmentId", type: "Int", value: ({ departmentId }) => departmentId ?? undefined },
  { name: "from", type: "Int", value: ({ from }) => from ?? undefined },
  { name: "to", type: "Int", value: ({ to }) => to ?? undefined },
  {
    name: "highlightsOnly",
    type: "Boolean",
    value: ({ highlightsOnly }) => highlightsOnly || undefined,
  },
  { name: "first", type: "Int", value: ({ first }) => first },
  { name: "after", type: "String", value: ({ after }) => after ?? undefined },
];

const OPERATION_NAME = "SearchArtworks";
const INDENT = "  ";
const MAX_INLINE_WIDTH = 64;

const token = (kind: TokenKind, text: string): Token => ({ kind, text });
const punctuation = (text: string): Token => token("punctuation", text);
const argument = (name: string, value: Token): Token[] => [
  token("argument", name),
  punctuation(": "),
  value,
];

const lineText = (line: QueryLine): string =>
  INDENT.repeat(line.depth) + line.tokens.map((part) => part.text).join("");

const field = (depth: number, name: string): QueryLine => ({
  depth,
  tokens: [token("field", name)],
});

const image = (depth: number): QueryLine => ({
  depth,
  tokens: [
    token("field", "image"),
    punctuation("("),
    ...argument("size", token("enum", "SMALL")),
    punctuation(")"),
  ],
});

function openCall(depth: number, head: Token[], args: Token[][]): QueryLine[] {
  const joined = args.flatMap((tokens, index) =>
    index === 0 ? tokens : [punctuation(", "), ...tokens],
  );
  const inline: QueryLine = {
    depth,
    tokens: [
      ...head,
      ...(args.length > 0 ? [punctuation("("), ...joined, punctuation(")")] : []),
      punctuation(" {"),
    ],
  };
  if (args.length === 0 || lineText(inline).length <= MAX_INLINE_WIDTH) return [inline];

  return [
    { depth, tokens: [...head, punctuation("(")] },
    ...args.map((tokens) => ({ depth: depth + 1, tokens })),
    { depth, tokens: [punctuation(") {")] },
  ];
}

function block(depth: number, head: Token[], args: Token[][], body: QueryLine[]): QueryLine[] {
  return [...openCall(depth, head, args), ...body, { depth, tokens: [punctuation("}")] }];
}

function otherWorksSelection(): QueryLine[] {
  return block(
    4,
    [token("field", "otherWorks")],
    [argument("first", token("number", String(OTHER_WORKS_COUNT)))],
    [field(5, "id"), field(5, "title"), image(5), field(5, "url")],
  );
}

function artistSelection(options: QueryOptions): QueryLine[] {
  return block(
    3,
    [token("field", "artist")],
    [],
    [
      field(4, "name"),
      ...ARTIST_FIELDS.filter(({ key }) => options.artistFields.includes(key)).flatMap(
        ({ selects }) => selects.map((name) => field(4, name)),
      ),
      ...(options.includeOtherWorks ? otherWorksSelection() : []),
    ],
  );
}

function itemSelection(options: QueryOptions): QueryLine[] {
  return block(
    2,
    [token("field", "items")],
    [],
    [
      field(3, "id"),
      field(3, "title"),
      ...ARTWORK_FIELDS.filter(({ key }) => options.artworkFields.includes(key)).map(({ key }) =>
        key === "image" ? image(3) : field(3, key),
      ),
      ...(options.includeArtist ? artistSelection(options) : []),
    ],
  );
}

function pageInfoSelection(): QueryLine[] {
  return block(
    2,
    [token("field", "pageInfo")],
    [],
    [field(3, "startCursor"), field(3, "hasNextPage"), field(3, "endCursor")],
  );
}

function diagnosisSelection(): QueryLine[] {
  return block(
    2,
    [token("field", "diagnosis")],
    [],
    [
      field(3, "searchAlone"),
      ...block(
        3,
        [token("field", "filters")],
        [],
        [field(4, "arguments"), field(4, "matchesAlone"), field(4, "matchesWithout")],
      ),
    ],
  );
}

export function buildQuery(options: QueryOptions): BuiltQuery {
  const used = ARGUMENTS.flatMap(({ name, type, value }) => {
    const current = value(options);
    return current === undefined ? [] : [{ name, type, current }];
  });

  const lines = block(
    0,
    [token("keyword", "query"), punctuation(" "), token("operation", OPERATION_NAME)],
    used.map(({ name, type }) => [
      token("variable", `$${name}`),
      punctuation(": "),
      token("type", type),
    ]),
    block(
      1,
      [token("field", "artworks")],
      used.map(({ name }) => argument(name, token("variable", `$${name}`))),
      [
        field(2, "total"),
        ...itemSelection(options),
        ...pageInfoSelection(),
        ...(options.explainEmpty ? diagnosisSelection() : []),
      ],
    ),
  );

  return {
    operationName: OPERATION_NAME,
    text: lines.map(lineText).join("\n"),
    lines: lines.map((line, lineIndex) => ({
      key: `line-${lineIndex}`,
      depth: line.depth,
      tokens: line.tokens.map((part, tokenIndex) => ({
        ...part,
        key: `line-${lineIndex}-${tokenIndex}`,
      })),
    })),
    variables: Object.fromEntries(
      used.map(({ name, current }) => [name, current]),
    ) as QueryVariables,
  };
}
