// The public contract of the Querated API. The descriptions are its documentation, and
// src/lib/query-builder.test.ts validates every query the studio can build against it.

import { DEFAULT_RESULT_COUNT, OTHER_WORKS_COUNT } from "@/lib/contract";

export const typeDefs = /* GraphQL */ `
  """
  A work of art in The Metropolitan Museum of Art's collection, normalised from the Met
  Collection API. Empty upstream strings become null.
  """
  type Artwork {
    "The Met's object ID."
    id: ID!
    "The title, or the object type when the work is untitled."
    title: String!
    "The display date as The Met writes it, for example ca. 1665."
    date: String
    "Machine-readable start year. Negative years are BCE."
    beginYear: Int
    "Machine-readable end year. Negative years are BCE."
    endYear: Int
    medium: String
    dimensions: String
    "The curatorial department that holds the work."
    department: String
    culture: String
    period: String
    classification: String
    "How the work entered the collection."
    creditLine: String
    isHighlight: Boolean!
    isPublicDomain: Boolean!
    "The work's page on metmuseum.org."
    url: String!
    "An Open Access image hosted by The Met. SMALL is web sized, LARGE is the original file."
    image(size: ImageSize = SMALL): String
    "Subject keywords assigned by The Met."
    tags: [String!]!
    artist: Artist
  }

  enum ImageSize {
    SMALL
    LARGE
  }

  "The maker credited on a work."
  type Artist {
    name: String!
    "Nationality, birth and death places, as The Met writes them."
    bio: String
    nationality: String
    born: Int
    died: Int
    wikidataUrl: String
    """
    Other works by this artist that have an Open Access image, excluding the work this artist
    was reached from. Each artist costs one extra search against The Met.
    """
    otherWorks(first: Int = ${OTHER_WORKS_COUNT}): [Artwork!]!
  }

  type Department {
    id: Int!
    name: String!
  }

  type ArtworkResults {
    """
    Works The Met's own search matches with these filters. The Met also reads text the API never
    returns, so this can count works that items leaves out.
    """
    total: Int!
    """
    Works with an Open Access image where every word of the search term appears in the title,
    object type, subjects, artist, culture, medium or classification, in The Met's relevance order.
    """
    items: [Artwork!]!
    """
    Why nothing matched. Null whenever total is above zero. When total is zero it asks The Met
    what the search term finds without filters, and what each filter allows on its own and what
    would match without it: one extra search per distinct combination of filters.
    """
    diagnosis: SearchDiagnosis
  }

  type SearchDiagnosis {
    "Matches for the search term with no filters applied, or the whole collection when there is no term."
    searchAlone: Int!
    "One entry per filter the search used, in argument order."
    filters: [FilterCheck!]!
  }

  type FilterCheck {
    "The arguments that make up this filter: departmentId, highlightsOnly, or from and to."
    arguments: [String!]!
    "Matches for the search term with only this filter applied. Zero means it rules out every match."
    matchesAlone: Int!
    "Matches with every other filter still applied and this one removed."
    matchesWithout: Int!
  }

  type Query {
    """
    Search the collection. The search term always applies; filters only narrow it. Leave search
    out or empty to take a random sample of every work the filters allow. from and to are
    years, negative for BCE. Only works with an Open Access image are returned.
    """
    artworks(
      search: String
      departmentId: Int
      from: Int
      to: Int
      highlightsOnly: Boolean = false
      first: Int = ${DEFAULT_RESULT_COUNT}
    ): ArtworkResults!

    "One work by its Met object ID."
    artwork(id: ID!): Artwork

    "The Met's curatorial departments, for the departmentId filter."
    departments: [Department!]!
  }
`;
